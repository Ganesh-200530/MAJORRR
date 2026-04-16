import os
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import SYSTEM_PROMPT
from rag_service import rag_system # Import RAG

load_dotenv()

# Configure the API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("CRITICAL: GEMINI_API_KEY not found in environment variables.")
else:
    print(f"Chat Service: API Key loaded ({api_key[:10]}...)")

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

model = None # Model is now instantiated per user to support custom system prompts

class ChatService:
    def __init__(self, user_name: str = "User"):
        self.user_name = user_name
        # Inject user name into the system prompt or history start
        personalized_system_prompt = SYSTEM_PROMPT + f"\n\nCONTEXT: You are talking to {user_name}. Use their name naturally occasionally, but don't overdo it."
        
        self.model = genai.GenerativeModel(
            model_name="models/gemini-2.5-flash", 
            generation_config=generation_config,
            system_instruction=personalized_system_prompt
        )
        self.chat_session = self.model.start_chat(history=[])

    async def get_response(self, user_input: str, language: str = "Auto-Detect") -> dict:
        try:
            # 1. RAG Lookup
            rag_context = rag_system.find_relevant_context(user_input)
            
            # 2. Language constraint
            lang_constraint = ""
            if language and language != "Auto-Detect":
                lang_constraint = f"\n\n[MANDATORY EXPLICIT INSTRUCTION: YOU MUST REPLY TO THE FOLLOWING USER MESSAGE ENTIRELY IN {language.upper()}. NO EXCEPTIONS.]\n"

            final_prompt = user_input
            if rag_context:
                print(f"RAG: Found similar context (similarity: {rag_context['similarity']:.2f})")
                context_str = (
                    f"RAG Inspiration Context (DO NOT copy this exactly, just use the VIBE or underlying advice to form a completely NEW response):\n"
                    f"Past similar situation: \"{rag_context['matched_user_msg']}\"\n"
                    f"Helpful past response: \"{rag_context['matched_bot_response']}\"\n"
                    f"Now, maintaining a fresh and non-repetitive dialogue, respond to the current user message below:\n"
                )
                final_prompt = f"{context_str}\n{lang_constraint}{user_input}"
            else:
                final_prompt = f"{lang_constraint}{user_input}"

            print(f"Chat Service: Sending to Gemini (User: {self.user_name}, Lang: {language})...")
            response = await self.chat_session.send_message_async(final_prompt)
            text_response = response.text
            print("Chat Service: Received response.")
            
            is_crisis = False
            anxiety_detected = False
            if text_response.startswith("CRISIS_DETECTED:") or "CRISIS_DETECTED:" in text_response:
                is_crisis = True
                text_response = text_response.replace("CRISIS_DETECTED:", "").strip()
                
            if text_response.startswith("ANXIETY_DETECTED:") or "ANXIETY_DETECTED:" in text_response:
                anxiety_detected = True
                text_response = text_response.replace("ANXIETY_DETECTED:", "").strip()

            return {
                "response": text_response,
                "is_crisis": is_crisis,
                "anxiety_detected": anxiety_detected
            }
        except Exception as e:
            error_msg = str(e)
            print(f"Error communicating with Gemini: {error_msg}")
            
            import traceback
            traceback.print_exc()

            if "429" in error_msg or "quota" in error_msg.lower():
                return {
                    "response": "I'm currently overwhelmed with too many thoughts! (API Quota Exceeded). Please update my API Key in the .env file.",
                    "is_crisis": False
                }
            
            return {
                "response": "I'm having a bit of trouble connecting right now, but I'm still here with you.",
                "is_crisis": False
            }

# Simple in-memory management for demo purposes. 
# In a real app, you'd manage sessions per user ID.
chat_instances = {}

async def get_chat_response(session_id: str, text: str, user_name: str = "Friend", language: str = "Auto-Detect"):
    if session_id not in chat_instances:
        chat_instances[session_id] = ChatService(user_name=user_name)
    
    return await chat_instances[session_id].get_response(text, language=language)
