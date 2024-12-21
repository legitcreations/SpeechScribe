// Notifications array to track all notifications
const notifications = [];

// Get DOM elements
const notificationsCount = document.getElementById("notificationsCount");
const notificationToggleMessage = document.querySelector("#notificationToggleMessage");

// Function to send a notification
function sendNotification(sender, message, link) {
  // Add the new notification to the array
  notifications.push({ sender, message, link, read: false });

  // Create a notification block
  const notificationMessage = document.createElement("div");
  notificationMessage.className = "notificationMessage";
  notificationMessage.setAttribute("role", "alert");
  notificationMessage.style.display = "flex";
  notificationMessage.style.justifyContent = "space-between";

  notificationMessage.innerHTML = `
    <div class="details">
      <p class="senderDetails">${sender}</p>
      <p class="message">${message}</p>
      ${
        link
          ? `<a class="notificationLink" href="${link}">
              Our Services
            </a>`
          : ""
      }
    </div>
    <div class="notificationColor"></div>
  `;

  // Add click event to mark notification as read
  notificationMessage.addEventListener("click", () => markAsRead(notificationMessage));

  // Append the new notification
  notificationToggleMessage.appendChild(notificationMessage);

  // Update the notification count
  updateNotificationCount();
  notificationsCount.style.display = "flex";
}

// Function to mark a notification as read
function markAsRead(notificationElement) {
  // Hide the notificationColor indicator
  const notificationColor = notificationElement.querySelector(".notificationColor");
  if (notificationColor) notificationColor.style.display = "none";

  // Mark the notification as read
  const index = Array.from(notificationToggleMessage.children).indexOf(notificationElement);
  if (index !== -1 && !notifications[index].read) {
    notifications[index].read = true;

    // Decrement the notification count
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
  if (unreadCount === 0) {
    notificationsCount.style.display = "none";
  } else {
    notificationsCount.style.display = "flex"; // Ensure badge is visible if unread notifications exist
  }
}