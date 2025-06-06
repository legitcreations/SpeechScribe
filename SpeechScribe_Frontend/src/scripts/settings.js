function previous() {
  window.history.back()
}
const alertContainer = document.querySelector(".alertContainer");
const closeAlert = document.getElementById("closeAlert");
const alertText = document.getElementById("alertText");
closeAlert.addEventListener("click", () => {
  alertContainer.style.display = "none";
});
function customAlert(message) {
  alertText.innerText = message;
  alertContainer.style.display = 'grid';
}

