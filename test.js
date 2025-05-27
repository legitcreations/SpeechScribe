document.getElementById("notificationsContainer").onclick = function() {
	document.querySelector(".notificationCover").style.display = "grid"
}
document.getElementById("closeNotification").onclick = function() {
	document.querySelector(".notificationCover").style.display = "none"
}

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
          ? `<a style="text-decoration: underline; font-size: 12px; color: #7973FF; font-style: italic;" href="${notification.link}">
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