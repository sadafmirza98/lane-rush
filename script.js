const car = document.querySelector(".car");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");

let carPosition = 120; // Starting position of the car (centered)

leftBtn.addEventListener("click", () => {
  if (carPosition > 60) {
    // Prevent moving out of the road
    carPosition -= 60; // Move left by 60px (lane width)
    car.style.left = `${carPosition}px`;
  }
});

rightBtn.addEventListener("click", () => {
  if (carPosition < 180) {
    // Prevent moving out of the road
    carPosition += 60; // Move right by 60px (lane width)
    car.style.left = `${carPosition}px`;
  }
});
