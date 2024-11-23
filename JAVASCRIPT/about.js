function goBack() {
  window.history.back()
}
const version = document.getElementById("version")
fetch("/package.json").then(response => response.json()).then(data => {
  version.textContent = data.version
})