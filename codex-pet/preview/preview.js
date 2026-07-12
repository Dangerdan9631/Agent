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
    <div class="stage"><img alt="${name} animation frame" /></div>`;
  grid.append(card);
  return { name, frameCount, frame: 0, image: card.querySelector("img") };
});

function render(player) {
  player.image.src = `../source/${player.name}/${String(player.frame).padStart(2, "0")}.png`;
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
