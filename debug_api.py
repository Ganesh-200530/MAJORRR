import requests
import json
import time

print("Testing Backend API at http://localhost:8000/chat ...")

url = "http://localhost:8000/chat"
headers = {"Content-Type": "application/json"}
data = {
    "session_id": "debug-test",
    "message": "Hello, are you working?"
}

try:
    start_time = time.time()
    response = requests.post(url, headers=headers, json=data)
    end_time = time.time()
    
    print(f"Status Code: {response.status_code}")
    print(f"Time Taken: {end_time - start_time:.2f}s")
    
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
        
        # Check audio
        resp_data = response.json()
        if resp_data.get('audio_base64'):
             print(f"Audio received: Yes ({len(resp_data['audio_base64'])} bytes)")
        else:
             print("Audio received: No")
    else:
        print(f"Error Response: {response.text}")

except Exception as e:
    print(f"Request Error: {e}")
