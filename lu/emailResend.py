
import resend

resend.api_key = "re_D66DneLS_9pwWu3LoL3P63Mzm6HPjEYZF"

# the email to resend must be verified before it can be used as a sender
# we can only send testing emails to our own email address linked to resend account
params: resend.Emails.SendParams = {
    "from": "delivered@resend.dev",
    "to": ["lujie@bfsu.edu.cn"],
    "subject": "hello world",
    "html": "<strong>is it working again!</strong>",
}

email = resend.Emails.send(params)
print(email)