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
  set
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  listAll
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";
import {
  collection,
  getFirestore,
  getDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
const storage = getStorage(app);
const db = getDatabase(app);
const firestoreDb = getFirestore(app);

const alertContainer = document.querySelector(".alertContainer"),
closeAlert = document.getElementById("closeAlert"),
alertText = document.getElementById("alertText");

function customAlert(message) {
  alertText.innerText = message;
  alertContainer.style.display = 'grid';
}

closeAlert.addEventListener("click", () => {
  alertContainer.style.display = "none";
});

// Helper function to decrypt data
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

// Helper function to encrypt data
function encryptData(data, secretKey) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return iv.toString(CryptoJS.enc.Hex) + encrypted.toString();
}

async function retrieveSessionId(userId) {
  const sessionRef = doc(firestoreDb, `User_Sessions/${userId}`);
  try {
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists()) {
      return sessionDoc.data().sessionId;
    } else {
      return null;
    }
  } catch (error) {
    customAlert('Error retrieving session ID:', error);
    return null;
  }
}

async function getUserDetails(uid) {
  const userRef = databaseRef(db, `Users_Database/${uid}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
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

// Select elements for editing
const editTab = document.getElementById("editTab");
const inputField = document.getElementById("inputId");
const saveButton = document.getElementById("saveFileNameButton");

function openEditTab(field, uid, secretKey) {
  editTab.style.display = "grid";
  inputField.placeholder = `Enter new ${field}...`;

  saveButton.onclick = async () => {
    const newValue = inputField.value.trim();
    if (newValue) {
      const encryptedValue = encryptData(newValue, secretKey);
      const ref = databaseRef(db, `Users_Database/${uid}/${field}`);
      try {
        await set(ref, encryptedValue);
        document.getElementById(field).textContent = newValue;
        editTab.style.display = "none";
      } catch (error) {
        customAlert(`Error updating ${field} in the database: ${error.message}`);
      }
    } else {
      customAlert("Input cannot be empty.");
    }
  };
}

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const sessionId = await retrieveSessionId(user.uid);
    if (sessionId) {
      const secretKey = await retrieveSecretKey(user.uid);
      if (!secretKey) {
        customAlert("There is a problem with your account, you will be redirected to log in.");
        window.location.href = "/login/login.html";
        return;
      }
      const userDetails = await getUserDetails(user.uid);
      if (userDetails) {
        document.getElementById("spinnerBackground").style.display = "none";
        if (userDetails.profileImage) {
          const decryptedImage = decryptData(userDetails.profileImage, secretKey);
          document.querySelector(".userImage").style.backgroundImage = `url(${decryptedImage})`;
          document.getElementById('profilePhoto').style.display = "none";
        }

        const userImageDiv = document.querySelector(".userImage");
        userImageDiv.style.cursor = 'pointer';
        userImageDiv.addEventListener("click", () => {
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";

          fileInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Image = reader.result;
                const encryptedImage = encryptData(base64Image, secretKey);
                const imageRef = databaseRef(db, `Users_Database/${user.uid}/profileImage`);
                try {
                  await set(imageRef, encryptedImage);
                  userImageDiv.style.backgroundImage = `url(${base64Image})`;
                } catch (error) {
                  customAlert("Error uploading profile image:", error);
                }
              };
              reader.readAsDataURL(file);
            }
          });

          fileInput.click();
        });

        // Decrypt and display user details
        const decryptedBio = userDetails.bio ? decryptData(userDetails.bio, secretKey): "Tap to edit";
        const decryptedAge = userDetails.age ? decryptData(userDetails.age, secretKey): "Tap to edit";
        const decryptedAddress = userDetails.address ? decryptData(userDetails.address, secretKey): "Tap to edit";
        const decryptedEmail = userDetails.email ? decryptData(userDetails.email, secretKey): "Tap to edit";
        const decryptedTel = userDetails.tel ? decryptData(userDetails.tel, secretKey): "Tap to edit";
        const decryptedUsername = userDetails.username ? decryptData(userDetails.username, secretKey): "Tap to edit";

        document.getElementById("bio").textContent = decryptedBio;
        document.getElementById("age").textContent = decryptedAge;
        document.getElementById("address").textContent = decryptedAddress;
        document.getElementById("email").textContent = decryptedEmail;
        document.getElementById("telephone").textContent = decryptedTel;
        document.getElementById("username").textContent = decryptedUsername;

        document.getElementById("bio").addEventListener("click", () => openEditTab("bio",
          user.uid,
          secretKey));
        document.getElementById("age").addEventListener("click", () => openEditTab("age",
          user.uid,
          secretKey));
        document.getElementById("address").addEventListener("click", () => openEditTab("address",
          user.uid,
          secretKey));
      }
    } else {
      window.location.href = "/login/login.html"
      customAlert("Session expired. Please log in.");
    }
  } else {
    customAlert("No authenticated user. Redirecting to login.");
  }
});

// Close button to hide edit tab
document.querySelector("#editTab .fa-times").addEventListener("click", () => {
  editTab.style.display = "none";
});

document.getElementById("logOutButton").addEventListener("click", async function() {
  const user = auth.currentUser;
  if (!user) {
    customAlert("No authenticated user found.");
    return; // Stop execution if no authenticated user
  }

  async function logout() {
    try {
      const sessionRef = doc(firestoreDb, "User_Sessions", user.uid);
      await deleteDoc(sessionRef);

      // Clear all cookies
      document.cookie.split(";").forEach(cookie => {
        const [name] = cookie.split("=");
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });

      sessionStorage.removeItem("sessionUserId");

      await auth.signOut();

      // Redirect to login page only if everything succeeds
      window.location.href = "/login/login.html";
    } catch (error) {
      customAlert("Error logging out: " + error.message);
      return; // Stop further execution if error occurs
    }
  }

  // Proceed with logout if user is authenticated
  await logout();
});

document.getElementById("deleteAccount").addEventListener("click", function() {
  document.getElementById("deleteContainerCover").classList.toggle("deleteShow")
});
document.getElementById("cancelButton").addEventListener("click", function() {
  document.getElementById("deleteContainerCover").classList.remove("deleteShow")
});
document.getElementById("scheduleDelete").addEventListener("click", async () => {
    try {
        const user = firebase.auth().currentUser;
        
        if (user) {
            const deletionDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // Set to 7 days from now

            await firebase.firestore().collection("users").doc(user.uid).update({
                deletionRequested: true,
                deletionDate: deletionDate
            });

            alert("Your account is scheduled for deletion.");
        } else {
            alert("No user is logged in.");
        }
    } catch (error) {
        console.error("Error scheduling account deletion:", error);
        alert("Failed to schedule deletion. Please try again.");
    }
});