import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={api_key}"

headers = {
    "Content-Type": "application/json"
}

data = {
    "contents": [{
        "parts": [{"text": "Hello, this is a direct REST API test."}]
    }],
    "generationConfig": {
        "response_modalities": ["AUDIO"]
    }
}

print("Sending REST request...")
response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    print("Success!")
    result = response.json()
    # Check for audio part
    # Structure: candidates[0].content.parts[0].inlineData
    try:
        part = result['candidates'][0]['content']['parts'][0]
        if 'inlineData' in part:
            print("Audio data received!")
        else:
            print("No audio data found:", part)
    except Exception as e:
        print("Parsing error:", e)
        print(json.dumps(result, indent=2))
else:
    print(f"Error {response.status_code}:")
    print(response.text)
