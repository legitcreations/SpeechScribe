// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getDatabase, ref as databaseRef, get, set} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js"; // Import Firebase Database
import { getStorage, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

import { collection, getFirestore, getDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

import { FirebasePaths } from '/SpeechScribe_Frontend/src/assets/firebasePaths.js'

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
const firestoreDb = getFirestore(app)
const db = getDatabase(app);

const alertContainer = document.querySelector(".alertContainer");
const closeAlert = document.getElementById("closeAlert");
const alertText = document.getElementById("alertText");

function customAlert(message) {
	alertText.innerText = message;
	alertContainer.style.display = 'grid';
};

function decryptData(encryptedData, secretKey) {
	const iv = CryptoJS.enc.Hex.parse(encryptedData.substring(0, 32)); // Extract IV
	const encrypted = encryptedData.substring(32); // Extract encrypted content
	
	const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(secretKey), {
		iv: iv,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7
	});
	
	return decrypted.toString(CryptoJS.enc.Utf8);
}

async function getUserDetails(userId) {
	const userRef = databaseRef(db, FirebasePaths.userDatabaseDoc(userId));
	try {
		const snapshot = await get(userRef);
		if (snapshot.exists()) {
			return snapshot.val();
		} else {
			customAlert("No data found for the user in the database.");
			setTimeout(() => {
				window.location.href = "/SpeechScribe_Frontend/src/pages/auth/login.html";
			}, 4000);
			return null;
		}
	} catch (error) {
		console.error('Error fetching user details:', error.message);
		customAlert(`Error fetching user details: ${error.message}`);
		return null;
	}
}

async function retrieveSecretKey(userId) {
	const secretKeyRef = doc(firestoreDb, FirebasePaths.userEncryptionDoc(userId))
	
	try {
		const secretKeyDoc = await getDoc(secretKeyRef);
		if (secretKeyDoc.exists()) {
			const key = secretKeyDoc.data().key;
			return key;
		}
		else {
			return null;
		}
	} catch (error) {
		console.error("Error retrieving secret key:", error);
		customAlert(`Error retrieving secret key: ${error.message}`);
		return null;
	}
}

async function retrieveSessionId(userId) {
	const sessionRef = doc(firestoreDb, FirebasePaths.userSession(userId));
	
	try {
		const sessionDoc = await getDoc(sessionRef);
		if (sessionDoc.exists()) {
			return sessionDoc.data().sessionId;
		} else {
			console.error('No session ID found');
			setTimeout(() => {
				window.location.href = "/SpeechScribe_Frontend/src/pages/auth/login.html";
			}, 3000);
			return null;
		}
	} catch (error) {
		console.error('Error retrieving session ID:', error.message);
		customAlert(`Error retrieving session ID: ${error.message}`);
		return null;
	}
}

onAuthStateChanged(auth, async (user) => {
	if (user) {
		
		const [sessionId, secretKey, userDetails] = await Promise.all([
			retrieveSessionId(user.uid),
			retrieveSecretKey(user.uid),
			getUserDetails(user.uid)
		]);
		
		if (!sessionId || !secretKey || !userDetails) {
			customAlert("Session expired or incomplete data. Redirecting...");
			setTimeout(() => {
				window.location.href = "/SpeechScribe_Frontend/src/pages/auth/login.html";
			}, 4000);
			return;
		}
		
	
		
		
		if (userDetails.profileImageURL) {
	const decryptedImage = decryptData(userDetails.profileImageURL, secretKey);
	
	const img = new Image();
	img.src = decryptedImage;
	img.onload = () => {
		document.getElementById("profilePhoto").style.backgroundImage = `url(${decryptedImage})`;
	};
	img.onerror = () => {
		console.warn("Failed to load profile image");
	};
}



	}
});

