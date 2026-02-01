import os
import google.generativeai as genai
from dotenv import load_dotenv
import base64

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

try:
    print("Testing TTS with simplified config...")
    model = genai.GenerativeModel('models/gemini-2.5-flash-preview-tts')
    
    # Try 2: specific modality
    print("Trying with response_modalities=['AUDIO']...")
    response = model.generate_content(
        "Hello world",
        generation_config={"response_modalities": ["AUDIO"]}
    )
    
    print("Response parts:", len(response.parts))
    for part in response.parts:
        print("Part:", part)
        if hasattr(part, 'inline_data') and part.inline_data:
            print("Found inline data!")
            # Save to file to prove it works
            with open("test_output.mp3", "wb") as f:
                f.write(part.inline_data.data)
            print("Saved test_output.mp3")

except Exception as e:
    print("Error:", e)
