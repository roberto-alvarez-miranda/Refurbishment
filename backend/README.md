# Refurbishment - Backend

API principal del sistema para la gestión inteligente de reformas. Construida en Python utilizando FastAPI.

## Funcionalidades
- **Gestión de Archivos**: Endpoint `/upload-asset` para subir PDFs, imágenes y CADs (DXF) al bucket de GCP.
- **Análisis de Planos mediante IA**: Endpoint `/api/ai/preview` que utiliza el SDK `google-genai` con Service Account Impersonation para extraer datos de mediciones utilizando modelos multimodales (Gemini).
- **Cálculo de Presupuestos**:
  - `POST /api/budget/calculate`: Lógica paramétrica para calcular presupuestos en función a recursos de mano de obra y materiales.
  - `POST /api/budget/save`: Endpoint de persistencia de datos validados, enviando información a Firestore.

## Requisitos y Configuración
El backend requiere configurar credenciales de Google Cloud (`GOOGLE_APPLICATION_CREDENTIALS` o un login con ADC) para acceder a los servicios de:
- Vertex AI (Gemini)
- Cloud Storage
- Cloud Firestore
- BigQuery

## Despliegue Local
Crear entorno virtual, instalar dependencias y ejecutar:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./run_server.sh
```

## Testing
Los tests automatizados (Pytest) cubren lógicas de validación, parsers, calculadoras de tarifas y mockers de IAM Impersonation:
```bash
PYTHONPATH=. ./venv/bin/pytest tests/
```