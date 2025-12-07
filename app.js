// Simple Tennis Liveboard App (ohne Backend)
// Speichert Daten in localStorage

const STORAGE_KEY = "tennis-live-app-matches-v1";

let matches = [];
let deferredPrompt;

// --- DOM-Elemente ---
const matchForm = document.getElementById("matchForm");
const courtInput = document.getElementById("court");
const playerInput = document.getElementById("playerName");
const opponentInput = document.getElementById("opponentName");

const matchesContainer = document.getElementById("matchesContainer");
const emptyState = document.getElementById("emptyState");
const summaryEl = document.getElementById("summary");
const filterRunningCheckbox = document.getElementById("filterRunning");
const clearBtn = document.getElementById("clearBtn");
const installBtn = document.getElementById("installBtn");

// Aktionen

function syncToCloud() {
  db.ref("matches").set(matches);
}

function subscribeToCloud() {
  db.ref("matches").on("value", (snapshot) => {
    const data = snapshot.val();
    if (Array.isArray(data)) {
      matches = data;
      renderMatches();
    }
  });
}


// --- Render-Funktionen ---
function renderMatches() {
  matchesContainer.innerHTML = "";

  const onlyRunning = filterRunningCheckbox.checked;
  const visible = matches.filter(
    (m) => !onlyRunning || m.status === "laufend"
  );

  if (visible.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  visible
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((match) => {
      const div = document.createElement("div");
      div.className = "match";

      const main = document.createElement("div");
      main.className = "match-main";

      const header = document.createElement("div");
      header.className = "match-header";

      const courtSpan = document.createElement("span");
      courtSpan.className = "match-court";
      courtSpan.textContent = match.court || "Match";

      const statusSpan = document.createElement("button");
      statusSpan.type = "button";
      statusSpan.className = "match-status";
      if (match.status === "laufend") statusSpan.classList.add("running");
      statusSpan.textContent =
        match.status === "laufend" ? "läuft" : "fertig";
      statusSpan.addEventListener("click", () => toggleStatus(match.id));

      header.appendChild(courtSpan);
      header.appendChild(statusSpan);

      const players = document.createElement("div");
      players.className = "match-players";
      const p1 = document.createElement("span");
      p1.textContent = match.playerName;
      const p2 = document.createElement("span");
      p2.textContent = "vs. " + match.opponentName;
      players.appendChild(p1);
      players.appendChild(p2);

      const sets = document.createElement("div");
      sets.className = "match-sets";

      ["set1", "set2", "set3"].forEach((key) => {
        const s = document.createElement("span");
        s.className = "match-set";
        if (!match[key]) {
          s.classList.add("empty");
          s.textContent = "-";
        } else {
          s.textContent = match[key];
        }
        sets.appendChild(s);
      });

      main.appendChild(header);
      main.appendChild(players);
      main.appendChild(sets);

      const actions = document.createElement("div");
      actions.className = "match-actions";

      const updateBtn = document.createElement("button");
      updateBtn.type = "button";
      updateBtn.className = "btn btn-small btn-ghost";
      updateBtn.textContent = "Sätze ändern";
      updateBtn.addEventListener("click", () => editSets(match.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-small btn-ghost btn-danger";
      deleteBtn.textContent = "Löschen";
      deleteBtn.addEventListener("click", () => deleteMatch(match.id));

      actions.appendChild(updateBtn);
      actions.appendChild(deleteBtn);

      div.appendChild(main);
      div.appendChild(actions);

      matchesContainer.appendChild(div);
    });

  renderSummary();
}

function renderSummary() {
  const total = matches.length;
  const running = matches.filter((m) => m.status === "laufend").length;
  const done = matches.filter((m) => m.status === "fertig").length;

  let setsHome = 0;
  let setsAway = 0;

  matches.forEach((m) => {
    [m.set1, m.set2, m.set3].forEach((set) => {
      if (!set) return;
      const parts = set.split(":").map((x) => parseInt(x, 10));
      if (parts.length !== 2 || !Number.isFinite(parts[0])) return;
      const [a, b] = parts;
      if (a > b) setsHome++;
      else if (b > a) setsAway++;
    });
  });

  summaryEl.innerHTML = `
    <div class="summary-row">
      <span>Matches gesamt</span>
      <span>${total}</span>
    </div>
    <div class="summary-row">
      <span>laufend / fertig</span>
      <span>${running} / ${done}</span>
    </div>
    <div class="summary-row">
      <span>gewonnene Sätze (Team / Gegner)</span>
      <span><strong>${setsHome} : ${setsAway}</strong></span>
    </div>
  `;
}

// --- Aktionen ---
function addMatch({ court, playerName, opponentName }) {
  const match = {
    id: "m_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    court: court.trim(),
    playerName: playerName.trim(),
    opponentName: opponentName.trim(),
    set1: "",
    set2: "",
    set3: "",
    status: "laufend",
    createdAt: Date.now(),
  };
  matches.push(match);
  syncToCloud();
  renderMatches();
}

function editSets(id) {
  const match = matches.find((m) => m.id === id);
  if (!match) return;

  const s1 = window.prompt("1. Satz (Format z.B. 6:4)", match.set1 || "");
  if (s1 === null) return;

  const s2 = window.prompt("2. Satz (optional)", match.set2 || "");
  if (s2 === null) return;

  const s3 = window.prompt("3. Satz / MTB (optional)", match.set3 || "");
  if (s3 === null) return;

  match.set1 = (s1 || "").trim();
  match.set2 = (s2 || "").trim();
  match.set3 = (s3 || "").trim();

  syncToCloud();
  renderMatches();
}

function toggleStatus(id) {
  const match = matches.find((m) => m.id === id);
  if (!match) return;
  match.status = match.status === "laufend" ? "fertig" : "laufend";
  syncToCloud();
  renderMatches();
}

function deleteMatch(id) {
  if (!window.confirm("Match wirklich löschen?")) return;
  matches = matches.filter((m) => m.id !== id);
  syncToCloud();
  renderMatches();
}

function clearAll() {
  if (!window.confirm("Alle Matches auf diesem Gerät löschen?")) return;
  matches = [];
  syncToCloud();
  renderMatches();
}

// --- Form & Events ---
matchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const court = courtInput.value;
  const playerName = playerInput.value;
  const opponentName = opponentInput.value;

  if (!court.trim() || !playerName.trim() || !opponentName.trim()) return;

  addMatch({ court, playerName, opponentName });

  // Match-Feld leeren, Spieler/Gegner bleiben stehen (praktisch bei mehreren Matches)
  courtInput.value = "";
  courtInput.focus();
});

filterRunningCheckbox.addEventListener("change", renderMatches);
clearBtn.addEventListener("click", clearAll);

// --- PWA: beforeinstallprompt ---
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  console.log("Install result:", result.outcome);
  deferredPrompt = null;
  installBtn.hidden = true;
});

// --- Service Worker registrieren ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.error("SW Fehler:", err));
  });
}

// --- Init ---
subscribeToCloud();
renderMatches();
