# Implementation Plan: Blueprint & Image Ingestion

## Phase 1: Upload Endpoint Expansion
- [x] Task: Expand /upload-asset endpoint to support PDF and DXF 7d51fcd
    - [ ] Write Tests for validating new MIME types in the upload endpoint
    - [ ] Implement file extension and MIME type validation in `backend/app/main.py`
    - [ ] Ensure files are correctly stored in the GCP bucket
- [x] Task: Conductor - User Manual Verification 'Phase 1: Upload Endpoint Expansion' (Protocol in workflow.md) [checkpoint: addf9ca]

## Phase 2: Gemini Parsing Engine
- [x] Task: Implement AI Processing Service e24f878
    - [ ] Write mock tests for the `google-genai` integration
    - [ ] Implement the `AIParsingService` in `backend/app/services/ai_parser.py` using Gemini Multimodal for images and PDFs
    - [ ] Define the structured JSON schema expected from the model (Rooms, Walls, Windows, Material annotations)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Gemini Parsing Engine' (Protocol in workflow.md) [checkpoint: 3a40b85]

## Phase 3: CAD Fallback Research & Preview Endpoint
- [x] Task: Expose Preview Endpoint 16eba3a
    - [ ] Write integration tests for the `/api/ai/preview` endpoint
    - [ ] Implement the endpoint that takes a Google Cloud Storage URI, runs the `AIParsingService`, and returns the uncommitted structured JSON.
- [ ] Task: DXF Research spike (Timeboxed)
    - [ ] Write a brief spike document detailing the viability of `ezdxf` vs AutoCAD MCP vs converting DXF to image for Gemini.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: CAD Fallback Research & Preview Endpoint' (Protocol in workflow.md)