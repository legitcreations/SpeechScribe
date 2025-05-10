import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js"; // Import Firebase Database
import { getFirestore, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyApeufdnAhQCnsYljYchPjrh8W8Wf_YOtk",
  authDomain: "speechscribeapp.firebaseapp.com",
  projectId: "speechscribeapp",
  storageBucket: "speechscribeapp.appspot.com",
  messagingSenderId: "624877337813",
  appId: "1:624877337813:web:8a857bf46caf430318765c",
  measurementId: "G-239G8L2PGX"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);
const firestoreDb = getFirestore(app)
const mainDocument = document.getElementById('mainDocument');
const loginButton = document.getElementById('verifyButton');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const loginError = document.createElement('p');
loginError.style.color = 'red';
loginForm.appendChild(loginError);
function generateSessionId() {
  return Math.random().toString(36).substr(2, 16);
}

function encryptData(data, secretKey) {
  const iv = CryptoJS.lib.WordArray.random(16); 
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString() + encrypted.toString();
}
function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32));
  const encrypted = encryptedData.substring(32); 
  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decrypted.toString(CryptoJS.enc.Utf8); 
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
function setSessionStorage(key, value) {
  sessionStorage.setItem(key, value);
}
function setLocalStorage(key, value) {
  localStorage.setItem(key, value);
}


loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailField.value.trim();
  const password = passwordField.value.trim();
  loginError.textContent = '';
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  
  // First, try to sign in the user
  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      
      try {
        // If the email is correct, we now need to check the password
        const secretKeySnapshot = await getDoc(doc(firestoreDb, "Users_Encryption_Keys", user.uid));
        if (!secretKeySnapshot.exists()) {
          throw new Error("Secret key not found.");
        }
        const secretKey = secretKeySnapshot.data().key;
        const encryptedEmail = encryptData(email, secretKey);
        const userRef = ref(rtdb, 'Users_Database/' + user.uid);
        const userSnapshot = await get(userRef);
        
        if (!userSnapshot.exists()) {
          throw new Error("User not found.");
        }
        const storedEncryptedEmail = userSnapshot.val().email;
        const decryptedStoredEmail = decryptData(storedEncryptedEmail, secretKey);
        
        if (decryptedStoredEmail === email) {
          // The email matches, so we create a session ID
          const sessionId = generateSessionId();
          await setDoc(doc(firestoreDb, "User_Sessions", user.uid), {
            sessionId: sessionId,
            lastLogin: new Date().toISOString()
          });
          setCookie('sessionId', sessionId, 7);
          setSessionStorage('sessionUserId', user.uid);
          setLocalStorage('userAccount', user.uid);
          window.location.href = "/index.html";
        } else {
          loginError.textContent = "Login failed: Email does not match.";
        }
      } catch (error) {
          loginError.textContent = `Login failed: ${error.message}`;
      }
    })
    .catch((error) => {
        loginError.textContent = ` Login failed: ${error.message}`;
    })
    .finally(() => {
      loginButton.disabled = false;
      loginButton.textContent = 'Log in';
    });
});