from typing import List
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

class ChatRequest(BaseModel):
    message: str
    plan_context: ExtractedPlan
    history: List[dict] = [] # Optional chat history placeholder

class ChatResponse(BaseModel):
    response: str

from typing import List

@router.post("/chat", response_model=ChatResponse)
def chat_with_plan(request: ChatRequest, user: dict = Depends(get_current_user)):
    parser = AIParsingService(user)
    try:
        response_text = parser.chat_with_context(request.message, request.plan_context, request.history)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/acae-search")
def search_acae_catalog(q: str, limit: int = 15, user: dict = Depends(get_current_user)):
    from app.services.acae_search import search_acae
    try:
        results = search_acae(q, limit)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
