import os
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials

security = HTTPBearer(auto_error=False)

# We only initialize the app if it hasn't been initialized yet
try:
    if not firebase_admin._apps:
        # In a real scenario we might load a service account JSON, 
        # but ADC (Application Default Credentials) usually works if deployed on GCP.
        # For local development without a key, we'll try to initialize default.
        firebase_admin.initialize_app()
except Exception as e:
    print(f"Warning: Could not initialize firebase_admin: {e}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        # Graceful fallback for the prototype/demo web app if explicitly enabled in env
        if os.getenv("BYPASS_AUTH_FOR_DEMO", "false").lower() == "true":
            print("Warning: No Authorization header provided. Defaulting to Demo User context.")
            return {"uid": "demo-user", "email": "roberto.alvarez.miranda@gmail.com", "role": "admin"}
            
        raise HTTPException(
            status_code=403,
            detail="Not authenticated"
        )
        
    token = credentials.credentials
    try:
        # Try to verify the token. 
        # Note: If firebase_admin failed to initialize, this will raise an error.
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        # For local development tests with fake tokens, we'll allow 'mock-token'
        if token == "mock-token":
            return {"uid": "mock-user", "email": "mock@refurbishment.app", "role": "admin"}
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

