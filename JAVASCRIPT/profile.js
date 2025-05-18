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
	set
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import {
	getFirestore,
	doc,
	getDoc,
	setDoc
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

// ========== userProfile ==========
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
		const encrypted = CryptoUtils.encrypt(newValue, key);
		await set(databaseRef(db, `Users_Database/${uid}/${field}`), encrypted);
	}
	
	async function logError(uid, error) {
		try {
			await setDoc(doc(firestore, "Error_Logs", `${uid}_${Date.now()}`), {
				uid,
				message: error.message || "Unknown error",
				stack: error.stack || "No stack",
				time: new Date().toISOString()
			});
		} catch (err) {
			console.error("Logging error failed:", err);
		}
	}
	
	return {
		getSessionId,
		getEncryptionKey,
		getUserData,
		updateEncryptedField,
		logError
	};
})(auth, db, firestore);

// ========== main ==========
onAuthStateChanged(auth, async user => {
	if (!user) return redirectToSignUp();
	
	try {
		UIHandlers.showSpinner(true);
		await user.getIdToken(true); // Force refresh token
		
		const sessionId = await UserProfile.getSessionId(user.uid);
		if (!sessionId) return redirectToLogin("Session expired.");
		
		const key = await UserProfile.getEncryptionKey(user.uid);
		if (!key) return redirectToLogin("Key missing or corrupted.");
		
		const data = await UserProfile.getUserData(user.uid);
		if (!data) return redirectToLogin("No user data found.");
		
		bindProfileData(data, key, user.uid);
		UIHandlers.showSpinner(false);
	} catch (error) {
		UIHandlers.showAlert("An error occurred while loading profile.");
		await UserProfile.logError(user?.uid || "unknown", error);
		console.error(error);
		UIHandlers.showSpinner(false);
	}
});

function redirectToLogin(message) {
	UIHandlers.showAlert(message);
	setTimeout(() => window.location.href = "/login/login.html", 1500);
}

function redirectToSignUp() {
	UIHandlers.showAlert("You must be signed in.");
	setTimeout(() => window.location.href = "/join/signup.html", 1500);
}

function bindProfileData(data, key, uid) {
	const editableFields = ["bio", "age", "address"];
	const readonlyFields = ["email", "tel", "username"]; // Updated key
	
	[...editableFields, ...readonlyFields].forEach(field => {
		const el = document.getElementById(field);
		if (!el) return;
		
		let value;
		if (data[field]) {
			value = CryptoUtils.decrypt(data[field], key, `${uid}_${field}`);
		} else if (field === 'phone_number' && data['telephone']) { // Handle potential old key
			value = CryptoUtils.decrypt(data['telephone'], key, `${uid}_telephone`);
		}
		else {
			value = "Tap to edit";
		}
		el.textContent = value;
		
		// LOGGING email, telephone, and username
		if (readonlyFields.includes(field)) {
			console.log(`Raw ${field} data:`, data[field]); // Add this line
			const value = data[field] ? CryptoUtils.decrypt(data[field], key, `${uid}_${field}`) : "Tap to edit";
			el.textContent = value;
		}
		
		if (editableFields.includes(field)) {
			el.addEventListener("click", () => showEditField(el, field, uid, key));
		}
	});
	
	// Profile Image (rest of the function remains the same)
	if (data.profileImage) {
		const decryptedImage = CryptoUtils.decrypt(data.profileImage, key, `${uid}_profileImage`);
		const userImage = document.querySelector(".userImage");
		if (userImage) {
			userImage.style.backgroundImage = `url(${decryptedImage})`;
			document.getElementById("profilePhoto").style.display = "none";
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
		const newValue = inputBox.value.trim();
		if (!newValue) return UIHandlers.showAlert("Input cannot be empty.");
		
		if (field === "age" && (isNaN(newValue) || newValue < 1 || newValue > 120))
			return UIHandlers.showAlert("Please enter a valid age.");
		
		if (field === "bio" && newValue.length < 5)
			return UIHandlers.showAlert("Bio must be at least 5 characters.");
		
		if (field === "address" && newValue.length < 5)
			return UIHandlers.showAlert("Please enter a valid address.");
		
		try {
			await UserProfile.updateEncryptedField(uid, field, newValue, key);
			el.textContent = newValue;
			document.getElementById("editTab").style.display = "none";
		} catch (error) {
			UIHandlers.showAlert("Error updating field.");
			await UserProfile.logError(uid, error);
			console.error(error);
		}
	};
}

document.getElementById("closeEditTab").addEventListener('click', () => {
	document.getElementById("editTab").style.display = "none";
});

// Profile Photo Upload
document.getElementById("profilePhoto").addEventListener("click", () => {
	document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", async function() {
	const file = this.files[0];
	if (!file) return;
	
	const reader = new FileReader();
	reader.onload = async function(e) {
		const base64Image = e.target.result;
		try {
			const user = auth.currentUser;
			if (!user) return UIHandlers.showAlert("Not authenticated");
			
			const key = await UserProfile.getEncryptionKey(user.uid);
			const encryptedImage = CryptoUtils.encrypt(base64Image, key);
			
			// Save it to Realtime Database just like other fields
			await UserProfile.updateEncryptedField(user.uid, "profileImage", base64Image, key); // store base64Image encrypted
			
			// Update UI
			const userImage = document.querySelector(".userImage");
			if (userImage) {
				userImage.style.backgroundImage = `url(${base64Image})`;
			}
			document.getElementById("profilePhoto").style.display = "none";
			
		} catch (error) {
			UIHandlers.showAlert("Error uploading image");
			await UserProfile.logError(auth.currentUser?.uid || "unknown", error);
			console.error(error);
		}
	};
	reader.readAsDataURL(file);
});