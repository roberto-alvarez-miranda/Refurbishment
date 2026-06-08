# Implementation Plan: CYPE Parametric Quality Selector & Live Google Search Material Specifier

## Phase 1: Backend CYPE BC3 Parser & BigQuery Integration [checkpoint: 988963c]
- [x] Task: Implement `GET /api/budget/cype-lookup` endpoint in FastAPI.
    - [x] Write unit tests verifying BC3 file download, HTTP routing, and FIEBDC-3 parsing (Red Phase).
    - [x] Implement `cype_parser.py` using `httpx` to download and parse dynamic `.bc3` files from CYPE's Asturias server.
- [x] Task: Implement robust BigQuery SQL parametrized search for ACAE.
    - [x] Refactor `acae_search.py` and write tests for SQL parameterized queries.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend CYPE BC3 Parser & BigQuery Integration' (Protocol in workflow.md)

## Phase 2: Frontend "Zoom" Quality Selector Popup Modal
- [ ] Task: Create `CypeParameterPopup.tsx` React component.
    - [ ] Write Playwright tests verifying Popup modal rendering and CYPE code assembly (Red Phase).
    - [ ] Implement Popup modal in React with CYPE-compliant dropdowns (wall thickness, method, disposal).
- [ ] Task: Integrate Gemini 3.1 Pro + Google Search Grounding for material specs.
    - [ ] Implement `/api/ai/specifier` endpoint in FastAPI.
    - [ ] Wire up the "AI Material Specifier" search bar inside the Popup Modal to fetch structured live prices and links.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend \"Zoom\" Quality Selector Popup Modal' (Protocol in workflow.md)

## Phase 3: Multi-Version Budget Saving in Firestore
- [ ] Task: Support saving and listing named budget versions.
    - [ ] Write unit tests for `/api/budget/save-version` and `/api/budget/versions` endpoints.
    - [ ] Implement sub-collection `/budget_versions` in Firestore.
    - [ ] Update frontend to allow entering a Version Name (e.g. "Gama Confort") before saving.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Multi-Version Budget Saving in Firestore' (Protocol in workflow.md)
