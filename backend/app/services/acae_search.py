import os
import logging
from typing import List, Dict, Any
from google.cloud import bigquery

logger = logging.getLogger(__name__)

PROJECT_ID = "app-reformia"
DATASET_ID = "acae_catalog"
TABLE_ID = "precios"

def search_acae(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Queries the BigQuery table containing all 213,681 unique construction items.
    Performs full text pattern matching in milliseconds using SQL.
    """
    results = []
    if not query.strip():
        return []

    logger.info(f"Querying BigQuery catalog for keyword: '{query}'...")
    
    try:
        # Initialize BigQuery client using Application Default Credentials (ADC)
        client = bigquery.Client(project=PROJECT_ID)
        
        # SQL Query with parameterized search to prevent SQL injection (Best Practice!)
        sql = f"""
            SELECT code, description, unit, source
            FROM `{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}`
            WHERE LOWER(description) LIKE @search_query OR LOWER(code) LIKE @search_query
            LIMIT @limit
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("search_query", "STRING", f"%{query.lower()}%"),
                bigquery.ScalarQueryParameter("limit", "INT64", limit)
            ]
        )
        
        query_job = client.query(sql, job_config=job_config)
        rows = query_job.result() # Wait for query execution
        
        for row in rows:
            results.append({
                "code": row.code,
                "description": row.description,
                "unit": row.unit,
                "source": row.source
            })
            
        logger.info(f"Successfully retrieved {len(results)} matches from BigQuery.")
    except Exception as e:
        logger.error(f"Error querying BigQuery catalog table: {e}")
        
    return results
