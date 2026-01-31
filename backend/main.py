from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from .chat_service import get_chat_response
from .tts_service import generate_speech

app = FastAPI(title="Mental Health Friend AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    message: str
    suggest_hospitals: bool
    hospital_data: Optional[list] = None
    audio_base64: Optional[str] = None

# Mock hospital data - In real app, fetch from Maps API based on user location
HOSPITALS = [
    {"name": "City General Hospital", "address": "123 Main St", "contact": "555-0199"},
    {"name": "Sunrise Mental Health Clinic", "address": "456 Hope Ave", "contact": "555-0200"},
    {"name": "Emergency Care Center", "address": "789 Health Dr", "contact": "555-0201"}
]

@app.get("/")
def read_root():
    return {"message": "Welcome to your AI Mental Health Friend API"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint to receive text chat and return an AI response.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Get response from logic layer
    result = await get_chat_response(request.session_id, request.message)
    
    response_text = result["response"]
    is_crisis = result["is_crisis"]
    
    hospital_info = None
    if is_crisis:
        hospital_info = HOSPITALS
        response_text += "\n\nI've also listed some nearby hospitals and helplines if you need immediate professional support."

    # Generate Audio
    audio_data = await generate_speech(response_text)

    return ChatResponse(
        message=response_text,
        suggest_hospitals=is_crisis,
        hospital_data=hospital_info,
        audio_base64=audio_data
    )

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
