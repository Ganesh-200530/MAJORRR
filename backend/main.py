from fastapi import FastAPI, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
import uvicorn

from chat_service import get_chat_response
from tts_service import generate_speech
import models, schemas, auth
from database import engine, get_db

# Create Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mental Health Friend AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user_name(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except auth.JWTError:
        raise credentials_exception
    return username

@app.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto login
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": new_user.username}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Since frontend sends email in the 'username' field for standard OAuth2 compat:
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

# --- Chat ---

class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_name: Optional[str] = "Friend" # Client can still send this for legacy or if we want logic override
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = "Auto-Detect" # Added Language config

class ChatResponse(BaseModel):
    message: str
    suggest_hospitals: bool
    hospital_data: Optional[list] = None
    audio_base64: Optional[str] = None
    anxiety_detected: bool = False

import requests

# Fallback hospital data
HOSPITALS = [
    {"name": "NIMHANS (National Institute of Mental Health)", "address": "Hosur Road, Bengaluru, India", "contact": "080-26995000"},
    {"name": "AASRA Suicide Prevention Center", "address": "Navi Mumbai, Maharashtra, India", "contact": "9820466726"},
    {"name": "Vandrevala Foundation", "address": "All India Helpline", "contact": "9999 666 555"},
    {"name": "Kiran Mental Health Helpline", "address": "Govt of India", "contact": "1800-599-0019"}
]

def get_nearby_hospitals(lat: float, lon: float) -> list:
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:8000,{lat},{lon});
      way["amenity"="hospital"](around:8000,{lat},{lon});
      relation["amenity"="hospital"](around:8000,{lat},{lon});
      node["amenity"="clinic"](around:8000,{lat},{lon});
    );
    out center;
    """
    try:
        response = requests.get(overpass_url, params={'data': overpass_query}, timeout=10)
        data = response.json()
        hospitals = []
        for element in data.get('elements', [])[:3]:
            tags = element.get('tags', {})
            name = tags.get('name', 'Local Clinic/Hospital')
            street = tags.get('addr:street', '')
            city = tags.get('addr:city', '')
            contact = tags.get('phone', tags.get('contact:phone', 'Check local directory'))
            
            # Formatting address
            address_parts = [p for p in [street, city] if p]
            address = ", ".join(address_parts)
            if not address:
                address = "Near your current location"
                
            hospitals.append({
                "name": name,
                "address": address,
                "contact": contact
            })
        
        # Combine local geographic hospitals with the national mental health resources
        combined_hospitals = hospitals + HOSPITALS
        return combined_hospitals
    except Exception as e:
        print(f"Error fetching nearby hospitals: {e}")
    return HOSPITALS

@app.get("/")
def read_root():
    return {"message": "Welcome to your AI Mental Health Friend API"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user_name: str = Depends(get_current_user_name), db: Session = Depends(get_db)):
    """
    Endpoint to receive text chat and return an AI response. Requires Auth.
    """
    try:
        if not request.message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Use the authenticated username
        if not request.session_id:
             request.session_id = f"user_{current_user_name}"
             
        result = await get_chat_response(request.session_id, request.message, user_name=current_user_name, language=request.language)
        
        # Check if result is what we expect
        if not isinstance(result, dict) or "response" not in result:
             # Fallback if chat service returns string or error
             print(f"Unexpected result format: {result}")
             response_text = result if isinstance(result, str) else "I'm having trouble thinking properly."
             is_crisis = False
             anxiety_detected = False
        else:
             response_text = result["response"]
             is_crisis = result.get("is_crisis", False)
             anxiety_detected = result.get("anxiety_detected", False)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat processing: {e}")
        import traceback
        traceback.print_exc()
        # Return a friendly error instead of crashing
        return ChatResponse(
            message="I'm having some internal trouble. Please try again later.",
            suggest_hospitals=False,
            anxiety_detected=False
        )
    
    hospital_info = None
    if is_crisis:
        if request.latitude and request.longitude:
            hospital_info = get_nearby_hospitals(request.latitude, request.longitude)
        else:
            hospital_info = HOSPITALS
        response_text += "\n\nI've also listed some nearby hospitals and helplines if you need immediate professional support."

    try:
        user = db.query(models.User).filter(models.User.username == current_user_name).first()
        if user:
            import json
            from datetime import datetime
            
            # Mood Tracking
            mood_val = -1 if is_crisis else (-0.5 if anxiety_detected else 0.5)
            history = json.loads(user.mood_history) if user.mood_history else []
            history.append({"date": datetime.now().isoformat(), "mood": mood_val})
            user.mood_history = json.dumps(history[-10:])
            
            # Caregiver Alert
            if is_crisis and user.caregiver_email:
                print(f"🚨 EMERGENCY ALERT: Mock Email sent to caregiver at {user.caregiver_email}! Subject: MindEase Alert - User {current_user_name} is in distress.")
            
            db.commit()
    except Exception as dbe:
        print(f"Error saving to db: {dbe}")

    # Generate Audio
    audio_data = await generate_speech(response_text)

    return ChatResponse(
        message=response_text,
        suggest_hospitals=is_crisis,
        hospital_data=hospital_info,
        audio_base64=audio_data,
        anxiety_detected=anxiety_detected
    )

from fastapi import UploadFile, File

@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...), current_user_name: str = Depends(get_current_user_name)):
    """
    Endpoint to receive an audio file, send to Gemini, and return transcribed text.
    """
    try:
        import google.generativeai as genai
        import tempfile
        import os

        # Save uploaded file to temp file
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".m4a"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_audio:
            temp_audio.write(await file.read())
            temp_path = temp_audio.name

        try:
            sample_file = genai.upload_file(path=temp_path)
            
            model = genai.GenerativeModel("models/gemini-2.5-flash")
            response = model.generate_content([
                sample_file, 
                "Please transcribe this audio exactly as it is spoken. Do not add any extra commentary or formatting. Only return the text of the speech."
            ])
            
            genai.delete_file(sample_file.name)
            
            return {"text": response.text.strip()}
        finally:
            os.remove(temp_path)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

import json
from datetime import datetime

@app.get("/dashboard", response_model=schemas.UserDashboard)
def get_dashboard(current_user_name: str = Depends(get_current_user_name), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == current_user_name).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "mood_history": user.mood_history or "[]",
        "daily_quests": user.daily_quests or json.dumps([
            {"id": 1, "task": "Do a 5-minute breathing exercise", "completed": False},
            {"id": 2, "task": "Write down 2 things you're grateful for", "completed": False},
            {"id": 3, "task": "Drink a glass of water and stretch", "completed": False},
        ]),
        "caregiver_email": user.caregiver_email
    }

@app.post("/settings")
def update_settings(settings: schemas.UserSettings, current_user_name: str = Depends(get_current_user_name), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == current_user_name).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if settings.caregiver_email is not None:
        user.caregiver_email = settings.caregiver_email
    
    db.commit()
    return {"status": "success"}

@app.post("/dashboard/quest/{quest_id}")
def mark_quest_completed(quest_id: int, current_user_name: str = Depends(get_current_user_name), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == current_user_name).first()
    quests = json.loads(user.daily_quests) if user.daily_quests else []
    for q in quests:
        if q["id"] == quest_id:
            q["completed"] = not q.get("completed", False)
    user.daily_quests = json.dumps(quests)
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



