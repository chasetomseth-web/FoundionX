import json
import os
import re
from typing import Optional
from urllib.parse import urlencode

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from redis.asyncio import Redis

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

app = FastAPI(title="Saleseeker API")

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


class Filters(BaseModel):
    hasWebsite: Optional[bool] = False
    hasPhone: Optional[bool] = False


class GenerateRequest(BaseModel):
    niche: str = Field(min_length=1)
    country: str = Field(min_length=1)
    state: str = Field(min_length=1)
    city: str = Field(min_length=1)
    filters: Filters = Field(default_factory=Filters)


class IngestRequest(BaseModel):
    business_id: str
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    owner_name: str = ""
    source_url: str = ""


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1)
    leadIds: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    niche: Optional[str] = None


class TagUpdate(BaseModel):
    tags: list[str] = Field(min_length=1)


async def get_pool():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured.")
    return await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)


async def get_redis():
    if not REDIS_URL:
        return None
    return Redis.from_url(REDIS_URL)


def normalize_website(website: Optional[str]) -> Optional[str]:
    if not website:
        return None
    value = website.strip()
    if not value:
        return None
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"https://{value}"


async def discover_businesses(payload: GenerateRequest) -> list[dict]:
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=503, detail="GOOGLE_PLACES_API_KEY is not configured.")

    query = " ".join([payload.niche, payload.city, payload.state, payload.country])
    text_params = urlencode({"query": query, "radius": "50000", "key": GOOGLE_PLACES_API_KEY})
    async with httpx.AsyncClient(timeout=20) as client:
        text = await client.get(f"https://maps.googleapis.com/maps/api/place/textsearch/json?{text_params}")
        text.raise_for_status()
        text_data = text.json()

    if text_data.get("status") not in {"OK", "ZERO_RESULTS"}:
        raise HTTPException(status_code=502, detail=text_data.get("error_message", "Google Places search failed."))

    businesses: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as client:
        for result in (text_data.get("results") or [])[:20]:
            place_id = result.get("place_id")
            if not place_id:
                continue
            detail_params = urlencode(
                {
                    "place_id": place_id,
                    "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,place_id",
                    "key": GOOGLE_PLACES_API_KEY,
                }
            )
            detail = await client.get(f"https://maps.googleapis.com/maps/api/place/details/json?{detail_params}")
            detail.raise_for_status()
            detail_data = detail.json()
            place = detail_data.get("result") or {}
            if not place.get("name"):
                continue
            businesses.append(
                {
                    "name": place.get("name"),
                    "address": place.get("formatted_address") or result.get("formatted_address"),
                    "phone": place.get("formatted_phone_number"),
                    "website": normalize_website(place.get("website")),
                    "rating": place.get("rating") or result.get("rating"),
                    "reviews": place.get("user_ratings_total") or result.get("user_ratings_total"),
                    "place_id": place.get("place_id") or result.get("place_id"),
                }
            )
    return businesses


async def persist_businesses(conn: asyncpg.Connection, businesses: list[dict], payload: GenerateRequest) -> list[dict]:
    unique: dict[str, dict] = {}
    for business in businesses:
        if not business.get("name"):
            continue
        if payload.filters.hasWebsite and not business.get("website"):
            continue
        if payload.filters.hasPhone and not business.get("phone"):
            continue
        key = business.get("place_id") or f"{business['name']}:{business.get('website') or ''}".lower()
        unique[key] = business

    rows = []
    for business in unique.values():
        row = await conn.fetchrow(
            """
            INSERT INTO saleseeker_businesses (id, name, website, phone, address, city, state, country, niche, place_id, rating, reviews, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
            ON CONFLICT (place_id) DO UPDATE SET
              name = EXCLUDED.name,
              website = COALESCE(EXCLUDED.website, saleseeker_businesses.website),
              phone = COALESCE(EXCLUDED.phone, saleseeker_businesses.phone),
              address = COALESCE(EXCLUDED.address, saleseeker_businesses.address),
              city = EXCLUDED.city,
              state = EXCLUDED.state,
              country = EXCLUDED.country,
              niche = EXCLUDED.niche,
              rating = COALESCE(EXCLUDED.rating, saleseeker_businesses.rating),
              reviews = COALESCE(EXCLUDED.reviews, saleseeker_businesses.reviews)
            RETURNING id, name, website, phone, address, city, state, country, niche, place_id, rating, reviews, created_at::text
            """,
            business.get("name"),
            business.get("website"),
            business.get("phone"),
            business.get("address"),
            payload.city,
            payload.state,
            payload.country,
            payload.niche,
            business.get("place_id"),
            business.get("rating"),
            business.get("reviews"),
        )
        if row:
            rows.append(dict(row))
    return rows


