#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
uvicorn app.main:app --reload --port 8000
