# Implementation Plan: CAD Vector & Scale Ingestion

## Phase 1: Backend DWG/DXF Ingestion and Scale Resolution
- [x] Task: Implement DWG-to-DXF converter
    - [x] Install LibreDWG or build a utility to convert binary `.dwg` to ASCII `.dxf` in the backend container.
    - [x] Write backend unit tests verifying that both file types are parsed successfully.
- [x] Task: Parse CAD Sizing and Scale Metadata
    - [x] Read `$INSUNITS` and `$DIMLFAC` variables from drawing headers using `ezdxf`.
    - [x] Implement mathematical conversion utility to calculate length in millimeters/meters and closed areas in m².
    - [x] Write Pytest unit tests confirming exact conversions for different units (mm, cm, m).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend DWG/DXF Ingestion and Scale Resolution' (Protocol in workflow.md)

## Phase 2: Geometry-to-Semantic Aggregator & Gemini Feeding
- [x] Task: Implement Room and Dimension Aggregator
    - [x] Write logic to find closed polylines (`LWPOLYLINE`) and associate them with nearest text labels (`TEXT`/`MTEXT`) inside the coordinate boundaries.
    - [x] Generate a clean, structured JSON and text summary (e.g. "Room 'Cocina' has Area=12.5m², Perimeter=15ml").
    - [x] Write Pytest unit tests for this coordinate-matching algorithm.
- [x] Task: Integrate Semantic Summary into Gemini API Prompt
    - [x] Modify `ai_parser.py` to optionally take the pre-calculated geometry summary and append it to the Gemini prompt instead of/in addition to raw file upload.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Geometry-to-Semantic Aggregator & Gemini Feeding' (Protocol in workflow.md)

## Phase 3: Frontend Interactive Scale Calibration
- [ ] Task: Render Vector CAD Preview in React
    - [ ] Implement a lightweight canvas/SVG renderer in React to draw extracted DXF line vectors.
- [ ] Task: Implement Manual Scale Calibration Tool
    - [ ] Add a calibration mode where a user clicks two vertices in the preview and enters their real distance.
    - [ ] Calculate the scale factor multiplier and adjust all table measurements dynamically.
    - [ ] Write Playwright E2E tests verifying this calibration flow.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Interactive Scale Calibration' (Protocol in workflow.md)
