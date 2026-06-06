# Track Specification: End-to-End & Integration Testing

## Overview
This track introduces a robust testing strategy for the Refurbishment project. It implements End-to-End (E2E) testing for the frontend to simulate real user interactions and Integration testing for the backend to ensure endpoints function correctly with the database, while avoiding unnecessary cloud costs and production data pollution.

## Core Requirements
1. **Frontend E2E Testing (Playwright):** 
   - Install and configure Playwright in the `frontend/` directory.
   - Write an E2E test that covers the main user flow: navigating to the dashboard, "uploading" a blueprint (simulated/stubbed file upload if necessary), viewing the AI Preview, and clicking "Guardar Presupuesto".
2. **Backend Integration Testing (Pytest + Emulators):**
   - Expand the existing `pytest` suite in `backend/tests/`.
   - Configure the tests to run against the **Firebase Local Emulator Suite** (specifically Firestore) so that tests do not write to the `app-reformia` production database.
   - Test the `POST /api/budget/save` endpoint to verify it correctly stores data in the local emulator.
3. **AI Service Mocking:**
   - Implement a mock for the `google-genai` SDK within the backend tests.
   - Ensure that calling the `/api/ai/preview` endpoint during tests returns a hardcoded, structured JSON response (matching the `ExtractedPlan` schema) without hitting the real Vertex AI API.

## Constraints & Assumptions
- Tests must be able to run locally without affecting the live Firebase project.
- CI/CD pipelines are not strictly part of this initial track but the testing commands should be clearly documented for future CI integration.
- Playwright should automatically handle starting the Vite dev server for its tests, or a clear script should be provided.