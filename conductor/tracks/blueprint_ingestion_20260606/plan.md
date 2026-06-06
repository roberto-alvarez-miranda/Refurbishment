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
- [x] Task: DXF Research spike (Timeboxed) 61efe11
    - [ ] Write a brief spike document detailing the viability of `ezdxf` vs AutoCAD MCP vs converting DXF to image for Gemini.
- [x] Task: Conductor - User Manual Verification 'Phase 3: CAD Fallback Research & Preview Endpoint' (Protocol in workflow.md) [checkpoint: 4865732]

## Phase 4: Authentication & IAM Delegation
- [x] Task: Implement Authentication Middleware e39cce2
    - [ ] Write integration tests for protected routes
    - [ ] Create a dependency in FastAPI to decode Firebase ID tokens and extract the user's context
    - [ ] Protect the `/upload-asset` and `/api/ai/preview` endpoints with this dependency
- [x] Task: Conductor - User Manual Verification 'Phase 4: Authentication & IAM Delegation' (Protocol in workflow.md) [checkpoint: 98dd15b]

## Phase 5: Dynamic Service Account Impersonation
- [ ] Task: Implement Identity Platform to GCP IAM impersonation
    - [ ] Write tests ensuring impersonated credentials are created dynamically from decoded token claims
    - [ ] Modify `AIParsingService` to accept `user` credentials instead of using global defaults
    - [ ] Initialize the `google-genai` client using Vertex AI and the impersonated credentials
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Dynamic Service Account Impersonation' (Protocol in workflow.md)