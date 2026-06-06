import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import bigquery
from google.cloud import storage
from google.cloud import firestore

app = FastAPI(title="Refurbishment API", version="1.0.0")

# Permitir CORS desde el puerto de Vite local (habitualmente 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "app-reformia")
REGION = "europe-southwest1"
DATASET_ID = "refurbishment_db"
BUCKET_NAME = f"{PROJECT_ID}-refurbishment-assets"

# Inicializar clientes de GCP de forma perezosa
try:
    bq_client = bigquery.Client(project=PROJECT_ID)
    db = firestore.Client(project=PROJECT_ID, database="(default)")
    storage_client = storage.Client(project=PROJECT_ID)
except Exception as e:
    print(f"Advertencia: No se pudieron inicializar clientes GCP: {e}")

class BudgetItem(BaseModel):
    item_id: str
    chapter: str
    description: str
    unit: str
    quantity: float
    price_unit_low: float
    price_unit_medium: float
    price_unit_high: float
    selected_quality: str

@app.get("/")
def read_root():
    return {"status": "ok", "project": PROJECT_ID, "region": REGION}

@app.get("/items", response_model=List[BudgetItem])
def get_budget_items():
    """Obtiene todas las partidas de la base de datos de BigQuery"""
    query = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.budget_items` ORDER BY chapter, item_id"
    try:
        query_job = bq_client.query(query)
        results = query_job.result()
        items = []
        for row in results:
            items.append(BudgetItem(
                item_id=row.item_id,
                chapter=row.chapter,
                description=row.description,
                unit=row.unit,
                quantity=row.quantity,
                price_unit_low=row.price_unit_low,
                price_unit_medium=row.price_unit_medium,
                price_unit_high=row.price_unit_high,
                selected_quality=row.selected_quality
            ))
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-asset")
async def upload_asset(file: UploadFile = File(...)):
    """Sube planos, imágenes o PDFs al bucket de Cloud Storage"""
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(file.filename)
        blob.upload_from_file(file.file, content_type=file.content_type)
        return {"filename": file.filename, "gcs_uri": f"gs://{BUCKET_NAME}/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
