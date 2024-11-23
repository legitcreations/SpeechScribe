// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase, ref as databaseRef, get, set } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js"; // Import Firebase Database
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

import { collection, getFirestore, getDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";


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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestoreDb=getFirestore(app)
const storage = getStorage(app);
const db = getDatabase(app);

function decryptData(encryptedData, secretKey) {
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32)); // Extract IV from the first 32 hex characters
  const encrypted = encryptedData.substring(32); // Extract the actual encrypted data

  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return decrypted.toString(CryptoJS.enc.Utf8); // Return decrypted text
}
async function retrieveSessionId(userId) {
  const sessionRef = doc(firestoreDb, `User_Sessions/${userId}`);
  try {
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists()) {
      return sessionDoc.data().sessionId; // Return the session ID from Firestore
    } else {
      return null; // No session data available
    }
  } catch (error) {
    customAlert('Error retrieving session ID:', error);
    return null; // Handle errors
  }
}

async function getUserDetails(uid) {
  const userRef = databaseRef(db, `Users_Database/${uid}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val(); // Return user details
    } else {
      customAlert("No data found for the user in the database.");
      window.location.href = "/login/login.html";
      return null;
    }
  } catch (error) {
    customAlert("Error fetching user details:", error);
    return null;
  }
}

async function retrieveSecretKey(uid) {
  const secretKeyRef = doc(firestoreDb, `Users_Encryption_Keys/${uid}`);
  try {
    const secretKeyDoc = await getDoc(secretKeyRef);
    if (secretKeyDoc.exists()) {
      return secretKeyDoc.data().key;
    } else {
      customAlert("Secret key not found.");
      return null;
    }
  } catch (error) {
    customAlert("Error retrieving secret key:", error);
    return null;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const sessionId = await retrieveSessionId(user.uid);

    if (sessionId) {
      const secretKey = await retrieveSecretKey(user.uid);
      
      const userDetails = await getUserDetails(user.uid);
      if (userDetails) {
        if (userDetails.profileImage) {
          const decryptedImage = decryptData(userDetails.profileImage, secretKey);
          document.getElementById("profilePhoto").style.backgroundImage = `url(${decryptedImage})`;
        }
      }
    } 
  }

});
