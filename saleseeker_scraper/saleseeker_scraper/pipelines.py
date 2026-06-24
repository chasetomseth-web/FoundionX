from __future__ import annotations

import os
from typing import Any

import requests


class EnrichmentPipeline:
    def __init__(self):
        self.ingest_url = os.getenv("SALEESEEKER_INGEST_URL", "http://localhost:4028/api/saleseeker/ingest")

    def process_item(self, item: dict[str, Any], spider):
        payload = {
            "business_id": item.get("business_id"),
            "emails": item.get("emails", []),
            "phones": item.get("phones", []),
            "owner_name": item.get("owner_name", ""),
            "source_url": item.get("source_url", ""),
        }
        response = requests.post(self.ingest_url, json=payload, timeout=20)
        response.raise_for_status()
        return item
