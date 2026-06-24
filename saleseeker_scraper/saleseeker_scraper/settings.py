BOT_NAME = "saleseeker_scraper"

SPIDER_MODULES = ["saleseeker_scraper.spiders"]
NEWSPIDER_MODULE = "saleseeker_scraper.spiders"

ROBOTSTXT_OBEY = False
LOG_LEVEL = "INFO"
DOWNLOAD_TIMEOUT = 20
DEPTH_LIMIT = 1
CLOSESPIDER_PAGECOUNT = 10
USER_AGENT = "Mozilla/5.0 (compatible; SaleseekerBot/1.0; +https://example.com/saleseeker)"

ITEM_PIPELINES = {
    "saleseeker_scraper.pipelines.EnrichmentPipeline": 300,
}
