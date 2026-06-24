from __future__ import annotations

import scrapy


class EnrichmentItem(scrapy.Item):
    business_id = scrapy.Field()
    job_id = scrapy.Field()
    source_url = scrapy.Field()
    emails = scrapy.Field()
    phones = scrapy.Field()
    owner_name = scrapy.Field()
