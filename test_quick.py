import requests

BASE_URL = "http://localhost:8000"

def test_chat():
    print("1. Creating a test user or logging in...")
    # Try to signup
    signup_data = {
        "username": "testuser_api",
        "email": "testuser_api@example.com",
        "password": "testpassword"
    }
    signup_resp = requests.post(f"{BASE_URL}/signup", json=signup_data)
    
    token = None
    if signup_resp.status_code == 200:
        token = signup_resp.json().get("access_token")
        print("   Signup successful!")
    else:
        # If already exists, login
        login_data = {
            "username": "testuser_api",
            "password": "testpassword"
        }
        login_resp = requests.post(f"{BASE_URL}/token", data=login_data)
        if login_resp.status_code == 200:
            token = login_resp.json().get("access_token")
            print("   Login successful!")
        else:
            print(f"   Failed to get token: {login_resp.text}")
            return
            
    print("\n2. Testing /chat endpoint with gemini-2.5-flash...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    chat_payload = {
        "session_id": "test-session-123",
        "message": "Hello! I am a test user. How are you?"
    }
    
    chat_resp = requests.post(f"{BASE_URL}/chat", json=chat_payload, headers=headers)
    print(f"   Status Code: {chat_resp.status_code}")
    if chat_resp.status_code == 200:
        data = chat_resp.json()
        print(f"   AI Response: {data.get('message')}")
        print(f"   Is Crisis: {data.get('suggest_hospitals')}")
    else:
        print(f"   Error: {chat_resp.text}")

if __name__ == "__main__":
    test_chat()
