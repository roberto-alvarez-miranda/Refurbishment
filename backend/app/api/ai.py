from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ai_parser import AIParsingService
from app.models.plan import ExtractedPlan
from app.dependencies.auth import get_current_user

router = APIRouter()

class PreviewBlueprintRequest(BaseModel):
    gcs_uri: str
    mime_type: str

@router.post("/preview", response_model=ExtractedPlan)
def preview_blueprint(request: PreviewBlueprintRequest, user: dict = Depends(get_current_user)):
    parser = AIParsingService()
    try:
        extracted_plan = parser.parse_blueprint(request.gcs_uri, request.mime_type)
        return extracted_plan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
