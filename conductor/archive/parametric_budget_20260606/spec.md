# Track Specification: Implement parametric budget calculation module

## Overview
This track implements the core engine for calculating construction costs. It follows an industry-standard parametric architecture similar to Presto or Cype, allowing users to define a Work Breakdown Structure (WBS) with Chapters, Items (Partidas), Breakdowns (Básicos), and highly detailed Measurement Lines with formula support.

*Deviation Note (2026-06-06): User explicitly requested a complete Presto/Cype-like hierarchy optimized not just for FastAPI, but also for NoSQL scalability (Firestore) and tabular analytics (BigQuery).*

## Database Strategy (Firestore & BigQuery)
- **Firestore (OLTP):** To avoid the 1MB document limit for massive budgets, the hierarchy will be normalized via subcollections or distinct top-level collections (`projects`, `chapters`, `budget_items`, `measurement_lines`). Parent IDs will establish the tree.
- **BigQuery (OLAP):** The schema must flatten well. Each record (e.g., a measurement line or a resource yield) must carry contextual keys (project_id, chapter_id, item_id) to allow rapid aggregations and AI analytics without complex Joins.

## Core Requirements
1. **Data Models:** Define Pydantic models for `Parameter`, `Resource` (Basic unit), `MeasurementLine`, `BudgetItem` (Partida), `Chapter`, and `ProjectBudget`.
2. **Calculation Engine:** Build a Python backend service to process parametric equations in measurement lines and calculate prices recursively.
3. **API Endpoints:** Expose FastAPI routes to manage the WBS nodes.
4. **Integration:** Ensure it can be invoked by the future React frontend and AI material assistant.

## Constraints
- Must be fully tested using `pytest`.
- Must align with the existing `app-reformia` Firebase configuration.