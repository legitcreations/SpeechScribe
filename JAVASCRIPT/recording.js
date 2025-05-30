import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage, ref, deleteObject, getMetadata, getDownloadURL, uploadBytes, listAll } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";


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
const db = getFirestore(app);
const storage = getStorage(app);

const alertContainer = document.querySelector(".alertContainer"),
  closeAlert = document.getElementById("closeAlert"),
  alertText = document.getElementById("alertText");

closeAlert.addEventListener("click", () => {
  alertContainer.style.display = "none";
});

function customAlert(message) {
  alertText.textContent = message;
  alertContainer.style.display = 'grid';
}

async function retrieveSessionId(userId) {
  const sessionRef = doc(db, "User_Sessions", userId);
  try {
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists()) {
      return sessionDoc.data().sessionId;
    } else {
      customAlert("No session ID found for user. Redirecting to login to create a new session");
      window.location.href = "/login/login.html";
      return null;
    }
  } catch (error) {
    customAlert(`Error retrieving session ID: ${error.message || error}`);
    return null;
  }
}

async function loadRecordings() {
  const thisUser = auth.currentUser;

  if (!thisUser) {
    customAlert("No user is currently signed in.");
    return;
  }
  const recordingsRef = collection(db, 'Users_Recordings', thisUser.uid, 'recordings');
  try {
    const querySnapshot = await getDocs(recordingsRef);
    if (querySnapshot.empty) {
      //customAlert("No recordings found for this user.");
      document.getElementById("noFileIndicator").style.display = "grid"
      document.getElementById('spinnerBackground').style.display = "none";
      return;
    }
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const recordingName = data.name;
      const recordingFileLink = data.url;
      const recordingTime = new Date(data.timestamp.seconds * 1000);
      const documentId = doc.id;
      cloneAndDisplayRecording(recordingName, recordingTime, recordingFileLink, documentId);
    });

    document.getElementById('spinnerBackground').style.display = "none";
  } catch (error) {
    customAlert("Error fetching recordings: " + error.message);
    document.getElementById('spinnerBackground').style.display = "grid";
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return "00 : 00 : 00";
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hrs} : ${mins} : ${secs}`;
}

let currentFileLink = null;
let currentFileName = null;

function cloneAndDisplayRecording(name, time, fileLink, documentId) {
  const recordingsContainer = document.getElementById("recordings-list");
  const originalRecordingDiv = document.getElementById("recordingsDiv");

  const clonedRecordingDiv = originalRecordingDiv.cloneNode(true);
  clonedRecordingDiv.style.display = "flex";
  clonedRecordingDiv.className = "clonedRecording";
  clonedRecordingDiv.dataset.id = documentId; // Store documentId in data attribute

  const recordingNameElement = clonedRecordingDiv.querySelector("#recordingName");
  const recordingTimeElement = clonedRecordingDiv.querySelector("#recordingTime");
  const playButton = clonedRecordingDiv.querySelector("#recordingPlayButton");

  recordingNameElement.textContent = name;
  recordingTimeElement.textContent = time.toLocaleString();

  clonedRecordingDiv.onclick = function() {
    currentFileLink = fileLink;
    currentFileName = name;
    openFilePlayer(name, time, fileLink, documentId); // Pass documentId here
  };

  playButton.onclick = function(event) {
    event.stopPropagation(); // Prevent play button from triggering the entire file player open
    playRecording(fileLink, playButton);
  };

  recordingsContainer.appendChild(clonedRecordingDiv);
}

function searchRecordings() {
  const searchTerm = document.getElementById("search").value.toLowerCase();
  const clonedRecordings = document.querySelectorAll(".clonedRecording");
  let hasResults = false;

  clonedRecordings.forEach((recording) => {
    const recordingName = recording.querySelector("#recordingName").textContent.toLowerCase();
    if (recordingName.includes(searchTerm)) {
      recording.style.display = "flex"; // Show matching recordings
      hasResults = true;
    } else {
      recording.style.display = "none"; // Hide non-matching recordings
    }
  });

  const recordingsContainer = document.getElementById("recordings-list");
  const noResultsMessage = document.getElementById("noResultsMessage");

  if (!hasResults) {
    if (!noResultsMessage) {
      const p = document.createElement("p");
      p.id = "noResultsMessage";

      p.textContent = "No recordings found for your search.";
      p.style.color ="white"
      p.classList.add("searchQuery");
      recordingsContainer.appendChild(p);
    }
  } else {
    if (noResultsMessage) {
      recordingsContainer.removeChild(noResultsMessage);
    }
  }
}

// Add event listener to the search input
document.getElementById("search").addEventListener("input", searchRecordings);
// Add event listener to the search input
document.getElementById("search").addEventListener("input", searchRecordings);

function playRecording(fileLink, playButton) {
  const audio = new Audio(fileLink);
  const playingDuration = document.getElementById("playingDuration");

  let updateInterval; // Interval to update playing duration

  // Update playing duration every second
  audio.ontimeupdate = () => {
    playingDuration.textContent = formatTime(audio.currentTime);
  };

  audio.play();
  playButton.style.color = "#3498db";
  playButton.style.transform = "scale(1.2)";
  playButton.style.transition = "0.3s";
  playButton.classList.add('playing');

  audio.onended = () => {
    playButton.style.color = "#93AFD8";
    playButton.style.transform = "scale(1)";
    playButton.style.transition = "0s";
    playButton.classList.remove('playing');
    playingDuration.textContent = "00 : 00 : 00"; // Reset playing duration

    // Clear the interval when audio ends
    clearInterval(updateInterval);
  };
}

function getFileNameWithMp3Extension(name) {
  if (!name.endsWith(".mp3")) {
    name = name.split('.')[0]; // Remove any existing extension
    name += ".mp3"; // Add .mp3 extension
  }
  return name;
}

function openFilePlayer(name, time, fileLink, documentId) { // Accept documentId
  const filePlayerCover = document.getElementById("filePlayerCover");
  const fileNameElement = document.getElementById("fileName");
  const fileDateElement = document.getElementById("fileDate");
  const playButton = document.querySelector("#audioControls .fa-play");
  const backwardButton = document.getElementById("backwardBtn");
  const forwardButton = document.getElementById("forwardBtn");
  const shareButton = document.getElementById("shareFile");

  filePlayerCover.style.display = "grid";
  fileNameElement.textContent = name;
  fileDateElement.textContent = time.toLocaleDateString();

  const audio = new Audio(fileLink);

  playButton.onclick = function() {
    if (audio.paused) {
      audio.play();
      playButton.setAttribute("style", "width: 3.5rem; height: 3.5rem; text-align: center; align-items: center; font-size: 20px; line-height: 1.75rem!important;");
      playButton.classList.remove("fa-play");
      playButton.classList.add("fa-pause"); // Change icon to pause
    } else {
      audio.pause();
      playButton.classList.remove("fa-pause");
      playButton.classList.add("fa-play"); // Change icon to play
    }

    audio.ontimeupdate = () => {
      document.getElementById("playingDuration").textContent = formatTime(audio.currentTime);
    };

    audio.onended = () => {
      playButton.classList.remove("fa-pause");
      playButton.classList.add("fa-play"); // Reset icon to play
      document.getElementById("playingDuration").textContent = "00 : 00 : 00"; // Reset playing duration
    };
  };

  backwardButton.onclick = function() {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  };

  forwardButton.onclick = function() {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); // Go forward 5 seconds, but not beyond duration
  };

  shareButton.onclick = function() {
    if (navigator.share) {
      navigator.share({
        title: `Check out this recording: ${name}`,
        text: `Listen to this recording: ${name}`,
        url: fileLink
      }).then(() => {
        customAlert('Thanks for sharing!');
      }).catch(console.error);
    } else {
      customAlert("Sharing is not supported in this browser.");
    }
  };

  document.getElementById("closePlayerContainer").onclick = function() {
    filePlayerCover.style.display = "none";
    audio.pause();
    audio.currentTime = 0; // Reset audio
    playButton.classList.remove("fa-pause");
    playButton.classList.add("fa-play");
  };
}

const downloadFileButton = document.getElementById("downloadFile")

downloadFileButton.addEventListener("click", () => {
  if (currentFileLink && currentFileName) {
    downloadFile(currentFileLink, currentFileName);
  } else {
    customAlert("No recording selected for download.");
  }
});

function downloadFile(fileLink, name) {
  const a = document.createElement("a");
  a.href = fileLink;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const deleteFileButton = document.getElementById("deleteFileFromFirebase");

deleteFileButton.addEventListener("click", async () => {
  if (currentFileLink && currentFileName) {
    const selectedRecording = document.querySelector(`.clonedRecording[data-id]`);
    const documentId = selectedRecording ? selectedRecording.dataset.id : null;

    if (documentId) {
      await deleteFileFromFirebase(currentFileLink, documentId, currentFileName);
    } else {
      customAlert("Could not find the document ID for deletion.");
    }
  } else {
    customAlert("No recording selected for deletion.");
  }
});

async function deleteFileFromFirebase(fileLink, documentId) {
  try {
    document.getElementById('spinnerBackground').style.display = "grid";
    const user = auth.currentUser;
    if (!user) {
      customAlert("User is not authenticated. Cannot delete file.");
      window.location.href = "/join/signup.html";
      document.getElementById('spinnerBackground').style.display = "none";
      return;
    }

    const recordingDocRef = doc(db, 'Users_Recordings', user.uid, 'recordings', documentId);
    const docSnapshot = await getDoc(recordingDocRef);

    if (!docSnapshot.exists()) {
      document.getElementById('spinnerBackground').style.display = "none";
      customAlert(`Recording does not exist in Firestore.`);
      return;
    }
    const { url, name } = docSnapshot.data();
    const filePath = url.split('/o/')[1].split('?')[0];
    const storageRef = ref(storage, decodeURIComponent(filePath));

    const fileExists = await checkFileExists(storageRef);
    if (!fileExists) {
      document.getElementById('spinnerBackground').style.display = "none";
      customAlert(`File "${name}" does not exist in Firebase Storage.`);
      return;
    }
    await deleteObject(storageRef);
    await deleteDoc(recordingDocRef);

    document.getElementById("filePlayerCover").style.display = "none";
    const recordingElement = document.querySelector(`.clonedRecording[data-id="${documentId}"]`);
    if (recordingElement) {
      recordingElement.remove();
    }

    const remainingRecordingsSnapshot = await getDocs(collection(db, 'Users_Recordings', user.uid, 'recordings'));
    if (remainingRecordingsSnapshot.empty) {
      document.getElementById("noFileIndicator").style.display = "grid";
    } else {
      document.getElementById("noFileIndicator").style.display = "none";
    }

    customAlert(`Recording "${name}" has been deleted successfully.`);
  } catch (error) {
    customAlert("Error deleting file: " + error.message);
  } finally {
    document.getElementById('spinnerBackground').style.display = "none";
  }
}

async function checkFileExists(storageRef) {
  try {
    await getMetadata(storageRef);
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return false;
    } else {
      customAlert("Error checking file existence: " + error.message);
      return false;
    }
  }
}

onAuthStateChanged(auth, async (user) => { 
  if (user) {
    const sessionId = await retrieveSessionId(user.uid); 
    if (!sessionId) return;
    loadRecordings();
  } else {
    customAlert("User does not exist. Redirecting to signup.");
    window.location.href = "/join/signup.html";
  }
})
  window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("search")) {
      const searchInput = document.getElementById("search");
      if (searchInput) {
        searchInput.focus();  // Focus on the search input
        
      }
    }
  })