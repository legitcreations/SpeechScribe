import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { getFirestore, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApeufdnAhQCnsYljYchPjrh8W8Wf_YOtk",
  authDomain: "speechscribeapp.firebaseapp.com",
  projectId: "speechscribeapp",
  storageBucket: "speechscribeapp.appspot.com",
  messagingSenderId: "624877337813",
  appId: "1:624877337813:web:8a857bf46caf430318765c",
  measurementId: "G-239G8L2PGX"
};

// Firebase initialization
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const database = getDatabase(app);
const auth = getAuth(app);

// Form elements
const signupForm = document.getElementById('signupForm');
const signupButton = document.getElementById('signupButton');
const signupError = document.createElement('p');
signupError.style.color = 'red';
signupForm.appendChild(signupError);
const signupStatus = document.createElement('p');
signupStatus.style.color = 'green';
signupForm.appendChild(signupStatus);

// Password validation elements
const passwordField = document.getElementById('password');
const passwordHint = document.createElement('p');
passwordHint.style.color = 'orange';
passwordField.parentNode.insertBefore(passwordHint, passwordField.nextSibling);

// Define your password validation pattern
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!_*£¢¥~><%?&])[A-Za-z\d@$!_*£¢¥~><%?&]{8,}$/;

// Add password validation on input
passwordField.addEventListener('input', () => {
  if (!passwordPattern.test(passwordField.value)) {
    passwordHint.textContent = "Password must be 8+ characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
  } else {
    passwordHint.textContent = '';
  }
});


async function checkUsernameAndPhoneExists(username, tel) {
  const dbRef = ref(database);

  try {
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const userId in users) {
        const userKeySnapshot = await getDoc(doc(db, "Users_Encryption_Keys", userId));
        if (userKeySnapshot.exists()) {
          const secretKey = userKeySnapshot.data().key;

          // Decrypt the stored username and phone number using IV
          const decryptedUsername = decryptData(users[userId].username, secretKey);
          const decryptedTel = decryptData(users[userId].tel, secretKey);

          if (decryptedUsername === username) {
            return { exists: true, type: 'username' };
          }
          if (decryptedTel === tel) {
            return { exists: true, type: 'tel' };
          }
        }
      }
    }
    return { exists: false };
  } catch (error) {
    console.error("Error checking username or phone number:", error);
    throw error;
  }
}

function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32)); // Extract IV from the first 32 hex characters
  const encrypted = encryptedData.substring(32); // Extract the actual encrypted data

  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8); // Convert bytes to string
}

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById('email').value.trim();
  const tel = document.getElementById('tel').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  signupError.textContent = '';
  signupStatus.textContent = '';

  // Validate email format
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailPattern.test(email)) {
    signupError.textContent = "Please enter a valid email address.";
    return;
  }

  // Validate matching passwords
  if (password !== confirmPassword) {
    signupError.textContent = "Passwords do not match.";
    return;
  }

  signupButton.disabled = true;
  signupStatus.textContent = "Checking username and phone number availability...";

  try {
    const result = await checkUsernameAndPhoneExists(username, tel);
    if (result.exists) {
      signupError.textContent = result.type === 'username' ?
        "Username is already taken. Please choose another." :
        "Phone number is already in use. Please use another number.";
      signupButton.disabled = false;
      return;
    }

    signupStatus.textContent = "Signing up...";

    // Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const signUpDate = new Date().toISOString();

    // Generate a unique secret key for this user
    const secretKey = generateSecretKey(32);

    // Store the secret key in Firestore
    await storeSecretKeyForUser(user.uid, secretKey);

    // Encrypt user details using the generated secret key (with IV)
    const encryptedUsername = encryptData(username, secretKey);
    const encryptedEmail = encryptData(email, secretKey);
    const encryptedTel = encryptData(tel, secretKey);

    // Save encrypted user details to the Realtime Database
    await set(ref(database, 'Users_Database/' + user.uid), {
      uid: user.uid,
      username: encryptedUsername,
      email: encryptedEmail,
      tel: encryptedTel,
      signupDate: signUpDate
    });

    signupStatus.textContent = "User data saved to database";

    // Set cookies, session storage, and local storage after user creation
    setCookie('userId', user.uid, 7); // Cookie for user ID, 7 days expiry
    setSessionStorage('sessionUserId', user.uid); // Store user ID for this session
    setLocalStorage('userAccount', user.uid); // Store user ID in local storage

    signupStatus.textContent = "Signup successful! Redirecting to login page...";
    setTimeout(() => {
      window.location.href = "/login/login.html";
    }, 2000);

  } catch (error) {
    signupError.textContent = error.message
    signupStatus.textContent = "";
  } finally {
    signupButton.disabled = false;
  }
});

function generateSecretKey(length = 32) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array).map((byte) => ('0' + byte.toString(16)).slice(-2)).join('');
}

async function storeSecretKeyForUser(userId, secretKey) {
  try {
    await setDoc(doc(db, "Users_Encryption_Keys", userId), {
      key: secretKey,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error storing secret key:", error);
    throw error;
  }
}

function encryptData(data, secretKey) {
  const iv = CryptoJS.lib.WordArray.random(16); // Generate random IV (16 bytes)
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString() + encrypted.toString();
}

function setCookie(cookieName, cookieValue, daysToExpire) {
  const date = new Date();
  date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
  document.cookie = `${cookieName}=${cookieValue};expires=${date.toUTCString()};path=/`;
}

function setSessionStorage(key, value) {
  sessionStorage.setItem(key, value);
}

function setLocalStorage(key, value) {
  localStorage.setItem(key, value);
}