async def load_results(conn: asyncpg.Connection) -> dict:
    job = await conn.fetchrow(
        "SELECT id, status::text AS status, created_at::text FROM saleseeker_jobs ORDER BY created_at DESC LIMIT 1"
    )
    lead_rows = await conn.fetch(
        """
        SELECT
          b.id AS business_id,
          b.name AS business_name,
          b.website,
          b.phone,
          b.address,
          b.city,
          b.state,
          l.id AS id,
          array_agg(DISTINCT l.email ORDER BY l.email) AS emails,
          COALESCE((array_agg(l.owner_name ORDER BY l.created_at DESC) FILTER (WHERE l.owner_name IS NOT NULL))[1], NULL) AS owner_name,
          COALESCE((array_agg(l.source_url ORDER BY l.created_at DESC) FILTER (WHERE l.source_url IS NOT NULL))[1], NULL) AS source_url,
          COALESCE(array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), ARRAY[]::TEXT[]) AS tags,
          MIN(l.created_at)::text AS created_at
        FROM saleseeker_leads l
        JOIN saleseeker_businesses b ON b.id = l.business_id
        LEFT JOIN LATERAL unnest(COALESCE(l.tags, ARRAY[]::TEXT[])) AS tag ON true
        GROUP BY b.id, b.name, b.website, b.phone, b.address, b.city, b.state
        ORDER BY MIN(l.created_at) DESC
        """
    )
    campaigns = await load_campaigns(conn)

    status_map = {"done": "completed", "failed": "failed", "running": "scraping", "pending": "searching"}
    return {
        "status": status_map.get(job["status"], "idle") if job else "idle",
        "job": dict(job) if job else None,
        "leads": [dict(row) for row in lead_rows],
        "campaigns": campaigns,
    }


async def load_campaigns(conn: asyncpg.Connection) -> list[dict]:
    campaigns = await conn.fetch(
        "SELECT id, name, niche, tags, created_at::text FROM saleseeker_campaigns ORDER BY created_at DESC"
    )
    result = []
    for campaign in campaigns:
        leads = await conn.fetch(
            """
            SELECT
              b.id AS business_id,
              b.name AS business_name,
              b.website,
              b.phone,
              b.address,
              b.city,
              b.state,
              l.id AS id,
              array_agg(DISTINCT l.email ORDER BY l.email) AS emails,
              COALESCE((array_agg(l.owner_name ORDER BY l.created_at DESC) FILTER (WHERE l.owner_name IS NOT NULL))[1], NULL) AS owner_name,
              COALESCE((array_agg(l.source_url ORDER BY l.created_at DESC) FILTER (WHERE l.source_url IS NOT NULL))[1], NULL) AS source_url,
              COALESCE(array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), ARRAY[]::TEXT[]) AS tags,
              MIN(l.created_at)::text AS created_at
            FROM saleseeker_leads l
            JOIN saleseeker_businesses b ON b.id = l.business_id
            LEFT JOIN LATERAL unnest(COALESCE(l.tags, ARRAY[]::TEXT[])) AS tag ON true
            WHERE l.campaign_id = $1
            GROUP BY b.id, b.name, b.website, b.phone, b.address, b.city, b.state
            ORDER BY MIN(l.created_at) DESC
            """,
            campaign["id"],
        )
        item = dict(campaign)
        item["leads"] = [dict(row) for row in leads]
        result.append(item)
    return result


