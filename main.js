import {
	initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
	getFirestore,
	doc,
	setDoc,
	collection,
	addDoc,
	getDocs,
	serverTimestamp,
	getDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";
import {
	getDatabase,
	ref as databaseRef,
	get
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

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
const firestoreDb = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app);

const alertContainer = document.querySelector(".alertContainer"),
	closeAlert = document.getElementById("closeAlert"),
	alertText = document.getElementById("alertText"),
	downloadContainer = document.querySelector(".downloadContainer"),
	startButton = document.getElementById('startRecording'),
	pauseButton = document.getElementById('pauseRecording'),
	stopButton = document.getElementById('stopRecording'),
	recordTimeCounter = document.querySelector('.recordTimeCounter'),
	svgPath1 = document.getElementById("svgPath1"),
	svgPath2 = document.getElementById("svgPath2"),
	buttonBorder2 = document.querySelector(".buttonBorder2"),
	toggleMenuButton = document.getElementById("toggleMenuButton"),
	saveRecordingButton = document.getElementById("saveRecordingButton"),
	cancelRecordingButton = document.getElementById("cancelRecordingButton"),
	menuContainer = document.querySelector(".menuContainer"),
	menuOverlay = document.getElementById("menuOverlay"),
	canvas = document.getElementById("visualizerCanvas"),
	profilePage = document.getElementById("profilePage"),
	canvasCtx = canvas.getContext("2d");
closeAlert.addEventListener("click", () => {
	alertContainer.style.display = "none";
});

function customAlert(message) {
	alertText.innerText = message;
	alertContainer.style.display = 'grid';
};
const user = auth.currentUser;
window.addEventListener("DOMContentLoaded", () => {
	
	const searchRecordingContainer = document.querySelector(".searchRecordingContainer")
	searchRecordingContainer.addEventListener("click", function() {
		window.location.href = "/HTML/recordings.html?search=1";
	})
	
	async function countUserRecordings() {
		if (!auth.currentUser) return;
		
		const thisUserRecordingsRef = collection(firestoreDb, 'Users_Recordings', auth.currentUser.uid, 'recordings');
		
		try {
			const querySnapshot = await getDocs(thisUserRecordingsRef);
			const count = querySnapshot.size;
			const recordedFilesCountElement = document.getElementById("recordedFilesCount");
			
			recordedFilesCountElement.style.display = count > 0 ? "flex" : "none";
			recordedFilesCountElement.textContent = count;
			
			return count;
		} catch (error) {
			customAlert(error.message);
			return 0;
		}
	}
	
	async function retrieveSessionId(userId) {
		const sessionRef = doc(firestoreDb, "User_Sessions", userId);
		try {
			const sessionDoc = await getDoc(sessionRef);
			if (sessionDoc.exists()) {
				return sessionDoc.data().sessionId;
			} else {
				customAlert("No session ID found for user. Redirecting to login to create a new session.");
				window.location.href = "/login/login.html";
				return null;
			}
		} catch (error) {
			console.warn(`Error retrieving session ID: ${error.message || error}`);
			return null;
		}
	}
	
	onAuthStateChanged(auth, async (user) => {
		if (user) {
			// Authenticated user flow
			try {
				const sessionId = await retrieveSessionId(user.uid);
				if (!sessionId) {
					return;
				}
				countUserRecordings();
				
				saveRecordingButton.addEventListener("click", async () => {
					if (!currentBlob) {
						customAlert("No recording found to save.");
						return;
					}
					
					const recordingName = recordingNameInput.value.trim() || `recording-${Date.now()}`;
					document.getElementById("spinnerBackground").style.display = "grid";
					
					try {
						const recordingRef = ref(storage, `Users_Recordings/${user.uid}/${recordingName}.mp3`);
						const snapshot = await uploadBytes(recordingRef, currentBlob);
						const downloadURL = await getDownloadURL(snapshot.ref);
						
						await addDoc(collection(firestoreDb, "Users_Recordings", user.uid, "recordings"), {
							name: recordingName,
							url: downloadURL,
							timestamp: serverTimestamp(),
						});
						
						customAlert(`File saved as: ${recordingName}.mp3`);
						countUserRecordings();
						
						downloadContainer.style.top = "-100%";
						downloadContainer.style.height = "0%";
					} catch (error) {
						console.error("Error saving recording:", error);
						customAlert(`Error saving file: ${error.message}`);
					} finally {
						document.getElementById("spinnerBackground").style.display = "none";
					}
				});
				
				cancelRecordingButton.addEventListener("click", () => {
					downloadContainer.style.top = "-100%";
					downloadContainer.style.height = "0%";
					recordingNameInput.value = '';
					customAlert("Recording was canceled.");
				});
			} catch (error) {
				console.error("Error in onAuthStateChanged:", error);
				customAlert("An unexpected error occurred. Please try again.");
				setTimeout(() => {
					window.location.href = "/login/login.html";
				}, 3000);
			}
		}
		else {
			// Non-authenticated user flow
			const sessionIdCookie = document.cookie.split('; ').find(row => row.startsWith('sessionId='));
			
			if (sessionIdCookie) {
				const sessionId = sessionIdCookie.split('=')[1];
				try {
					const userSessionDoc = await getDoc(doc(firestoreDb, "User_Sessions", sessionId));
					if (userSessionDoc.exists()) {
						customAlert("Session found. Please log in to continue.");
					} else {
						customAlert("Session is invalid or expired. Please log in again.");
					}
					setTimeout(() => {
						window.location.href = "/login/login.html";
					}, 3000);
				} catch (error) {
					console.error("Error in session check:", error);
					customAlert("Error verifying session. Redirecting to login...");
					setTimeout(() => {
						window.location.href = "/login/login.html";
					}, 3000);
				}
			} else {
				customAlert("Welcome! Let's get you started. Redirecting to signup...");
				setTimeout(() => {
					window.location.href = "/join/signup.html";
				}, 3000);
			}
		}
	});
	
	let mediaRecorder, isRecording = false,
		isPaused = false,
		timerInterval;
	let seconds = 0,
		minutes = 0,
		hours = 0;
	let recordings = [];
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	if (!('MediaRecorder' in window)) {
		customAlert("MediaRecorder is not supported by this browser.");
	}
	if (!SpeechRecognition) {
		customAlert("Speech Recognition is not supported by this browser.");
	}
	let recognition = new SpeechRecognition();
	recognition.continuous = true;
	recognition.interimResults = true;
	recognition.lang = 'auto';
	recognition.onerror = (event) => {
		customAlert("Speech recognition failed. Check network connection or try again. " + event.error);
	};
	
	function updateRecordingButtonState() {
		startRecording.disabled = !navigator.onLine;
	}
	
	window.addEventListener('online', updateRecordingButtonState);
	window.addEventListener('offline', updateRecordingButtonState);
	
	document.addEventListener('DOMContentLoaded', updateRecordingButtonState);
	
	navigator.mediaDevices.getUserMedia({
			audio: true
		})
		.catch(err => customAlert("Error accessing microphone: " + err.message));
	toggleMenuButton.addEventListener("click", () => {
		menuContainer.classList.toggle("menuContainerShow");
		menuOverlay.classList.toggle("menuOverlayShow");
	});
	
	document.addEventListener("click", (e) => {
		if (!menuContainer.contains(e.target) && !toggleMenuButton.contains(e.target)) {
			menuContainer.classList.remove("menuContainerShow");
			menuOverlay.classList.remove("menuOverlayShow");
		}
	});
	const startTimer = () => {
		timerInterval = setInterval(() => {
				seconds = (seconds + 1) % 60;
				if (!seconds) minutes = (minutes + 1) % 60;
				if (!minutes && !seconds) hours++;
				updateTimerDisplay();
			},
			1000);
	};
	const stopTimer = () => clearInterval(timerInterval);
	const resetTimer = () => {
		seconds = minutes = hours = 0;
		updateTimerDisplay();
	};
	const updateTimerDisplay = () => {
		recordTimeCounter.textContent = `${hours.toString().padStart(2,
      '0')} : ${minutes.toString().padStart(2,
        '0')} : ${seconds.toString().padStart(2,
          '0')}`;
	};
	let currentBlob = null;
	
	function handleError(message) {
		customAlert(message);
	}
	
	startRecording.addEventListener('click', function() {
		
		if (!navigator.onLine) {
			handleError("No internet connection. Please connect to the internet before recording.");
			return;
		}
		
		if (isRecording || isPaused) {
			customAlert("Recording already in progress or paused. Cannot start a new one.");
			return; // Block if recording is already active or paused
		}
		
		function startRecording() {
			navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: 10000,
					channelCount: 2,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			}).then(stream => {
				mediaRecorder = new MediaRecorder(stream);
				let chunks = [];
				
				mediaRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) {
						chunks.push(event.data);
					}
				};
				
				mediaRecorder.onstop = () => {
					const blob = new Blob(chunks, { type: 'audio/mp3' });
					currentBlob = blob;
					recordings.push(blob);
					chunks.length = 0;
				};
				
				mediaRecorder.onerror = (event) => {
					handleError("Recording error: " + event.error);
					stopAllOperations();
				};
				
				mediaRecorder.start();
				recognition.start();
				
				recognition.onerror = (event) => {
					handleError("Speech recognition error: " + event.error);
					stopAllOperations();
				};
				
				drawFrequencyBars(stream);
				isRecording = true;
				isPaused = false; // Reset pause state
				updateButtonStates();
				startTimer();
				canvas.style.visibility = "visible";
				stopButton.style.cssText = "background-color: #7091E6; color: white;";
			}).catch(err => {
				handleError('Error accessing microphone: ' + err.message);
				stopAllOperations();
			});
		}
		
		function stopAllOperations() {
			if (mediaRecorder && mediaRecorder.state !== "inactive") {
				try {
					mediaRecorder.stop();
					recognition.stop();
					isRecording = isPaused = false;
					updateButtonStates();
					stopTimer();
					resetTimer();
				} catch (e) {
					console.warn("mediaRecorder stop failed:", e.message);
				}
			}
			
			// Stop the stream tracks if available
			if (mediaRecorder?.stream) {
				mediaRecorder.stream.getTracks().forEach(track => track.stop());
			}
			
			// Stop recognition
			if (recognition) {
				try {
					recognition.stop();
				} catch (e) {
					console.warn("Speech recognition stop failed:", e.message);
				}
			}
			
			isRecording = false;
			isPaused = false;
			
			stopTimer();
			stopFrequencyBars(); // In case this function exists
			
			updateButtonStates();
			
			canvas.style.visibility = "hidden";
			stopButton.style.cssText = "";
			pauseButton.classList.remove("fa-play");
			pauseButton.classList.add("fa-pause");
			pauseButton.style.cssText = "";
			recordTimeCounter.textContent = "00 : 00 : 00";
		}
		startRecording();
	});
	
	function removeNetworkListener() {
		window.removeEventListener('offline', handleOffline);
	}
	removeNetworkListener(); // Clean up event listener
	
	function handleOffline() {
		if (isRecording || isPaused) {
			handleError("Network disconnected. Recording stopped.");
			stopAllOperations();
			removeNetworkListener();
		}
	}
	pauseRecording.addEventListener("click", () => {
		function togglePauseResume() {
			if (!mediaRecorder) return;
			
			isPaused = !isPaused;
			
			if (isPaused) {
				mediaRecorder.pause();
				if (recognition) recognition.stop();
				
				updateRecordingStatus("Paused");
				stopTimer();
				
				pauseButton.classList.remove("fa-play");
				pauseButton.classList.add("fa-play");
				canvas.style.visibility = "hidden";
				
				pauseButton.style.cssText = " color: #4F2FE8FC; border-radius: 50%;";
				
			} else {
				if (recognition && recognition.continuous && recognition.interimResults) {
					try {
						recognition.start();
					} catch (e) {
						console.error("Speech recognition already started:", e.message);
					}
				}
				
				mediaRecorder.resume();
				updateRecordingStatus("Recording");
				
				startTimer();
				resumeFrequencyBars();
				
				pauseButton.classList.remove("fa-play");
				pauseButton.classList.add("fa-pause");
				
				pauseButton.style.cssText = ""; // Reset button style to default
			}
		}
		togglePauseResume();
	});
	
	// Modify the stop button behavior
	stopButton.addEventListener("click",
		() => {
			function stopRecording() {
				if (!mediaRecorder) return;
				
				mediaRecorder.stop();
				recognition.stop();
				isRecording = isPaused = false;
				updateButtonStates();
				stopTimer();
				resetTimer();
				downloadContainer.style.top = "0%";
				downloadContainer.style.height = "100%";
				canvas.style.visibility = "hidden";
				pauseButton.style.cssText = "background-color: white; color: #4F2FE8FC;";
				stopButton.style.cssText = "background-color: white; color: #4F2FE8FC;";
			}
			stopRecording();
		});
	
	function updateRecordingStatus(status) {
		recordTimeCounter.textContent = status;
	}
	
	function updateButtonStates() {
		startButton.disabled = isRecording;
		pauseButton.disabled = !isRecording || isPaused;
		stopButton.disabled = !isRecording;
	}
	
	function stopFrequencyBars() {
		canvas.style.visibility = "hidden";
	}
	
	function resumeFrequencyBars() {
		canvas.style.visibility = "visible";
	}
	
	function blobToBase64(blob) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}
	
	function setSvgPathColor(color1,
		color2,
		bgColor) {
		svgPath1.setAttribute("fill",
			color1);
		svgPath2.setAttribute("fill",
			color2);
		buttonBorder2.style.backgroundColor = bgColor;
	}
	canvas.width = 500;
	canvas.height = 190;
	
	function drawFrequencyBars(stream) {
		const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
		const analyser = audioCtx.createAnalyser();
		const source = audioCtx.createMediaStreamSource(stream);
		source.connect(analyser);
		analyser.fftSize = 2048;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		
		function drawBars() {
			analyser.getByteFrequencyData(dataArray);
			canvasCtx.fillStyle = "white";
			canvasCtx.fillRect(0,
				0,
				canvas.width,
				canvas.height);
			let barWidth = (canvas.width / bufferLength) * 10;
			let barHeight;
			let x = 0;
			for (let i = 0; i < bufferLength; i++) {
				barHeight = dataArray[i] / 2;
				let colorRatio = i / bufferLength;
				let r = Math.round(0x3D + (0x70 - 0x3D) * colorRatio);
				let g = Math.round(0x52 + (0x91 - 0x52) * colorRatio);
				let b = Math.round(0xA0 + (0xE6 - 0xA0) * colorRatio);
				canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
				canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
				x += barWidth + 1;
			}
			requestAnimationFrame(drawBars);
		}
		drawBars();
	}
})

