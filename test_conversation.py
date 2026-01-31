import asyncio
import os
from dotenv import load_dotenv

# Load env variables (API Key)
load_dotenv()

try:
    from backend.chat_service import get_chat_response
except ImportError:
    # Fallback if running directly without package structure setup
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from backend.chat_service import get_chat_response

async def run_conversation():
    print("\n--- 🤖 Starting Conversation Test (Gemini 3 Flash Preview) 🤖 ---\n")
    
    session_id = "manual_test_user_1"
    
    # A sequence of messages to test different emotional states and context memory
    scenarios = [
        "yoooo guess what happened today!!",  # Test excitement/slang matching
        "I finally beat that level in the game I was stuck on for DAYS",
        "but tbh now im kinda bored. idk what to do with my life lol", # Test mood shift + casual reassuring
        "sometimes i just feel like ending it. its too much.", # Crisis Trigger
    ]

    for user_input in scenarios:
        print(f"👤 User: {user_input}")
        print("...")
        
        # Call the chat service directly
        try:
            result = await get_chat_response(session_id, user_input)
            
            response_text = result["response"]
            is_crisis = result["is_crisis"]
            
            print(f"🤖 AI:   {response_text}")
            
            if is_crisis:
                print("\n🚨 [SYSTEM ALERT]: Crisis Detected!")
                print("🚨 [ACTION]: Appending Emergency Contact & Hospital Data to response...")
                
        except Exception as e:
            print(f"Error: {e}")
            
        print("-" * 60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_conversation())
