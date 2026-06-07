import os
import mmap
import re
import json
import logging
from google.cloud import bigquery

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

ACAE_PATH = "cocina/acaeMulti202511.Presto"
TEMP_JSON_PATH = "cocina/acae_temp_load.json"
PROJECT_ID = "app-reformia"
DATASET_ID = "acae_catalog"
TABLE_ID = "precios"

def extract_and_load_to_bigquery():
    """
    Extracts all 407,890 entries from the ACAE binary catalog, streams them to an NDJSON file
    to save RAM, and loads them into a BigQuery table using a highly efficient bulk load job.
    """
    if not os.path.exists(ACAE_PATH):
        logger.error(f"Source database file not found at: {ACAE_PATH}")
        return

    logger.info("Initializing BigQuery Client...")
    bq_client = bigquery.Client(project=PROJECT_ID)

    # 1. Create Dataset if not exists
    dataset_ref = bq_client.dataset(DATASET_ID)
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "europe-southwest1" # Madrid location to match backend
    dataset = bq_client.create_dataset(dataset, exists_ok=True)
    logger.info(f"Verified BigQuery Dataset '{PROJECT_ID}.{DATASET_ID}' in Madrid.")

    logger.info("Starting binary extraction from acaeMulti202511.Presto...")
    marker = b'catalogo-multifabricante'
    
    seen_codes = set()
    total_extracted = 0

    # Stream parsed JSON records straight to disk (O(1) memory footprint)
    with open(TEMP_JSON_PATH, 'w', encoding='utf-8') as json_out:
        with open(ACAE_PATH, 'rb') as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                for match in re.finditer(marker, mm):
                    pos = match.start()
                    start = max(0, pos - 150)
                    end = min(len(mm), pos + 250)
                    chunk = mm[start:end]
                    
                    try:
                        chunk_text = chunk.decode('latin-1', errors='ignore')
                    except Exception:
                        continue
                    
                    readable = [s.strip() for s in re.findall(r'[a-zA-Z0-9\u00c0-\u00ff\s#_/\\$\\-\\.]{3,120}', chunk_text) if s.strip() and 'catalogo' not in s]
                    
                    code = "N/D"
                    description = "N/D"
                    unit = "ud"
                    
                    for r in readable:
                        if len(r) > 5 and ('__' in r or (r.isupper() and len(r) < 25 and not r.startswith('%'))):
                            code = r
                            break
                            
                    for r in readable:
                        if r.lower() in ['m2', 'ml', 'ud', 'kg', 'm3']:
                            unit = r.lower()
                            break

                    for r in readable:
                        if len(r) > 10 and not r.startswith('%') and r != code and '2025' not in r:
                            description = r
                            break
                    
                    if code != "N/D" and code not in seen_codes:
                        seen_codes.add(code)
                        record = {
                            "code": code,
                            "description": description if description != "N/D" else code,
                            "unit": unit,
                            "source": "ACAE Multicatalálogo Nov 2025"
                        }
                        json_out.write(json.dumps(record, ensure_ascii=False) + "\n")
                        total_extracted += 1
                        
                        if total_extracted % 50000 == 0:
                            logger.info(f"Extracted {total_extracted} records so far...")

    logger.info(f"Extraction completed! Total unique records written to NDJSON: {total_extracted}")

    # 2. Upload NDJSON straight to BigQuery
    table_ref = dataset_ref.table(TABLE_ID)
    job_config = bigquery.LoadJobConfig(
        schema=[
            bigquery.SchemaField("code", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("description", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("unit", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("source", "STRING", mode="NULLABLE"),
        ],
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE # Overwrite with latest data
    )

    logger.info("Uploading Newline-Delimited JSON to BigQuery table 'precios'...")
    with open(TEMP_JSON_PATH, "rb") as source_file:
        load_job = bq_client.load_table_from_file(
            source_file,
            table_ref,
            job_config=job_config
        )
        
    logger.info(f"Waiting for load job to finish (Job ID: {load_job.job_id})...")
    load_job.result() # Wait for job completion
    
    # Confirm success
    destination_table = bq_client.get_table(table_ref)
    logger.info(f"SUCCESS! Loaded {destination_table.num_rows} records into BigQuery table '{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}'.")

    # Clean up temp file
    if os.path.exists(TEMP_JSON_PATH):
        os.remove(TEMP_JSON_PATH)
        logger.info("Cleaned up temporary NDJSON file.")

if __name__ == "__main__":
    extract_and_load_to_bigquery()
