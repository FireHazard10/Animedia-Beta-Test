//hamburger menu
document.querySelectorAll(".badge").forEach((b) => {
  b.addEventListener("click", () => b.classList.toggle("actixe"));
});

function toggleMobileMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.classList.toggle("active");
}

//clock Timer
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  document.getElementById("clock").textContent = timeString;
}

setInterval(updateClock, 1000);
updateClock();

function scrollWeek(distance) {
  document
    .getElementById("weekDays")
    .scrollBy({ left: distance, behavior: "smooth" });
}

//carousel
const trendList = document.querySelector(".trending-list");
document.getElementById("trend-forward").onclick = () =>
  trendList.scrollBy({ left: 300, behavior: "smooth" });
document.getElementById("trend-back").onclick = () =>
  trendList.scrollBy({ left: -300, behavior: "smooth" });
