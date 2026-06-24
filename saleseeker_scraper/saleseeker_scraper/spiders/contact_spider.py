from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import scrapy

from saleseeker_scraper.items import EnrichmentItem

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:(?:\+|00)[1-9]\d{0,2}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}")
OWNER_RE = re.compile(
    r"(?P<name>(?:Dr\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*(?:is\s+)?(?P<title>Owner|Founder|CEO|Managing Director)",
    re.IGNORECASE,
)


class ContactSpider(scrapy.Spider):
    name = "contact"

    def __init__(self, business_id: str, source_url: str, job_id: str = "", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.business_id = business_id
        self.source_url = source_url
        self.job_id = job_id
        self.emails: set[str] = set()
        self.phones: set[str] = set()
        self.owner_name: str | None = None

    def start_requests(self):
        yield scrapy.Request(self.source_url, callback=self.parse_page, cb_kwargs={"depth": 0}, errback=self.handle_error)

    def parse_page(self, response, depth: int):
        text = response.text
        self.emails.update(email.lower() for email in EMAIL_RE.findall(text))

        for phone in PHONE_RE.findall(text):
            cleaned = re.sub(r"[^+\d]", "", phone)
            if 8 <= len(cleaned) <= 15:
                self.phones.add(phone.strip())

        owner_match = OWNER_RE.search(text)
        if owner_match and not self.owner_name:
            self.owner_name = owner_match.group("name").strip()

        if depth < 2:
            for href in response.css("a::attr(href)").getall():
                absolute = urljoin(response.url, href)
                if not self.is_internal(absolute, response.url):
                    continue
                path = urlparse(absolute).path.lower()
                if any(token in path for token in ("contact", "about", "team")) or depth == 0:
                    yield response.follow(absolute, callback=self.parse_page, cb_kwargs={"depth": depth + 1}, errback=self.handle_error)

        yield self.build_item()

    def handle_error(self, failure):
        self.logger.warning("Scrape failed for %s: %s", self.source_url, failure)

    def is_internal(self, url: str, base_url: str) -> bool:
        return urlparse(url).netloc == urlparse(base_url).netloc

    def build_item(self) -> EnrichmentItem:
        item = EnrichmentItem()
        item["business_id"] = self.business_id
        item["job_id"] = self.job_id
        item["source_url"] = self.source_url
        item["emails"] = sorted(self.emails)
        item["phones"] = sorted(self.phones)
        item["owner_name"] = self.owner_name or ""
        return item
