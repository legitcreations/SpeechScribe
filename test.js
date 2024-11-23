
    from Flask import Flask, request
import smtplib
from email.mime.text import MIMEText
import os

app = Flask(__name__)

@app.route('/')
def feedback_form():
    return '''
    <!DOCTYPE html>
    <html>
    <body>
      <form id="feedbackForm" action="/submit-feedback" method="POST" accept-charset="utf-8">
        <div>
          <strong>Feedback</strong>
          <div>
            <input type="radio" name="feedback" id="VSBQuality" value="VSBQuality" />
            <label for="VSBQuality">VSB Quality</label>
            <input type="radio" name="feedback" id="userInterface" value="userInterface" />
            <label for="userInterface">User Interface</label>
            <input type="radio" name="feedback" id="userExperience" value="userExperience" />
            <label for="userExperience">User Experience</label>
          </div>
          <div>
            <textarea placeholder="Tell us your thoughts" name="textArea" maxlength="1000"></textarea>
          </div>
          <div>
            <input placeholder="Email address" type="email" name="email" />
          </div>
        </div>
        <button type="submit">Send</button>
      </form>
    </body>
    </html>
    '''

@app.route('/submit-feedback', methods=['POST'])
def submit_feedback():
    feedback_type = request.form.get('feedback')
    feedback_text = request.form.get('textArea')
    email_address = request.form.get('email')

    sender_email = "stathamruss.co.uk@gmail.com"
    sender_password = "kvrm orbd zydq nwsu"  # Use an environment variable for security
    recipient_email = "stathamruss.co.uk@gmail.com"  # The company email receiving feedback

    subject = f"Feedback: {feedback_type}"
    body = f"""
    Feedback Type: {feedback_type}
    Feedback: {feedback_text}
    Sender Email: {email_address}
    """

    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = recipient_email

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, msg.as_string())

        return "Feedback sent successfully!"
    except Exception as e:
        return f"Failed to send feedback: {e}"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)