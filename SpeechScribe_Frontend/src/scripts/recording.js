// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage, ref, deleteObject, getMetadata } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyApeufdnAhQCnsYljYchPjrh8W8Wf_YOtk",
  authDomain: "speechscribeapp.firebaseapp.com",
  projectId: "speechscribeapp",
  storageBucket: "speechscribeapp.appspot.com",
  messagingSenderId: "624877337813",
  appId: "1:624877337813:web:8a857bf46caf430318765c",
  measurementId: "G-239G8L2PGX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Alert
const alertContainer = document.querySelector(".alertContainer"),
  closeAlert = document.getElementById("closeAlert"),
  alertText = document.getElementById("alertText");

closeAlert.addEventListener("click", () => alertContainer.style.display = "none");

function customAlert(message) {
  alertText.textContent = message;
  alertContainer.style.display = 'grid';
}

// Session handling
async function retrieveSessionId(userId) {
  const sessionRef = doc(db, "User_Sessions", userId);
  try {
    const sessionDoc = await getDoc(sessionRef);
    if (sessionDoc.exists()) {
      return sessionDoc.data().sessionId;
    } else {
      customAlert("No session ID found. Redirecting to login.");
      window.location.href = "/SpeechScribe_Frontend/src/pages/auth/login.html";
      return null;
    }
  } catch (error) {
    customAlert(`Error retrieving session ID: ${error.message}`);
    return null;
  }
}

// Load recordings
async function loadRecordings() {
  const thisUser = auth.currentUser;
  if (!thisUser) return customAlert("No user is signed in.");

  const recordingsRef = collection(db, 'Users_Recordings', thisUser.uid, 'recordings');
  try {
    const querySnapshot = await getDocs(recordingsRef);
    const spinner = document.getElementById('spinnerBackground');
    const noFile = document.getElementById("noFileIndicator");

    if (querySnapshot.empty) {
      noFile.style.display = "grid";
      spinner.style.display = "none";
      return;
    }

    querySnapshot.forEach(doc => {
      const { name, url, timestamp } = doc.data();
      const time = new Date(timestamp.seconds * 1000);
      cloneAndDisplayRecording(name, time, url, doc.id);
    });

    spinner.style.display = "none";
  } catch (error) {
    customAlert("Error fetching recordings: " + error.message);
    document.getElementById('spinnerBackground').style.display = "grid";
  }
}

// Display recordings
let currentFileLink = null;
let currentFileName = null;

function cloneAndDisplayRecording(name, time, fileLink, documentId) {
  const container = document.getElementById("recordings-list");
  const template = document.getElementById("recordingsDiv");
  const clone = template.cloneNode(true);

  clone.style.display = "flex";
  clone.className = "clonedRecording";
  clone.dataset.id = documentId;

  clone.querySelector("#recordingName").textContent = name;
  clone.querySelector("#recordingTime").textContent = time.toLocaleString();

  clone.onclick = () => {
    currentFileLink = fileLink;
    currentFileName = name;
    openFilePlayer(name, time, fileLink, documentId);
  };

  clone.querySelector("#recordingPlayButton").onclick = (e) => {
    e.stopPropagation();
    playRecording(fileLink, e.currentTarget);
  };

  container.appendChild(clone);
}

