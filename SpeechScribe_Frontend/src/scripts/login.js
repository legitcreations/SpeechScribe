import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase, ref as dbRef, get } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { getFirestore, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { FirebasePaths } from '/SpeechScribe_Frontend/src/assets/firebasePaths.js';

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
const db = getDatabase(app);
const firestore = getFirestore(app);

// Form elements
const loginForm = document.getElementById('loginForm');
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
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString() + encrypted.toString();
}

function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32));
  const encrypted = encryptedData.substring(32);
  try {
    return CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function setSessionStorage(key, value) {
  sessionStorage.setItem(key, value);
}

function setLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailField.value.trim();
  const password = passwordField.value.trim();
  
  loginError.textContent = '';
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const secretKeySnap = await getDoc(doc(firestore, FirebasePaths.userEncryptionDoc(user.uid)));
    if (!secretKeySnap.exists()) throw new Error("Encryption key not found.");
    
    const secretKey = secretKeySnap.data().key;
    const userDbRef = dbRef(db, FirebasePaths.userDatabaseDoc(user.uid));
    const userSnapshot = await get(userDbRef);
    
    if (!userSnapshot.exists()) throw new Error("User data not found.");
    
    const decryptedStoredEmail = decryptData(userSnapshot.val().email, secretKey);
    if (decryptedStoredEmail !== email) {
      throw new Error("Decrypted email mismatch.");
    }
    
    const sessionId = generateSessionId();
    await setDoc(doc(firestore, FirebasePaths.userSession(user.uid)), {
      sessionId,
      lastLogin: new Date().toISOString()
    });
    
    setCookie('sessionId', sessionId, 7);
    setSessionStorage('sessionUserId', user.uid);
    setLocalStorage('userAccount', user.uid);
    
    window.location.href = "/SpeechScribe_Frontend/Public/index.html";
  } catch (error) {
    loginError.textContent = `Login failed: ${error.message}`;
    console.error(error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Log in';
  }
});