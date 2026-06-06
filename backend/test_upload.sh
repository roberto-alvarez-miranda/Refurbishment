#!/bin/bash
# Check if running from root or backend directory
FILE_PATH="conductor/tracks.md"
if [ ! -f "$FILE_PATH" ]; then
    FILE_PATH="../conductor/tracks.md"
fi

echo "--- Testing valid PDF upload ---"
curl -X POST "http://localhost:8000/upload-asset" \
     -F "file=@${FILE_PATH};type=application/pdf;filename=fake_plan.pdf"

echo -e "\n\n--- Testing invalid Script upload ---"
curl -X POST "http://localhost:8000/upload-asset" \
     -F "file=@${FILE_PATH};type=application/x-sh;filename=malicious.sh"
echo ""
