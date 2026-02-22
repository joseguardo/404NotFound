"""Test script to make a phone call with the AI Phone Agent."""
import requests

# API endpoint
API_URL = "http://localhost:8000/api/phone/call"

# Call configuration
call_config = {
    "phone_number": "+34656552042",
    "callee_name": "Jose",
    "agent_name": "Mom",
    "organization": "Home",
    "action": "Remind Jose that he needs to clean his room today before dinner.",
    "context": """
- Jose's room is very messy with clothes on the floor
- Dinner is at 7pm tonight
- If he doesn't clean it, no dessert
- Also remind him to take out the trash
"""
}


def make_test_call():
    """Make a test call to the configured phone number."""
    print("=" * 60)
    print("AI PHONE AGENT - TEST CALL")
    print("=" * 60)
    print(f"\nCalling: {call_config['phone_number']}")
    print(f"Callee: {call_config['callee_name']}")
    print(f"Agent: {call_config['agent_name']} from {call_config['organization']}")
    print(f"\nAction: {call_config['action'][:100]}...")
    print("\n" + "-" * 60)

    try:
        response = requests.post(API_URL, json=call_config)
        response.raise_for_status()

        result = response.json()
        print("\n✅ CALL INITIATED SUCCESSFULLY!")
        print(f"   Call SID: {result.get('call_sid', 'N/A')}")
        print(f"   Status: {result.get('status', 'N/A')}")
        print("\n" + "=" * 60)
        return result

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to the server")
        print("   Make sure the FastAPI server is running on port 8000")
        return None

    except requests.exceptions.HTTPError as e:
        print(f"\n❌ ERROR: {e}")
        print(f"   Response: {e.response.text}")
        return None


if __name__ == "__main__":
    make_test_call()
