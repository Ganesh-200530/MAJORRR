import os
import google.generativeai as genai
from dotenv import load_dotenv
from .prompts import SYSTEM_PROMPT

load_dotenv()

# Configure the API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=api_key)

# Initialize the model
# Using gemini-pro as a robust text model (closest public equivalent to a 'Gemini 3' generic request if not specified)
# If 'Gemini 3' becomes available as a specific model string, it can be updated here.
generation_config = {
    "temperature": 0.9, # Higher temperature for more creative/human-like responses
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

model = genai.GenerativeModel(
    model_name="gemini-3-flash-preview", # Using a fast, modern model
    generation_config=generation_config,
    system_instruction=SYSTEM_PROMPT
)

class ChatService:
    def __init__(self):
        self.chat_session = model.start_chat(history=[])

    async def get_response(self, user_input: str) -> dict:
        try:
            response = self.chat_session.send_message(user_input)
            text_response = response.text
            
            is_crisis = False
            if text_response.startswith("CRISIS_DETECTED:"):
                is_crisis = True
                text_response = text_response.replace("CRISIS_DETECTED:", "").strip()

            return {
                "response": text_response,
                "is_crisis": is_crisis
            }
        except Exception as e:
            print(f"Error communicating with Gemini: {e}")
            return {
                "response": "I'm having a bit of trouble connecting right now, but I'm still here with you. Can you say that again?",
                "is_crisis": False
            }

# Simple in-memory management for demo purposes. 
# In a real app, you'd manage sessions per user ID.
chat_instances = {}

def get_chat_response(session_id: str, text: str):
    if session_id not in chat_instances:
        chat_instances[session_id] = ChatService()
    
    return chat_instances[session_id].get_response(text)
