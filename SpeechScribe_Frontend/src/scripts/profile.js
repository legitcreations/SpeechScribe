// ========== firebaseConfig ==========
import {
 initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
 getAuth,
 onAuthStateChanged,
 signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

import {
 getDatabase,
 ref as databaseRef,
 get,
 set,
 update,
 remove
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

import {
 getStorage,
 ref as storageRef,
 uploadBytes,
 getDownloadURL,
 deleteObject
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

import {
 getFirestore,
 doc,
 getDoc,
 setDoc,
 addDoc,
 collection
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
const storage = getStorage(app);

// ========== cryptoUtils ==========
const CryptoUtils = (() => {
 const cache = new Map();
 
 function encrypt(data, key) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
   iv,
   mode: CryptoJS.mode.CBC,
   padding: CryptoJS.pad.Pkcs7
  });
  return iv.toString(CryptoJS.enc.Hex) + encrypted.toString();
 }
 
 function decrypt(encryptedData, key, fieldKey = null) {
  if (fieldKey && cache.has(fieldKey)) return cache.get(fieldKey);
  const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32));
  const encrypted = encryptedData.substring(32);
  const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(key), {
   iv,
   mode: CryptoJS.mode.CBC,
   padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
  if (fieldKey) cache.set(fieldKey, decrypted);
  return decrypted;
 }
 
 return { encrypt, decrypt };
})();

// ========== uiHandlers ==========
const UIHandlers = (() => {
 const alertContainer = document.querySelector(".alertContainer");
 const closeAlert = document.getElementById("closeAlert");
 const alertText = document.getElementById("alertText");
 
 closeAlert.addEventListener("click", () => alertContainer.style.display = "none");
 
 function showAlert(msg) {
  alertText.innerText = msg;
  alertContainer.style.display = "grid";
 }
 
 function showSpinner(show) {
  const spinner = document.getElementById("spinnerBackground");
  if (spinner) spinner.style.display = show ? "grid" : "none";
 }
 
 return { showAlert, showSpinner };
})();

