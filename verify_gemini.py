import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing API Key: {api_key[:5]}...{api_key[-5:] if api_key else 'None'}")

if not api_key:
    print("ERROR: No API Key found.")
    exit(1)

genai.configure(api_key=api_key)

print("--- Testing Chat Model (gemini-1.5-flash) ---")
try:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Hello, can you hear me?")
    print("Success! Response:")
    print(response.text)
except Exception as e:
    print("FAILED to call Chat Model.")
    print(e)

print("\n--- Testing TTS Model (models/gemini-2.5-flash-preview-tts) ---")
try:
    tts_model = genai.GenerativeModel("models/gemini-2.5-flash-preview-tts")
    response = tts_model.generate_content(
        "Testing audio generation.",
        generation_config={"response_mime_type": "audio/mp3"}
    )
    print("TTS Call executed.")
    if response.parts:
        print("Received parts.")
    else:
        print("No parts received.")
except Exception as e:
    print("FAILED to call TTS Model.")
    print(e)
