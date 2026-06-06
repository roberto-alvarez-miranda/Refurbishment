# Implementation Plan: End-to-End & Integration Testing

## Phase 1: Firebase Emulator & Backend Integration Tests
- [x] Task: Set up Firebase Emulator Suite
    - [x] Initialize Firebase Emulators (`firebase init emulators`) for Firestore and Auth.
    - [x] Configure GitHub Actions or local test scripts to start the emulator before running backend tests.
- [x] Task: Expand Backend `pytest` Suite
    - [x] Write integration tests for `POST /api/budget/save` to verify data writes to the local Firestore emulator.
    - [x] Ensure tests do not leak into the production `app-reformia` database.
- [x] Task: Mock AI Services
    - [x] Implement `unittest.mock` for the `google-genai` client within the Pytest suite.
    - [x] Write tests for `POST /api/ai/preview` ensuring it returns the expected `ExtractedPlan` JSON without making real network calls.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Firebase Emulator & Backend Integration Tests' (Protocol in workflow.md)

## Phase 2: Frontend E2E Testing with Playwright
- [x] Task: Install and Configure Playwright
    - [x] Install Playwright in the `frontend/` directory (`npm init playwright@latest`).
    - [x] Configure `playwright.config.ts` to automatically start the Vite dev server and point to local backend/emulators if necessary.
- [x] Task: Write Core Flow E2E Test
    - [x] Create a test that navigates to the dashboard and simulates a file upload.
    - [x] Assert that the AI Preview table populates correctly (using stubbed backend responses if needed).
    - [x] Simulate clicking "Guardar Presupuesto" and assert the success alert appears.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend E2E Testing with Playwright' (Protocol in workflow.md)