# Implementation Plan: End-to-End & Integration Testing

## Phase 1: Firebase Emulator & Backend Integration Tests
- [ ] Task: Set up Firebase Emulator Suite
    - [ ] Initialize Firebase Emulators (`firebase init emulators`) for Firestore and Auth.
    - [ ] Configure GitHub Actions or local test scripts to start the emulator before running backend tests.
- [ ] Task: Expand Backend `pytest` Suite
    - [ ] Write integration tests for `POST /api/budget/save` to verify data writes to the local Firestore emulator.
    - [ ] Ensure tests do not leak into the production `app-reformia` database.
- [ ] Task: Mock AI Services
    - [ ] Implement `unittest.mock` for the `google-genai` client within the Pytest suite.
    - [ ] Write tests for `POST /api/ai/preview` ensuring it returns the expected `ExtractedPlan` JSON without making real network calls.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Firebase Emulator & Backend Integration Tests' (Protocol in workflow.md)

## Phase 2: Frontend E2E Testing with Playwright
- [ ] Task: Install and Configure Playwright
    - [ ] Install Playwright in the `frontend/` directory (`npm init playwright@latest`).
    - [ ] Configure `playwright.config.ts` to automatically start the Vite dev server and point to local backend/emulators if necessary.
- [ ] Task: Write Core Flow E2E Test
    - [ ] Create a test that navigates to the dashboard and simulates a file upload.
    - [ ] Assert that the AI Preview table populates correctly (using stubbed backend responses if needed).
    - [ ] Simulate clicking "Guardar Presupuesto" and assert the success alert appears.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend E2E Testing with Playwright' (Protocol in workflow.md)