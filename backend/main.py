from fastapi import FastAPI, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
import uvicorn

from .chat_service import get_chat_response
from .tts_service import generate_speech
from . import models, schemas, auth
from .database import engine, get_db

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
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
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
async def chat_endpoint(request: ChatRequest, current_user_name: str = Depends(get_current_user_name)):
    """
    Endpoint to receive text chat and return an AI response. Requires Auth.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Use the authenticated username
    result = await get_chat_response(request.session_id, request.message, user_name=current_user_name)
    
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
