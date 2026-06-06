terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "El ID del proyecto GCP"
  default     = "app-reformia"
}

variable "region" {
  type        = string
  description = "Región de los recursos de Google Cloud"
  default     = "europe-southwest1" # Región de Madrid
}

# --- Cloud Storage para Planos e Imágenes ---
resource "google_storage_bucket" "refurbishment_assets" {
  name          = "${var.project_id}-refurbishment-assets"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"] # Ajustar en producción para restringir al dominio de la web
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# --- BigQuery Dataset para Presupuestos y Precios ---
resource "google_bigquery_dataset" "refurbishment_dataset" {
  dataset_id                  = "refurbishment_db"
  friendly_name               = "Refurbishment Database"
  description                 = "Dataset para almacenar partidas de obra, acabados y precios históricos."
  location                    = var.region
  default_table_expiration_ms = null
}

# --- Tabla de Partidas de Presupuesto ---
resource "google_bigquery_table" "budget_items" {
  dataset_id = google_bigquery_dataset.refurbishment_dataset.dataset_id
  table_id   = "budget_items"

  deletion_protection = false

  schema = <<EOF
[
  {
    "name": "item_id",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Identificador único de la partida (ej: ALB-01)"
  },
  {
    "name": "chapter",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Capítulo de obra (ej: Albañilería, Demoliciones)"
  },
  {
    "name": "description",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Descripción detallada de la partida de obra"
  },
  {
    "name": "unit",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Unidad de medida (m2, m3, ud, etc.)"
  },
  {
    "name": "quantity",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Cantidad calculada o definida para la reforma"
  },
  {
    "name": "price_unit_low",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Precio unitario para acabado económico"
  },
  {
    "name": "price_unit_medium",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Precio unitario para acabado estándar/medio"
  },
  {
    "name": "price_unit_high",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Precio unitario para acabado premium/alto"
  },
  {
    "name": "selected_quality",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Calidad actualmente seleccionada (LOW, MEDIUM, HIGH)"
  },
  {
    "name": "updated_at",
    "type": "TIMESTAMP",
    "mode": "REQUIRED"
  }
]
EOF
}

# --- Tabla para Historial de Precios y Materiales Encontrados ---
resource "google_bigquery_table" "materials_catalog" {
  dataset_id = google_bigquery_dataset.refurbishment_dataset.dataset_id
  table_id   = "materials_catalog"

  deletion_protection = false

  schema = <<EOF
[
  {
    "name": "material_id",
    "type": "STRING",
    "mode": "REQUIRED"
  },
  {
    "name": "name",
    "type": "STRING",
    "mode": "REQUIRED"
  },
  {
    "name": "category",
    "type": "STRING",
    "mode": "REQUIRED"
  },
  {
    "name": "price",
    "type": "FLOAT",
    "mode": "REQUIRED"
  },
  {
    "name": "distributor",
    "type": "STRING",
    "mode": "NULLABLE"
  },
  {
    "name": "url",
    "type": "STRING",
    "mode": "NULLABLE"
  },
  {
    "name": "match_quality",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Clasificación de acabado (LOW, MEDIUM, HIGH)"
  },
  {
    "name": "scraped_at",
    "type": "TIMESTAMP",
    "mode": "REQUIRED"
  }
]
EOF
}
