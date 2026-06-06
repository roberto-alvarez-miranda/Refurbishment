# Track Specification: CAD Vector & Scale Ingestion

## Overview
This track implements an advanced, highly accurate, and robust CAD ingestion service. It enables the system to read both `.dxf` and binary `.dwg` files, programmatically extract geometric entities (lines, closed polylines, texts), resolve drawing scales and units, and allow users to manually calibrate/calibrate the scale in the UI.

## Functional Requirements
1. **DWG & DXF Support (Backend):**
   - Implement a mechanism to handle both `.dxf` and binary `.dwg` files. For `.dwg`, integrate a conversion step (e.g. using `libredwg` or an open-source converter script) to translate binary entities into a parseable format, then use `ezdxf` to read the geometry.
2. **Scale & Unit Resolution:**
   - Programmatically read `$INSUNITS` (GCP/AutoCAD default drawing unit) and `$DIMLFAC` (linear dimension scale factor) from the file headers.
   - Calculate the mathematical factor to scale all drawing units to exact **meters** and **millimeters**.
3. **Geometric Entity Extraction & Aggregation:**
   - Extract `LWPOLYLINE` boundaries representing rooms and calculate exact areas (m²) and perimeters (ml).
   - Match text annotations (`MTEXT`, `TEXT`) in the coordinate space to name rooms (e.g., matching a "Cocina" label to the nearest closed polyline coordinates).
   - Aggregate these exact dimensions into a structured, semantic text summary to feed to Gemini (avoiding visual hallucination errors).
4. **Interactive Scale Calibration (UI):**
   - Display a vector-drawn preview of the plan in the frontend.
   - Implement a "Calibrate Scale" button: let the user click two vertices on the screen (creating a reference segment) and input its known real dimension (e.g., "This distance is 1.50 meters").
   - Automatically calculate the scale multiplier in the frontend to adjust all extracted measurements dynamically based on this manual reference.

## Constraints & Assumptions
- If `$INSUNITS` is missing or unconfigured, default to `4` (millimeters) for residential interior renovations.
- Manual calibration overrides any automatically detected CAD headers.
