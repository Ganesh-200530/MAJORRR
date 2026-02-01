import base64
import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

async def generate_speech(text: str) -> str:
    """
    Generates speech from text using the gemini-2.5-flash-preview-tts model via REST API.
    Returns base64 encoded audio string.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("TTS Service: No API Key found.")
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }

        data = {
            "contents": [{
                "parts": [{"text": text}]
            }],
            "generationConfig": {
                "response_modalities": ["AUDIO"]
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data, timeout=10.0)
        
        if response.status_code == 200:
            result = response.json()
            # Extract audio
            candidates = result.get('candidates', [])
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                for part in parts:
                    if 'inlineData' in part:
                        # part['inlineData']['data'] is already base64 string
                        return part['inlineData']['data']
            
            print("Gemini TTS: No audio data found in response.")
            return None
        else:
            print(f"Gemini TTS Error {response.status_code}: {response.text}")
            return None

    except Exception as e:
        print(f"Gemini TTS Generation Error: {e}")
        return None
