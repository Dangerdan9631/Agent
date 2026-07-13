const animations = [
  ["idle", 6],
  ["running-right", 8],
  ["running-left", 8],
  ["waving", 4],
  ["jumping", 5],
  ["failed", 8],
  ["waiting", 6],
  ["running", 6],
  ["review", 6],
  ["look-directions", 16],
];

const grid = document.querySelector("#animation-grid");
const ratePicker = document.querySelector("#frame-rate");
const toggle = document.querySelector("#toggle");
const players = animations.map(([name, frameCount]) => {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <div class="card-header">
      <h2>${name.replace("-", " ")}</h2>
      <span class="frame-count">${frameCount} frames</span>
    </div>
    <div class="comparison" aria-label="${name} layer comparison">
      <figure class="stage"><figcaption>Robot</figcaption><img data-layer="robot" alt="${name} robot animation frame" /></figure>
      <figure class="stage"><figcaption>Drone</figcaption><img data-layer="drone" alt="${name} drone animation frame" /></figure>
      <figure class="stage"><figcaption>Combined</figcaption><img data-layer="combined" alt="${name} combined animation frame" /></figure>
    </div>`;
  grid.append(card);
  return { name, frameCount, frame: 0, images: {
    robot: card.querySelector('[data-layer="robot"]'),
    drone: card.querySelector('[data-layer="drone"]'),
    combined: card.querySelector('[data-layer="combined"]'),
  }};
});

function render(player) {
  const filename = player.name === "look-directions"
    ? ["000", "022.5", "045", "067.5", "090", "112.5", "135", "157.5", "180", "202.5", "225", "247.5", "270", "292.5", "315", "337.5"][player.frame]
    : String(player.frame).padStart(2, "0");
  player.images.robot.src = `../source/${player.name}/robot/${filename}.png`;
  player.images.drone.src = `../source/${player.name}/drone/${filename}.png`;
  player.images.combined.src = `../source/${player.name}/${filename}.png`;
}

players.forEach(render);

let timer;
let paused = false;
function start() {
  window.clearInterval(timer);
  timer = window.setInterval(() => {
    players.forEach((player) => {
      player.frame = (player.frame + 1) % player.frameCount;
      render(player);
    });
  }, 1000 / Number(ratePicker.value));
}

ratePicker.addEventListener("change", start);
toggle.addEventListener("click", () => {
  paused = !paused;
  toggle.textContent = paused ? "Play" : "Pause";
  toggle.setAttribute("aria-pressed", String(paused));
  if (paused) window.clearInterval(timer);
  else start();
});

start();
