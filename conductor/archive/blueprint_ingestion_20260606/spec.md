# Track Specification: Blueprint & Image Ingestion for Measurements and Materials

## Overview
This track implements a feature to ingest floor plans, sketches, architectural drawings, and room photographs. The system will use AI to analyze these files and extract structural dimensions (measurements) and required construction materials. The output will be presented to the user for review before being converted into parametric budget items.

## Core Requirements
1. **File Upload & Storage:** Expand the existing `/upload-asset` endpoint to handle Images (JPG, PNG), PDFs, and CAD files (`.dxf`). Files must be stored securely in Google Cloud Storage.
2. **AI Multimodal Parsing (Images & PDFs):** Integrate the latest Gemini Multimodal models (e.g., Gemini Flash/Pro) via the `google-genai` SDK to process images and PDFs, extracting visible dimensions, areas, and material annotations into a structured JSON format.
3. **CAD Parsing Research (.dxf):** Research and integrate a mechanism to parse `.dxf` files. This may involve evaluating dedicated Python libraries (like `ezdxf`), converting DXF to SVG/Image for Gemini ingestion, or exploring an AutoCAD MCP integration.
4. **Structured Output (Preview Mode):** The backend must return the extracted data (rooms, dimensions, proposed materials) as a structured JSON response to the frontend.
5. **User Approval Workflow:** The system must not auto-save to the database immediately. It must wait for a subsequent confirmation from the frontend before translating the extracted JSON into `MeasurementLine` and `BudgetItem` records.
6. **Authentication & Authorization:** The backend must authenticate users via Firebase Auth (e.g., extracting the UID from the `Authorization` header token).
7. **Dynamic Service Account Impersonation:** To enforce per-user quotas in GCP, the backend must use the user's JWT (which contains custom claims or metadata linking to their dedicated GCP Service Account) to dynamically generate short-lived impersonated credentials (`google.auth.impersonated_credentials`) before calling Vertex AI.

## Constraints
- File uploads must have size and type validation to prevent malicious uploads.
- The AI parsing logic must handle errors gracefully (e.g., blurry images or unreadable plans) and inform the user if manual input is required.
- CAD (.dxf) parsing must be evaluated as an iterative feature; if direct native parsing is too complex for an MVP, a conversion fallback strategy must be established.