"""
Email Service Client using Resend

Usage:
    from backend.services.email_service.client import email_client

    # Send an email
    result = email_client.send_email(
        to="recipient@example.com",
        subject="Hello World",
        html="<p>Your HTML content here</p>"
    )

    # Send to multiple recipients
    result = email_client.send_email(
        to=["user1@example.com", "user2@example.com"],
        subject="Team Update",
        html="<h1>Important Update</h1><p>Content here...</p>"
    )

Environment Setup:
    Add RESEND_API_KEY to your .env file:
    RESEND_API_KEY=re_xxxxxxxxxxxxx
"""

import resend
from backend.config import RESEND_API_KEY


class EmailClient:
    """Email client using Resend API."""

    def __init__(self):
        resend.api_key = RESEND_API_KEY
        self.default_from = "onboarding@resend.dev"

    def send_email(self, to: str | list[str], subject: str, html: str) -> dict:
        """
        Send an email via Resend.

        Args:
            to: Recipient email address or list of addresses
            subject: Email subject line
            html: HTML content of the email

        Returns:
            dict: Response from Resend API containing the email id
        """
        return resend.Emails.send({
            "from": self.default_from,
            "to": to,
            "subject": subject,
            "html": html
        })


# Singleton instance
email_client = EmailClient()
