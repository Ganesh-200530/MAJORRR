import base64
import io
import os
import google.generativeai as genai
# from gtts import gTTS # Disable fallback to force Gemini

# Configure API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_speech(text: str) -> str:
    """
    Generates speech from text using the gemini-2.5-flash-preview-tts model.
    Returns base64 encoded audio.
    """
    try:
        # Initialize the specific TTS model
        model = genai.GenerativeModel('models/gemini-2.5-flash-preview-tts')
        
        # Determine strictness of the response type.
        # Often TTS models take text and return a blob.
        # We request the response.
        
        response = model.generate_content(text)
        
        # Capture audio data from the response parts
        # For non-text responses, we look at the parts
        mp3_data = None
        
        if response.parts:
            for part in response.parts:
                # Check for inline_data (blob)
                if hasattr(part, 'inline_data') and part.inline_data:
                    mp3_data = part.inline_data.data
                    break
        
        if mp3_data:
             return base64.b64encode(mp3_data).decode('utf-8')

        print("Gemini TTS: No audio data returned in response parts.")
        return None

    except Exception as e:
        print(f"Gemini TTS Generation Error: {e}")
        return None
