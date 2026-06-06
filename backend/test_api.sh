#!/bin/bash
echo "Sending POST request to /api/budget/calculate..."
curl -s -X POST "http://localhost:8000/api/budget/calculate" \
     -H "Content-Type: application/json" \
     -d '{
           "budget": {"id": "proj-1", "name": "Renovation", "parameters": {}, "total_cost": 0},
           "chapters": [{"id": "c-1", "project_id": "proj-1", "code": "01", "name": "Demo", "total_cost": 0}],
           "items": [{"id": "item-1", "chapter_id": "c-1", "project_id": "proj-1", "code": "01.01", "name": "Wall", "unit_type": "m2", "resources": [{"resource_id": "r-1", "quantity": 2.0}], "measurement_lines": [{"id": "m-1", "length": 5.0, "height": 3.0, "units": 1.0, "width": 1.0}], "calculated_unit_price": 0, "calculated_quantity": 0}],
           "resources": {"r-1": {"id": "r-1", "project_id": "proj-1", "code": "MO", "name": "Labor", "resource_type": "labor", "base_price": 20.0}}
         }' | python3 -m json.tool
