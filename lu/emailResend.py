
import resend

resend.api_key = "re_D66DneLS_9pwWu3LoL3P63Mzm6HPjEYZF"

params: resend.Emails.SendParams = {
    "from": "lujie <jie.lu@tuni.fi>",
    "to": ["lujie@bfsu.edu.cn"],
    "subject": "hello world",
    "html": "<strong>is it working!</strong>",
}

email = resend.Emails.send(params)
print(email)