// Format time
function formatTime(seconds) {
  if (!isFinite(seconds)) return "00 : 00 : 00";
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${hrs} : ${mins} : ${secs}`;
}

// Search filter
document.getElementById("search").addEventListener("input", () => {
  const term = document.getElementById("search").value.toLowerCase();
  const recordings = document.querySelectorAll(".clonedRecording");
  const container = document.getElementById("recordings-list");
  const noResults = document.getElementById("noResultsMessage");

  let found = false;

  recordings.forEach(rec => {
    const name = rec.querySelector("#recordingName").textContent.toLowerCase();
    const match = name.includes(term);
    rec.style.display = match ? "flex" : "none";
    if (match) found = true;
  });

  if (!found && !noResults) {
    const msg = document.createElement("p");
    msg.id = "noResultsMessage";
    msg.textContent = "No recordings found for your search.";
    msg.style.color = "white";
    msg.classList.add("searchQuery");
    container.appendChild(msg);
  } else if (found && noResults) {
    container.removeChild(noResults);
  }
});

// Playback logic
function playRecording(fileLink, button) {
  const audio = new Audio(fileLink);
  const duration = document.getElementById("playingDuration");

  audio.ontimeupdate = () => duration.textContent = formatTime(audio.currentTime);
  audio.onended = () => {
    button.classList.remove('playing');
    button.style.color = "#93AFD8";
    button.style.transform = "scale(1)";
    duration.textContent = "00 : 00 : 00";
  };

  button.style.color = "#3498db";
  button.style.transform = "scale(1.2)";
  button.classList.add('playing');
  audio.play();
}

// Audio player UI
function openFilePlayer(name, time, fileLink, documentId) {
  const cover = document.getElementById("filePlayerCover");
  const fileName = document.getElementById("fileName");
  const fileDate = document.getElementById("fileDate");
  const playBtn = document.querySelector("#audioControls .fa-play");
  const backward = document.getElementById("backwardBtn");
  const forward = document.getElementById("forwardBtn");
  const share = document.getElementById("shareFile");
  const close = document.getElementById("closePlayerContainer");
  const duration = document.getElementById("playingDuration");

  const audio = new Audio(fileLink);

  cover.style.display = "grid";
  fileName.textContent = name;
  fileDate.textContent = time.toLocaleDateString();

  playBtn.onclick = () => {
    if (audio.paused) {
      audio.play();
      playBtn.classList.replace("fa-play", "fa-pause");
    } else {
      audio.pause();
      playBtn.classList.replace("fa-pause", "fa-play");
    }
    audio.ontimeupdate = () => duration.textContent = formatTime(audio.currentTime);
    audio.onended = () => {
      playBtn.classList.replace("fa-pause", "fa-play");
      duration.textContent = "00 : 00 : 00";
    };
  };

  backward.onclick = () => audio.currentTime = Math.max(0, audio.currentTime - 5);
  forward.onclick = () => audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  share.onclick = () => {
    if (navigator.share) {
      navigator.share({ title: `Recording: ${name}`, text: `Check out this recording: ${name}`, url: fileLink })
        .then(() => customAlert('Thanks for sharing!'))
        .catch(console.error);
    } else customAlert("Browser doesn't support sharing.");
  };

  close.onclick = () => {
    cover.style.display = "none";
    audio.pause();
    audio.currentTime = 0;
    playBtn.classList.replace("fa-pause", "fa-play");
  };
}

// Download recording
document.getElementById("downloadFile").addEventListener("click", () => {
  if (!currentFileLink || !currentFileName) return customAlert("No recording selected.");
  const a = document.createElement("a");
  a.href = currentFileLink;
  a.download = currentFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Delete recording
document.getElementById("deleteFileFromFirebase").addEventListener("click", async () => {
  const recording = document.querySelector(`.clonedRecording[data-id]`);
  if (!currentFileLink || !recording) return customAlert("Select a recording to delete.");

  const docId = recording.dataset.id;
  await deleteFileFromFirebase(currentFileLink, docId);
});

async function deleteFileFromFirebase(fileLink, documentId) {
  const spinner = document.getElementById('spinnerBackground');
  spinner.style.display = "grid";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthenticated. Redirecting.");

    const docRef = doc(db, 'Users_Recordings', user.uid, 'recordings', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) throw new Error("Recording not found in Firestore.");

    const { url, name } = docSnap.data();
    const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
    const fileRef = ref(storage, path);

    const exists = await checkFileExists(fileRef);
    if (!exists) throw new Error(`File "${name}" not found in Storage.`);

    await deleteObject(fileRef);
    await deleteDoc(docRef);

    document.querySelector(`.clonedRecording[data-id="${documentId}"]`)?.remove();
    const hasMore = !(await getDocs(collection(db, 'Users_Recordings', user.uid, 'recordings'))).empty;
    document.getElementById("noFileIndicator").style.display = hasMore ? "none" : "grid";
    document.getElementById("filePlayerCover").style.display = "none";

    customAlert(`Recording "${name}" deleted.`);
  } catch (err) {
    customAlert("Error deleting: " + err.message);
    if (err.message.includes("Unauthenticated")) window.location.href = "/SpeechScribe_Frontend/src/pages/auth/signup.html";
  } finally {
    spinner.style.display = "none";
  }
}

async function checkFileExists(ref) {
  try {
    await getMetadata(ref);
    return true;
  } catch (err) {
    if (err.code === 'storage/object-not-found') return false;
    customAlert("Metadata check failed: " + err.message);
    return false;
  }
}

// Initialize when DOM is ready
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const sessionId = await retrieveSessionId(user.uid);
    if (sessionId) loadRecordings();
  } else {
    customAlert("User not found. Redirecting.");
    window.location.href = "/SpeechScribe_Frontend/src/pages/auth/signup.html";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const param = new URLSearchParams(window.location.search);
  if (param.has("search")) document.getElementById("search")?.focus();
});