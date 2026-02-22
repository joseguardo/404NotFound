"""
Test script for the Email Service

Run with:
    python -m backend.services.email_service.test_email
"""

from backend.services.email_service.client import email_client


def test_send_email(to: str = "joseguardomedina@gmail.com"):
    """
    Test sending a simple email.

    Note: With the sandbox domain (onboarding@resend.dev), you can only send
    to your verified email. To send to other recipients like jose@kiboventures.com,
    verify a domain at resend.com/domains and update the default_from in the client.
    """
    result = email_client.send_email(
        to=to,
        subject="Test Email from 404NotFound",
        html="""
        <h1>Test Email</h1>
        <p>This is a test email from the <strong>404NotFound</strong> email service.</p>
        <p>If you received this, the email service is working correctly!</p>
        """
    )
    print(f"Email sent successfully! Response: {result}")
    return result


if __name__ == "__main__":
    test_send_email()
