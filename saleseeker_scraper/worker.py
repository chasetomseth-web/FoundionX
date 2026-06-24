from __future__ import annotations

import json
import os
import asyncio
from typing import Any

import redis
from twisted.internet import asyncioreactor
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from scrapy.utils.log import configure_logging

from saleseeker_scraper.spiders.contact_spider import ContactSpider

QUEUE_NAME = "saleseeker_scrape_queue"

try:
    asyncioreactor.install()
except Exception:
    pass

def get_redis():
    return redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True)


async def run_crawler(queue_item: dict[str, Any]):
    runner = CrawlerRunner(get_project_settings())
    configure_logging({'LOG_LEVEL': 'INFO'})
    await runner.crawl(
        ContactSpider,
        business_id=queue_item["business_id"],
        source_url=queue_item["website"],
        job_id=queue_item.get("job_id", ""),
    )


async def process_queue():
    client = get_redis()
    while True:
        try:
            raw = client.lpop(QUEUE_NAME)
            if not raw:
                await asyncio.sleep(2)
                continue
            queue_item = json.loads(raw)
            await run_crawler(queue_item)
        except Exception as exc:
            print(f"Saleseeker worker error: {exc}", flush=True)
            await asyncio.sleep(5)


def main():
    asyncio.run(process_queue())


if __name__ == "__main__":
    main()