#!/bin/bash
echo "--- Testing /api/ai/preview endpoint ---"
curl -s -X POST "http://localhost:8000/api/ai/preview" \
     -H "Content-Type: application/json" \
     -d '{
           "gcs_uri": "gs://my-bucket/fake_plan.pdf",
           "mime_type": "application/pdf"
         }' | python3 -m json.tool
