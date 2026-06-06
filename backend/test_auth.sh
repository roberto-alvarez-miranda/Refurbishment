#!/bin/bash
# Check if running from root or backend directory
FILE_PATH="conductor/tracks.md"
if [ ! -f "$FILE_PATH" ]; then
    FILE_PATH="../conductor/tracks.md"
fi

echo "--- Testing unauthorized /upload-asset ---"
curl -s -X POST "http://localhost:8000/upload-asset" \
     -F "file=@${FILE_PATH};type=application/pdf;filename=fake_plan.pdf" | python3 -m json.tool

echo -e "\n--- Testing unauthorized /api/ai/preview ---"
curl -s -X POST "http://localhost:8000/api/ai/preview" \
     -H "Content-Type: application/json" \
     -d '{
           "gcs_uri": "gs://my-bucket/fake_plan.pdf",
           "mime_type": "application/pdf"
         }' | python3 -m json.tool
