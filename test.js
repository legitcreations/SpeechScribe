/
const signupForm = document.getElementById('signupForm');
const signupButton = document.getElementById('signupButton');

const signupError = document.createElement('p');
signupError.style.color = 'red';
signupForm.appendChild(signupError);

const signupStatus = document.createElement('p');
signupStatus.style.color = 'green';
signupForm.appendChild(signupStatus);

// Password validation
const passwordField = document.getElementById('password');
const passwordHint = document.createElement('p');
passwordHint.style.color = 'orange';
passwordField.parentNode.insertBefore(passwordHint, passwordField.nextSibling);

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!_*£¢¥~><%?&])[A-Za-z\d@$!_*£¢¥~><%?&]{8,}$/;

passwordField.addEventListener('input', () => {
  if (!passwordPattern.test(passwordField.value)) {
    passwordHint.textContent = "Password must be 8+ chars, include uppercase, lowercase, number, and special char.";
  } else {
    passwordHint.textContent = '';
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  signupButton.disabled = true;
  signupStatus.textContent = "Running reCAPTCHA check...";
  signupError.textContent = "";
  
  const username = document.getElementById("username").value.trim().toLowerCase();
  const email = document.getElementById("email").value.trim();
  const tel = document.getElementById("tel").value.trim().replace(/\D/g, '');
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  
  try {
    // Basic validation
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) throw new Error("Please enter a valid email address.");
    if (password !== confirmPassword) throw new Error("Passwords do not match.");
    if (!passwordPattern.test(password)) throw new Error("Password does not meet strength requirements.");
    
    // reCAPTCHA v3 execution
    
    grecaptcha.enterprise.ready(async () => {
      const token = await grecaptcha.enterprise.execute('6Lf8f1crAAAAAFdWZ4v-vjvuRi9iwNIIwBAN3uFR', { action: 'signup' });
      
      const res = await fetch('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          tel,
          password,
          recaptchaToken: token
        })
      })
    });
    
    signupStatus.textContent = "Creating your account...";
    
    // Call backend /signup
    ;
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || "Signup failed.");
    }
    
    signupStatus.textContent = "Signup successful! Redirecting...";
    setTimeout(() => {
      window.location.href = "SpeechScribe_Frontend/src/pages/auth/login.html";
    }, 2000);
    
  } catch (err) {
    signupError.textContent = err.message;
    signupStatus.textContent = "";
    console.error("Signup error:", err);
  } finally {
    signupButton.disabled = false;
  }
})