// ======= userProfile ==========
const UserProfile = ((auth, db, firestore) => {
 async function getSessionId(uid) {
  const docRef = doc(firestore, "User_Sessions", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().sessionId : null;
 }
 
 async function getEncryptionKey(uid) {
  const docRef = doc(firestore, "Users_Encryption_Keys", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().key : null;
 }
 
 async function getUserData(uid) {
  const ref = databaseRef(db, `Users_Database/${uid}`);
  const snapshot = await get(ref);
  return snapshot.exists() ? snapshot.val() : null;
 }
 
 async function updateEncryptedField(uid, field, newValue, key) { 
  if (!newValue) throw new Error("New value cannot be empty.");
  const encryptedValue = CryptoUtils.encrypt(newValue, key);
  const ref = databaseRef(db, `Users_Database/${uid}`);
  await update(ref, {
   [field]: encryptedValue });
 }
 
 async function logError(uid, error) {
  try {
   await addDoc(collection(firestore, "Error_Logs"), {
    uid,
    message: error.message || "Unknown error",
    stack: error.stack || "No stack trace",
    time: new Date().toISOString()
   });
  } catch (err) {
   console.error("Logging error failed:", err);
  }
 }
 
 return { getSessionId, getEncryptionKey, getUserData, updateEncryptedField, logError };
})(auth, db, firestore);

// ======= main =======
onAuthStateChanged(auth, async (user) => {
 if (!user) return redirectToSignUp();
 try {
  const uid = user.uid;
  
  // Ensure there's only one event listener for this button
  let deleteProfilePhotoButtonExists;
  if (!deleteProfilePhotoButtonExists) {
   document.getElementById("deleteProfilePhotoButton").addEventListener("click", async () => {
    UIHandlers.showSpinner(true);
    await deleteProfileImage(uid);
    UIHandlers.showSpinner(false);
   });
   deleteProfilePhotoButtonExists = true; // Flag indicating listener has been added once.
  }
  
  UIHandlers.showSpinner(true);
  await user.getIdToken(true);
  
  const sessionId = await UserProfile.getSessionId(uid);
  if (!sessionId) return redirectToLogin("Session expired.");
  
  const key = await UserProfile.getEncryptionKey(uid);
  if (!key) return redirectToLogin("Key missing or corrupted.");
  
  const data = await UserProfile.getUserData(uid);
  if (!data) return redirectToLogin("No user data found.");
  
  bindProfileData(data, key, uid);
  
 } catch (error) {
  // Centralized error showing and logging
  await handleError(user?.uid || 'unknown', error);
 } finally {
  UIHandlers.showSpinner(false);
 }
});

async function handleError(uidOrMessage, error) {
 UIHandlers.showAlert("An error occurred while loading profile.");
 await UserProfile.logError(uidOrMessage, error);
 console.error(error);
}

function redirectToLogin(message) {
 UIHandlers.showAlert(message);
 setTimeout(() => window.location.href = "/SpeechScribe_Frontend/src/pages/auth/login.html", 1500);
}

function redirectToSignUp() {
 UIHandlers.showAlert("You must be signed in.");
 setTimeout(() => window.location.href = "/SpeechScribe_Frontend/src/pages/auth/signup.html", 1500);
}

function bindProfileData(data, key, uid) {
 
 const editableFields = ["bio", "age", "address"];
 const readonlyFields = ["email", "tel", "username"];
 
 [...editableFields, ...readonlyFields].forEach(field => {
  
  const el = document.getElementById(field);
  if (!el) return;
  
  let value;
  if (data[field]) {
   value = CryptoUtils.decrypt(data[field], key, `${uid}_${field}`);
  } else if (field === 'phone_number' && data['telephone']) {
   value = CryptoUtils.decrypt(data['telephone'], key, `${uid}_telephone`);
  } else {
   value = "Tap to edit";
  }
  el.textContent = value;
  
  //Update readonly fields properly and safely.
  if (readonlyFields.includes(field)) {
   el.textContent = (data[field] ? CryptoUtils.decrypt(data[field], key, `${uid}_${field}`) : "Tap to edit");
  }
  
  // Add click event for editable fields.
  if (editableFields.includes(field)) {
   el.addEventListener("click ", () => showEditField(el, field, uid, key));
  }
 });
 
 if (data.profileImageURL) {
  const decryptedURL = CryptoUtils.decrypt(data.profileImageURL, key, `${uid}_profileImageURL`);
  const userImage = document.querySelector(".userImage");
  if (userImage) {
   userImage.style.backgroundImage = `url(${decryptedURL})`;
   document.getElementById("profilePhotoIcon").style.display = "none";
  }
 }
}

function showEditField(el, field, uid, key) {
 
 const inputBox = document.getElementById("inputId");
 const editTab = document.getElementById("editTab");
 const saveBtn = document.getElementById("saveFileNameButton");
 
 if (!inputBox || !editTab || !saveBtn) return;
 
 inputBox.value = "";
 inputBox.placeholder = `Enter new ${field}...`;
 editTab.style.display = "grid";
 
 saveBtn.onclick = async () => {
  try {
   const newValue = inputBox.value.trim();
   await validateInput(field, newValue);
   await UserProfile.updateEncryptedField(uid, field, newValue, key);
   el.textContent = newValue;
   editTab.style.display = "none";
  } catch (error) {
   handleError(uid, error);
  }
 };
}

async function validateInput(field, newValue) {
 if (!newValue) {
  throw new Error('Input cannot be empty');
 }
 if (field === "age" && (isNaN(newValue) || newValue < 1 || newValue > 120)) {
  throw new Error('Please enter a valid age.');
 }
 if (field === "bio" && newValue.length < 5) {
  throw new Error('Bio must be at least 5 characters.');
 }
 if (field === "address" && newValue.length < 5) {
  throw new Error('Please enter a valid address.');
 }
}

// Close edit tab handler.
document.getElementById("closeEditTab").addEventListener('click', () => {
 document.getElementById("editTab").style.display = "none";
});

// Profile Photo Upload Logic
document.getElementById("profilePhotoIcon").addEventListener("click", () => {
 document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", async function() {
 const file = this.files[0];
 if (!file) return;
 
 try {
  const currentUser = auth.currentUser;
  if (!currentUser) {
   UIHandlers.showAlert('Not authenticated');
   return;
  }
  
  const uid = currentUser.uid;
  const key = await UserProfile.getEncryptionKey(uid);
  if (!key) {
   UIHandlers.showAlert('Encryption key not found');
   return;
  }
  
  const imageRef = storageRef(storage, `Profile_Images/${uid}`);
  const snapshot = await uploadBytes(imageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  console.log("Upload successful, downloadURL:", downloadURL);
  
  const encryptedURL = CryptoUtils.encrypt(downloadURL, key);
  const userDbPath = databaseRef(db, `Users_Database/${uid}`);
  await update(userDbPath, { profileImageURL: encryptedURL });
  
  updateUIAfterUpload(downloadURL);
  UIHandlers.showAlert('Profile image uploaded successfully');
  
 } catch (error) {
  await handleError(auth.currentUser?.uid || 'unknown', error);
 }
 
 this.value = null;
});

function updateUIAfterUpload(downloadURL) {
 console.log(">> updateUIAfterUpload() called");
 const userImage = document.querySelector('.userImage');
 if (userImage) {
  userImage.style.backgroundImage = `url(${downloadURL})`;
  document.getElementById('profilePhotoIcon').style.display = 'none';
  console.log(`>> Image Updated to: ${downloadURL}`);
 }
}

async function deleteProfileImage(uid) {
 try {
  const userDbPath = `Users_Database/${uid}`;
  const userStPath = `Profile_Images/${uid}`;
  await update(databaseRef(db, userDbPath), { profileImageURL: null });
  const imageRef = storageRef(storage, userStPath)
  await deleteObject(imageRef)
  UIHandlers.showAlert('Profile image deleted successfully');
 } catch (error) {
  UIHandlers.showAlert('Failed to delete Profile image');
  await UserProfile.logError(uid, error);
  console.error(error.message);
 }
}