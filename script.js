const roadWidth = 500; // Road width
const laneWidth = roadWidth / 4; // Calculate lane width for 4 lanes
const carWidth = 50; // The width of the car
let carPosition = roadWidth / 2 - carWidth / 2; // Start the car in the middle of the road

// Updated the score display
const scoreBoard = document.querySelector(".score-board");
const gameOverModal = document.querySelector(".game-over");
const finalScore = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");
const startBtn = document.getElementById("start-btn");
const road = document.querySelector(".road");
const car = document.querySelector(".car");

let score = 0;
let gameRunning = false;
let obstacleInterval;
let scoreInterval; // Interval to update score every second
let obstacles = []; // Keep track of all active obstacles

// Reset Game State
function resetGame() {
  gameRunning = false;
  score = 0; // Reset score to 0
  scoreBoard.innerText = `Score: 0`; // Update the score display
  carPosition = roadWidth / 2 - carWidth / 2; // Reset car position to the middle lane
  car.style.left = `${carPosition}px`;
  gameOverModal.style.display = "none";
  clearInterval(obstacleInterval); // Clear obstacle spawn interval
  clearInterval(scoreInterval); // Clear score increment interval
  obstacles.forEach((obstacle) => obstacle.remove());
  obstacles = [];
  leftBtn.disabled = true;
  rightBtn.disabled = true;
  startBtn.innerText = "Start Game";
}

// Start the Game
function startGame() {
  resetGame();
  gameRunning = true;
  leftBtn.disabled = false;
  rightBtn.disabled = false;
  startBtn.innerText = "Restart Game";
  startObstacles();

  // Start the score incrementing every second
  scoreInterval = setInterval(() => {
    if (gameRunning) {
      score += 1; // Increase score by 1 every second
      scoreBoard.innerText = `Score: ${score}`; // Update score display
    }
  }, 1000); // 1000ms = 1 second
}

// Spawn Obstacles
function spawnObstacle() {
  if (!gameRunning) return;

  const obstacle = document.createElement("div");
  obstacle.classList.add("obstacle");

  // Set background image for the obstacle
  const randomImage = `url('./obstacle.png')`; // Ensure the path to the image is correct
  obstacle.style.backgroundImage = randomImage;

  const lane = Math.floor(Math.random() * 4);
  obstacle.style.left = `${lane * laneWidth}px`;
  obstacle.style.top = `-60px`;
  road.appendChild(obstacle);
  obstacles.push(obstacle);

  const obstacleMoveInterval = setInterval(() => {
    if (!gameRunning) {
      clearInterval(obstacleMoveInterval);
      return;
    }

    // Move the obstacle down
    obstacle.style.top = `${obstacle.offsetTop + 5}px`;

    const obstacleRect = obstacle.getBoundingClientRect();
    const carRect = car.getBoundingClientRect();

    // Collision Detection
    if (
      obstacleRect.bottom >= carRect.top &&
      obstacleRect.top <= carRect.bottom &&
      obstacleRect.right >= carRect.left &&
      obstacleRect.left <= carRect.right
    ) {
      gameOver();
      clearInterval(obstacleMoveInterval);
    }

    // Remove obstacle if it goes out of bounds and update the score
    if (obstacle.offsetTop > road.offsetHeight) {
      obstacle.remove();
      obstacles = obstacles.filter((obs) => obs !== obstacle);
      clearInterval(obstacleMoveInterval);
    }
  }, 30);
}

// Start Obstacles
function startObstacles() {
  obstacleInterval = setInterval(spawnObstacle, 2000); // Create a new obstacle every 2 seconds
}

// Game Over
function gameOver() {
  gameRunning = false;
  leftBtn.disabled = true;
  rightBtn.disabled = true;
  clearInterval(obstacleInterval); // Stop spawning obstacles
  clearInterval(scoreInterval); // Stop the score increment

  // Stop all active obstacles
  obstacles.forEach((obstacle) => {
    obstacle.style.animationPlayState = "paused"; // Freeze animations
  });

  finalScore.innerText = score; // Display final score in the game over modal
  gameOverModal.style.display = "block"; // Show the game over modal
}

// Move Car Left
leftBtn.addEventListener("click", () => {
  // Ensure car doesn't move beyond the left edge of the road
  if (carPosition > 0 && gameRunning) {
    carPosition -= laneWidth;
    // Ensure car doesn't move out of the left side of the road
    if (carPosition < 0) carPosition = 0;
    car.style.left = `${carPosition}px`;
  }
});

// Move Car Right
rightBtn.addEventListener("click", () => {
  const maxCarPosition = roadWidth - carWidth; // Calculate the maximum right position for the car

  // Ensure car doesn't move beyond the right edge of the road
  if (carPosition < maxCarPosition && gameRunning) {
    carPosition += laneWidth;
    // Ensure the car doesn't exceed the right edge
    if (carPosition > maxCarPosition) carPosition = maxCarPosition;
    car.style.left = `${carPosition}px`;
  }
});

// Start and Restart Button Listeners
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