const pageLoader = document.querySelector("#spinnerBackground");

setTimeout(() => {
	pageLoader.style.display = "none";
}, 2000);

profilePage.addEventListener("click", () => {
	window.location.href = "/profile/profile.html"
})
document.getElementById("notificationsContainer").onclick = function() {
	document.querySelector(".notificationCover").style.display = "grid"
}
document.getElementById("closeNotification").onclick = function() {
	document.querySelector(".notificationCover").style.display = "none"
}

// Notifications array to track all notifications
let notifications = JSON.parse(localStorage.getItem("notifications")) || [];

// Get DOM elements
const notificationsCount = document.getElementById("notificationsCount");
const notificationToggleMessage = document.querySelector("#notificationToggleMessage");

// Function to load notifications on page refresh
function loadNotifications() {
	notificationToggleMessage.innerHTML = ""; // Clear previous content
	notifications.forEach((notification, index) => {
		createNotificationElement(notification, index);
	});
	
	// Update the notification count
	updateNotificationCount();
}

// Function to send a new notification
function sendNotification(sender, message, link) {
	// Check if the notification already exists
	const exists = notifications.some(
		(n) => n.sender === sender && n.message === message && n.link === link
	);
	
	if (!exists) {
		// Add the new notification to the array
		const newNotification = { sender, message, link, read: false };
		notifications.push(newNotification);
		
		// Save to localStorage
		saveNotifications();
		
		// Create the notification element
		createNotificationElement(newNotification, notifications.length - 1);
		
		// Update the notification count
		updateNotificationCount();
	}
}

