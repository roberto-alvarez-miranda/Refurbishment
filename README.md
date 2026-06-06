# Refurbishment - Gestor Inteligente de Reformas

Herramienta diseñada para definir y calcular las partidas de obra en una reforma personal, permitiendo parametrizar presupuestos, ingestar planos y buscar materiales/precios óptimos utilizando Inteligencia Artificial (Gemini API / Vertex AI) y Google Cloud.

## Arquitectura y Estructura
El proyecto se compone de:
* **`backend/`**: Servicio de API en Python (FastAPI) para procesar planos mediante Gemini Multimodal, calcular presupuestos e interactuar con Firebase/Firestore y Google Cloud Storage.
* **`frontend/`**: Interfaz de usuario interactiva (React + Vite + TailwindCSS) para diseñar presupuestos y visualizar materiales/calidades. Basado en componentes adaptados del sistema de diseño Stitch.
* **`conductor/`**: Documentación central del ciclo de vida del producto, lineamientos y seguimiento de *tracks* de desarrollo.

## Funcionalidades Recientes
- **Ingesta de Planos (Blueprint Ingestion):** Subida de planos (PDF, DXF simulados, Imágenes) y análisis utilizando Gemini para extraer mediciones y sugerencias de materiales.
- **Previsualización de IA:** Generación en el frontend de un desglose en formato árbol (*tree-view*) organizando la información extraída por "Tipo de Partida".
- **Persistencia de Datos:** Guardado del presupuesto consolidado desde el frontend directamente hacia una colección de Firestore (`budget_components`) utilizando autenticación delegada.

---
Desarrollado con ❤️ y Google Cloud.
