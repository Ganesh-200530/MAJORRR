import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from backend.main import app

client = TestClient(app)

# Mock the chat service response to avoid real API calls during tests
@pytest.fixture
def mock_chat_service():
    with patch("backend.main.get_chat_response", new_callable=AsyncMock) as mock:
        yield mock

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to your AI Mental Health Friend API"}

def test_chat_normal_response(mock_chat_service):
    # Setup mock
    mock_chat_service.return_value = {
        "response": "Hello friend! How are you?",
        "is_crisis": False
    }

    payload = {"session_id": "test_user_1", "message": "Hi there"}
    response = client.post("/chat", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello friend! How are you?"
    assert data["suggest_hospitals"] is False
    assert data["hospital_data"] is None

def test_chat_crisis_response(mock_chat_service):
    # Setup mock for crisis
    mock_chat_service.return_value = {
        "response": "Please stay safe.",
        "is_crisis": True
    }

    payload = {"session_id": "test_user_1", "message": "I feel like hurting myself"}
    response = client.post("/chat", json=payload)

    assert response.status_code == 200
    data = response.json()
    
    # Check that message includes the appeneded safety text
    assert "Please stay safe." in data["message"]
    assert "nearby hospitals" in data["message"] 
    
    assert data["suggest_hospitals"] is True
    assert len(data["hospital_data"]) > 0
    assert data["hospital_data"][0]["name"] == "City General Hospital"
