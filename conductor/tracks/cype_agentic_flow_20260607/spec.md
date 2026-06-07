# Specification: CYPE Parametric Quality Selector & Live Google Search Material Specifier

## 1. Overview
This feature implements a high-fidelity, dynamic construction estimating pipeline that bridges mathematical room-by-room CAD/Image measurements with CYPE's official parametric pricing database (FIEBDC-3/BC3) and Gemini 3.1 Pro's live web grounding for material specifications.

Users will be able to select and isolate individual dwellings on a floor plan, zoom into specific rooms, and configure execution parameters (e.g. wall thickness, mechanical vs. manual demolition) using CYPE-compliant dropdowns in a Popup Modal. Additionally, users can search for real commercial materials (e.g. tiles, plasterboards) directly inside the CYPE panel, triggering Gemini 3.1 Pro with Google Search Grounding to fetch live, real-time market prices (€/m²), specifications, and manufacturer links. Finally, estimates can be saved as distinct versions (e.g., "Gama Confort", "Gama Lujo") in Firestore, with prices dynamically localized by selecting the target Spanish Province.

---

## 2. Functional Requirements

### 2.1 Paso 1: Magnitudes por Entidad (Dashboard)
- Displays room-by-room measurements extracted from vector CAD files or images.
- Rooms can never have empty stancias; a residential baseline layout is estimated and rendered if the drawing is blurry.
- Lists individual wall segments (Tabiques) per room with length (ml), height (m), and surface area (m²).
- Lists individual sanitary fixtures (Sanitarios) per room with count and actions (retirar/conservar).

### 2.2 Paso 2: El "Zoom" de Calidades CYPE (Popup Modal)
- Clicking on a room's demolition, flooring, or alicatado work opens a centered **Popup Modal**.
- Renders conmutable CYPE-compliant parameters as select dropdowns:
  - For Demolitions: Wall thickness (up to 10cm, 10-20cm), method (manual, mechanical), disposal means.
  - For Coverings/Finishes: Selection of localized province (drop-down list of Spain's provinces).
- As parameters change, the code is dynamically re-assembled (e.g. `DPT010_1_0_0_0_0_0`).

### 2.3 Paso 3: Integración de Materiales con Gemini & Google Search Grounding
- Inside the Popup Modal, an **"AI Material Specifier" search bar** is integrated.
- The user can type any commercial brand/material (e.g. *"Mármol Marazzi"*, *"Placa Pladur Hidrófuga"*).
- Triggers **Gemini 3.1 Pro** in `us-central1` or `global` with `Google Search Grounding` enabled, which crawls the web for:
  - Exact manufacturer code, technical descriptions, unit of sale, and average market price (€/m²).
  - List of reference sources/links.
- Merges the **CYPE placement cost** (e.g. 18.20 €/m²) with the **AI-grounded material cost** (e.g. 45.00 €/m²), updating the final unit cost to `63.20 €/m²` dynamically.

### 2.4 Guardado Multiversión en Firestore (Budget Versions)
- Allows saving multiple named budget versions (e.g., "Reforma Básica", "Presupuesto Premium Marazzi") in Firestore.
- Saves room-by-room measurement desgloses alongside their assigned CYPE codes and quantities.

---

## 3. Technical Requirements & Architecture
- **Backend API Routes:**
  - `GET /api/budget/cype-lookup?code=...&province=...`: Constructs CYPE's deterministic Asturias/Province URL, downloads the FIEBDC-3 `.bc3` file, and parses exact descriptions and prices.
  - `POST /api/ai/specifier`: Triggers Gemini 3.1 Pro + Google Search Grounding to return structured material cost card.
  - `POST /api/budget/save-version`: Saves budget version to a sub-collection `/budget_versions` in Firestore.
- **Frontend Components:**
  - `CypeParameterPopup.tsx`: Dedicated centered modal for conmuting CYPE parameters and running Google Search material lookups.

---

## 4. Acceptance Criteria
- [ ] Swapping CYPE options in the Popup Modal correctly changes the re-assembled code and updates the price.
- [ ] Live Google Search retrieves real pricing and technical details for entered brands without hardcoding.
- [ ] Budget can be saved as distinct versions in Firestore.
