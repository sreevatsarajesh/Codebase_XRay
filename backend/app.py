import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scanner import scan_repository
app = FastAPI(
    title="Codebase X-Ray API",
    description="Repository analysis and dependency graph API",
    version="0.1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"]
)
class ScanRequest(BaseModel):
    path: str
@app.get("/")
def health_check():
    return {
        "status": "running",
        "service": "Codebase X-Ray API"
    }
@app.get("/api/health")
def api_health():
    return {"status": "healthy"}
@app.post("/api/scan")
def scan_codebase(request: ScanRequest):
    path = os.path.abspath(os.path.expanduser(request.path))
    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail="Repository path does not exist"
        )
    if not os.path.isdir(path):
        raise HTTPException(
            status_code=400,
            detail="The provided path is not a directory"
        )
    try:
        result = scan_repository(path)
        return result
    except (OSError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
