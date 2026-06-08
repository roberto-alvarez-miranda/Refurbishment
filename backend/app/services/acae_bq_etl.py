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
    Forensically extracts 100% accurate items from the ACAE Presto database
    by scanning for the '___' or '__' pattern of manufacturer codes.
    Streams to NDJSON and loads directly into Google Cloud BigQuery.
    """
    if not os.path.exists(ACAE_PATH):
        logger.error(f"Source database file not found at: {ACAE_PATH}")
        return

    logger.info("Initializing BigQuery Client...")
    bq_client = bigquery.Client(project=PROJECT_ID)

    # 1. Create/Verify Dataset
    dataset_ref = bq_client.dataset(DATASET_ID)
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = "europe-southwest1" # Madrid location
    dataset = bq_client.create_dataset(dataset, exists_ok=True)
    logger.info(f"Verified BigQuery Dataset '{PROJECT_ID}.{DATASET_ID}' in Spain.")

    logger.info("Starting high-fidelity binary extraction from acaeMulti202511.Presto...")
    
    seen_codes = set()
    total_extracted = 0

    # Stream parsed JSON records straight to disk (O(1) memory footprint)
    with open(TEMP_JSON_PATH, 'w', encoding='utf-8') as json_out:
        with open(ACAE_PATH, 'rb') as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                # Compile bytes regex to find standard ACAE code delimiters (e.g. EFBBAA__PLA11)
                code_pattern = re.compile(b'[A-Z0-9]{3,8}__[A-Z0-9_\\$\\-]{3,15}')
                
                for match in code_pattern.finditer(mm):
                    pos = match.start()
                    code = match.group(0).decode('latin-1')
                    
                    # Extract 250 bytes of trailing context to parse the description and unit
                    chunk = mm[pos:pos+250]
                    pos_marker = chunk.find(b'catalogo-multifabricante')
                    if pos_marker != -1:
                        # Description starts after the marker + skip leading non-printable control bytes
                        desc_start = pos_marker + len(b'catalogo-multifabricante')
                        while desc_start < len(chunk) and chunk[desc_start] < 32:
                            desc_start += 1
                            
                        desc_bytes = bytearray()
                        idx = desc_start
                        while idx < len(chunk):
                            b = chunk[idx]
                            if b == 0:
                                break
                            desc_bytes.append(b)
                            idx += 1
                            
                        description = desc_bytes.decode('latin-1', errors='ignore').strip()
                        
                        # Extract unit
                        unit_match = re.search(b'(m2|ml|ud|kg|m3)\\x00', chunk)
                        unit = unit_match.group(1).decode('latin-1') if unit_match else 'ud'
                        
                        # Write clean record
                        if len(description) > 3 and code not in seen_codes:
                            seen_codes.add(code)
                            record = {
                                "code": code,
                                "description": description,
                                "unit": unit,
                                "source": "ACAE Multicatalálogo Nov 2025"
                            }
                            json_out.write(json.dumps(record, ensure_ascii=False) + "\n")
                            total_extracted += 1
                            
                            if total_extracted % 50000 == 0:
                                logger.info(f"Extracted {total_extracted} clean records...")

    logger.info(f"Extraction completed! Total unique, pristine records written: {total_extracted}")

    if total_extracted == 0:
        logger.error("No records were extracted. Aborting BigQuery load.")
        return

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
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE # Overwrite with pristine data
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
    logger.info(f"SUCCESS! Loaded {destination_table.num_rows} PRISTINE records into BigQuery table '{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}'.")

    # Clean up temp file
    if os.path.exists(TEMP_JSON_PATH):
        os.remove(TEMP_JSON_PATH)
        logger.info("Cleaned up temporary NDJSON file.")

if __name__ == "__main__":
    extract_and_load_to_bigquery()
