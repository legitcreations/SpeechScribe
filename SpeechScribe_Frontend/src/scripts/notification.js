import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

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

const notificationsCount = document.getElementById("notificationsCount");
const notificationToggleMessage = document.querySelector("#notificationToggleMessage");

document.getElementById("notificationsContainer").onclick = function() {
  document.querySelector(".notificationCover").style.display = "grid";
};
document.getElementById("closeNotification").onclick = function() {
  document.querySelector(".notificationCover").style.display = "none";
};

let notifications = [];
let currentUser = null;

const declaredNotifications = [
  {
    sender: "SpeechScribe",
    message: "Our website is currently under development, but you’re welcome to ee and use the available features as we work to bring you the full experience. Thank you for being an early user!",
    link: "/HTML/navigation/about_website.html",
  }
]

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadNotifications();
    
    // 1. Sync current declared notifications
    for (const declared of declaredNotifications) {
      await sendNotification(declared.sender, declared.message, declared.link);
    }
    
    // 2. Remove stale notifications
    await removeUndeclaredNotifications();
  }
});

// Load notifications from Firestore
async function loadNotifications() {
  notifications = [];
  notificationToggleMessage.innerHTML = "";
  
  const snapshot = await getDocs(collection(firestoreDb, "Users_Notifications", currentUser.uid, "notifications"));
  snapshot.forEach((docSnap) => {
    const notification = { id: docSnap.id, ...docSnap.data() };
    notifications.push(notification);
  });
  
  notifications.forEach((notification, index) => {
    createNotificationElement(notification, index);
  });
  
  updateNotificationCount();
}

// Send notification to Firestore
async function sendNotification(sender, message, link) {
  const exists = notifications.some(
    (n) => n.sender === sender && n.message === message && n.link === link
  );
  
  if (!exists && currentUser?.uid) {
    const newNotification = {
      sender,
      message,
      link,
      read: false,
      timestamp: serverTimestamp(),
    };
    
    const docRef = await addDoc(
      collection(firestoreDb, "Users_Notifications", currentUser.uid, "notifications"),
      newNotification
    );
    
    notifications.push({ id: docRef.id, ...newNotification });
    createNotificationElement({ id: docRef.id, ...newNotification }, notifications.length - 1);
    updateNotificationCount();
  }
}

async function removeUndeclaredNotifications() {
  const declaredKeys = declaredNotifications.map(n => `${n.sender}|${n.message}|${n.link || ""}`);
  
  const snapshot = await getDocs(collection(firestoreDb, "Users_Notifications", currentUser.uid, "notifications"));
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const key = `${data.sender}|${data.message}|${data.link || ""}`;
    
    if (!declaredKeys.includes(key)) {
      await deleteDoc(doc(firestoreDb, "Users_Notifications", currentUser.uid, "notifications", docSnap.id));
    }
  }
  
  // Reload after deletion
  await loadNotifications();
}

// Create notification DOM element
function createNotificationElement(notification, index) {
  const notificationMessage = document.createElement("div");
  notificationMessage.className = "notificationMessage";
  notificationMessage.style.display = "flex";
  notificationMessage.style.justifyContent = "space-between";
  
  notificationMessage.innerHTML = `
    <div class="details">
      <p class="senderDetails">${notification.sender}</p>
      <p class="message">${notification.message}</p>
      ${
        notification.link
          ? `<a style="text-decoration: underline; font-size: 12px; color: #7973FF; font-style: italic;" href="${notification.link}" target="_blank" rel="noopener noreferrer">
              Our Services
            </a>`
          : ""
      }
    </div>
    <div class="notificationColor" style="background-color: ${
      notification.read ? "transparent" : "#38B76E"
    }; width: 15px; height: 15px; border-radius: 50%;"></div>
    
  `;
  
  notificationMessage.addEventListener("click", () => markAsRead(index));
  notificationToggleMessage.appendChild(notificationMessage);
}

// Mark as read and update Firestore
async function markAsRead(index) {
  const notification = notifications[index];
  const notificationElement = notificationToggleMessage.children[index];
  const notificationColor = notificationElement.querySelector(".notificationColor");
  
  if (!notification.read) {
    notification.read = true;
    if (notificationColor) notificationColor.style.backgroundColor = "transparent";
    
    const notificationRef = doc(firestoreDb, "Users_Notifications", currentUser.uid, "notifications", notification.id);
    await updateDoc(notificationRef, { read: true });
    
    updateNotificationCount();
  }
}

// Update notification count
function updateNotificationCount() {
  const insightCount = document.querySelector("#insightCount");
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  
  // Update count badges
  notificationsCount.textContent = unreadCount;
  insightCount.textContent = unreadCount;
  
  // Hide badge if no unread notifications
  notificationsCount.style.display = unreadCount > 0 ? "flex" : "none";
}