@app.post("/api/saleseeker/generate")
async def generate(payload: GenerateRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        businesses = await discover_businesses(payload)
        persisted = await persist_businesses(conn, businesses, payload)
        job = await conn.fetchrow(
            "INSERT INTO saleseeker_jobs (id, status, created_at) VALUES (gen_random_uuid(), 'running', now()) RETURNING id, status::text AS status, created_at::text"
        )
        redis = await get_redis()
        queued = 0
        if redis:
            for business in persisted:
                if not business.get("website"):
                    continue
                await redis.lpush("saleseeker_scrape_queue", json.dumps({"business_id": business["id"], "website": business["website"], "job_id": job["id"]}))
                queued += 1
        results = await load_results(conn)
        return {"jobId": job["id"], "status": "searching" if queued else "completed", "businessesFound": len(persisted), "queued": queued, **{k: v for k, v in results.items() if k != "status"}}


@app.post("/api/saleseeker/ingest")
async def ingest(payload: IngestRequest):
    emails = sorted({email.lower() for email in EMAIL_RE.findall(" ".join(payload.emails + payload.phones + [payload.owner_name, payload.source_url]))})
    if not emails:
        raise HTTPException(status_code=400, detail="No email found. Business is not a valid Saleseeker lead.")

    pool = await get_pool()
    async with pool.acquire() as conn:
        inserted = []
        for email in emails:
            row = await conn.fetchrow(
                """
                INSERT INTO saleseeker_leads (id, business_id, email, phone, owner_name, source_url, created_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
                ON CONFLICT (business_id, email) DO UPDATE SET
                  phone = COALESCE(EXCLUDED.phone, saleseeker_leads.phone),
                  owner_name = COALESCE(EXCLUDED.owner_name, saleseeker_leads.owner_name),
                  source_url = COALESCE(EXCLUDED.source_url, saleseeker_leads.source_url)
                RETURNING id, business_id, email, phone, owner_name, source_url, created_at::text
                """,
                payload.business_id,
                email,
                payload.phones[0] if payload.phones else None,
                payload.owner_name or None,
                payload.source_url or None,
            )
            inserted.append(dict(row))
        await conn.execute(
            """
            UPDATE saleseeker_jobs
            SET status = 'done'
            WHERE id = (SELECT id FROM saleseeker_jobs WHERE status = 'running' ORDER BY created_at DESC LIMIT 1)
            """
        )
    return {"ok": True, "leads": inserted}


@app.get("/api/saleseeker/results")
async def results():
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await load_results(conn)


@app.get("/api/saleseeker/campaigns")
async def campaigns():
    pool = await get_pool()
    async with pool.acquire() as conn:
        return {"campaigns": await load_campaigns(conn)}


@app.post("/api/saleseeker/campaigns")
async def create_campaign(payload: CampaignCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        campaign = await conn.fetchrow(
            "INSERT INTO saleseeker_campaigns (id, name, niche, tags, created_at) VALUES (gen_random_uuid(), $1, $2, $3::TEXT[], now()) RETURNING id, name, niche, tags, created_at::text",
            payload.name,
            payload.niche,
            payload.tags,
        )
        if payload.leadIds:
            await conn.execute("UPDATE saleseeker_leads SET campaign_id = $1 WHERE id = ANY($2::UUID[])", campaign["id"], payload.leadIds)
        campaigns = await load_campaigns(conn)
    return next((item for item in campaigns if item["id"] == campaign["id"]), {**campaign, "leads": []})


@app.patch("/api/saleseeker/leads/{lead_id}/tags")
async def update_lead_tags(lead_id: str, payload: TagUpdate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE saleseeker_leads AS l
            SET tags = ARRAY(
              SELECT DISTINCT tag
              FROM unnest(COALESCE(l.tags, ARRAY[]::TEXT[]) || $2::TEXT[]) AS tag
            )
            WHERE l.id = $1
            RETURNING
              l.id,
              l.business_id,
              b.name AS business_name,
              b.website,
              b.phone,
              b.address,
              b.city,
              b.state,
              ARRAY(SELECT DISTINCT l2.email FROM saleseeker_leads l2 WHERE l2.business_id = l.business_id ORDER BY l2.email) AS emails,
              l.owner_name,
              l.source_url,
              l.tags,
              l.created_at::text
            FROM saleseeker_leads
            JOIN saleseeker_businesses b ON b.id = l.business_id
            """,
            lead_id,
            payload.tags,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return dict(row)