// Function to create a notification element
function createNotificationElement(notification, index) {
	const notificationMessage = document.createElement("div");
	notificationMessage.className = "notificationMessage";
	notificationMessage.style.display = "flex";
	notificationMessage.style.justifyContent = "space-between";
	
	notificationMessage.innerHTML = `
    <div id="details">
      <p id="senderDetails">${notification.sender}</p>
      <p id="message">${notification.message}</p>
      ${
        notification.link
          ? `<a style="text-decoration: underline; font-size: 12px; color: blue; font-style: italic;" href="${notification.link}">
              Our Services
            </a>`
          : ""
      }
    </div>
    <div id="notificationColor" style="background-color: ${
      notification.read ? "transparent" : "#8697ca"
    }; width: 15px; height: 15px; border-radius: 50%;"></div>
  `;
	
	// Add click event to mark notification as read
	notificationMessage.addEventListener("click", () => markAsRead(index));
	
	// Append the notification to the container
	notificationToggleMessage.appendChild(notificationMessage);
}

// Function to mark a notification as read
function markAsRead(index) {
	const notificationElement = notificationToggleMessage.children[index];
	const notificationColor = notificationElement.querySelector("#notificationColor");
	
	// Hide the notification color indicator
	if (notificationColor) notificationColor.style.backgroundColor = "transparent";
	
	// Mark the notification as read
	if (!notifications[index].read) {
		notifications[index].read = true;
		
		// Save the updated notifications to localStorage
		saveNotifications();
		
		// Update the notification count
		updateNotificationCount();
	}
}

// Function to update the notification count dynamically
function updateNotificationCount() {
	const insightCount = document.querySelector("#insightCount");
	const unreadCount = notifications.filter((notification) => !notification.read).length;
	
	// Update count badges
	notificationsCount.textContent = unreadCount;
	insightCount.textContent = unreadCount;
	
	// Hide badge if no unread notifications
	notificationsCount.style.display = unreadCount > 0 ? "flex" : "none";
}

// Function to save notifications to localStorage
function saveNotifications() {
	localStorage.setItem("notifications", JSON.stringify(notifications));
}

// Load notifications on page refresh
loadNotifications();

// Example notifications (for demonstration purposes)
sendNotification(
	"SpeechScribe",
	"Our website is currently under development, but you’re welcome to explore and use the available features as we work to bring you the full experience. Thank you for being an early user!",
	"/HTML/navigation/about_website.html"
);

sendNotification(
	"Admin",
	"We have added new features to enhance your experience. Check them out now!",
	"/HTML/navigation/new_features.html"
);

sendNotification(
	"Admin",
	"eee have added new features to enhance your experience. Check them out now!",
	"/HTML/navigation/new_features.html"
);