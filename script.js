// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== Elements =====
const loginScreen = $("loginScreen");
const app = $("app");
const loginForm = $("loginForm");
const loginError = $("loginError");

// ===== Storage keys =====
const USERS_KEY = "gympro_users";
const SESSION_KEY = "gympro_session";
const THEME_KEY = "gympro_theme";

// NOTE: Plain-text passwords in localStorage are for a class demo only.
let users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
let currentUser = null;
let data = {};

// ===== THEME =====
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  $("themeToggle").textContent = theme === "dark" ? "☀️ Theme" : "🌙 Theme";
  localStorage.setItem(THEME_KEY, theme);
}
$("themeToggle").addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

// ===== LOGIN =====
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = $("username").value.trim();
  const password = $("password").value;

  if (!users[username]) {
    users[username] = password; // first sign-in creates the account
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else if (users[username] !== password) {
    loginError.textContent = "Wrong password. Try again.";
    return;
  }

  loginError.textContent = "";
  localStorage.setItem(SESSION_KEY, username);
  startApp(username);
  loginForm.reset();
});

$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

function startApp(username) {
  currentUser = username;
  data = JSON.parse(localStorage.getItem(`gympro_data_${username}`) || "{}");
  data.workouts ||= [];
  data.checkins ||= [];
  data.water ||= { date: dateKey(), ml: 0 };
  data.macros ||= { date: dateKey(), meals: [] };

  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  $("workoutDate").value = dateKey();

  renderAll();
}

function save() {
  localStorage.setItem(`gympro_data_${currentUser}`, JSON.stringify(data));
}

// ===== CLOCK & GREETING =====
function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  $("dateText").textContent = now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  $("greeting").textContent = `${greet}, ${currentUser || "Athlete"} 💪`;
}
setInterval(updateClock, 1000);
updateClock();

// ===== WATER =====
function renderWater() {
  if (data.water.date !== dateKey()) data.water = { date: dateKey(), ml: 0 }; // new day resets
  const goal = 3000;
  const ml = data.water.ml;
  $("waterBar").style.width = Math.min((ml / goal) * 100, 100) + "%";
  $("waterText").textContent = `${ml} / ${goal} ml ${ml >= goal ? "🎉 Goal reached!" : ""}`;
}

document.querySelectorAll("[data-water]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (data.water.date !== dateKey()) data.water = { date: dateKey(), ml: 0 };
    data.water.ml += Number(btn.dataset.water);
    save();
    renderWater();
  });
});

$("waterReset").addEventListener("click", () => {
  data.water = { date: dateKey(), ml: 0 };
  save();
  renderWater();
});

// ===== WORKOUTS =====
function renderWorkouts() {
  const tbody = $("workoutList");
  tbody.innerHTML = "";
  data.workouts.forEach((w, i) => {
    const volume = w.sets * w.reps * w.weight;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${w.date}</td>
      <td>${w.exercise}</td>
      <td>${w.sets}</td>
      <td>${w.reps}</td>
      <td>${w.weight} kg</td>
      <td>${volume} kg</td>
      <td><button class="btn danger" data-del="${i}">✕</button></td>`;
    tbody.appendChild(tr);
  });

  const totalVolume = data.workouts.reduce((sum, w) => sum + w.sets * w.reps * w.weight, 0);
  $("statWorkouts").textContent = data.workouts.length;
  $("statVolume").textContent = totalVolume.toLocaleString();
}

$("workoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  data.workouts.unshift({
    exercise: $("exercise").value.trim(),
    date: $("workoutDate").value,
    sets: Number($("sets").value),
    reps: Number($("reps").value),
    weight: Number($("weight").value),
  });
  save();
  $("workoutForm").reset();
  $("workoutDate").value = dateKey();
  renderWorkouts();
});

$("workoutList").addEventListener("click", (e) => {
  if (e.target.dataset.del !== undefined) {
    data.workouts.splice(Number(e.target.dataset.del), 1);
    save();
    renderWorkouts();
  }
});

// ===== GYM CHECK-IN & STREAK =====
function calcStreak() {
  const set = new Set(data.checkins);
  let streak = 0;
  const d = new Date();
  if (!set.has(dateKey(d))) d.setDate(d.getDate() - 1); // streak still counts if not checked in yet today
  while (set.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderCheckin() {
  const today = dateKey();
  const done = data.checkins.includes(today);
  $("checkinBtn").disabled = done;
  $("checkinBtn").textContent = done ? "✅ Checked in today" : "✅ Check In at Gym";
  $("checkinText").textContent = done ? "Great work today. Keep the streak alive!" : "";
  $("statStreak").textContent = calcStreak();
}

$("checkinBtn").addEventListener("click", () => {
  const today = dateKey();
  if (!data.checkins.includes(today)) data.checkins.push(today);
  save();
  renderCheckin();
});

// ===== MACROS =====
function renderMacros() {
  if (data.macros.date !== dateKey()) data.macros = { date: dateKey(), meals: [] };
  const t = data.macros.meals.reduce(
    (acc, m) => ({ p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f }),
    { p: 0, c: 0, f: 0 }
  );
  const calories = t.p * 4 + t.c * 4 + t.f * 9;
  $("macroText").textContent = `Today: ${t.p}g protein · ${t.c}g carbs · ${t.f}g fat · ≈ ${calories} kcal`;
}

$("macroForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (data.macros.date !== dateKey()) data.macros = { date: dateKey(), meals: [] };
  data.macros.meals.push({
    p: Number($("protein").value),
    c: Number($("carbs").value),
    f: Number($("fat").value),
  });
  save();
  $("macroForm").reset();
  renderMacros();
});

// ===== BMI =====
$("bmiBtn").addEventListener("click", () => {
  const h = Number($("height").value) / 100;
  const w = Number($("bmiWeight").value);
  if (!h || !w) {
    $("bmiResult").textContent = "Enter height and weight.";
    return;
  }
  const bmi = w / (h * h);
  let category = "Obese";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Healthy";
  else if (bmi < 30) category = "Overweight";
  $("bmiResult").textContent = `BMI: ${bmi.toFixed(1)} (${category})`;
});

// ===== ONE-REP MAX (Epley formula) =====
$("rmBtn").addEventListener("click", () => {
  const w = Number($("rmWeight").value);
  const r = Number($("rmReps").value);
  if (!w || !r) {
    $("rmResult").textContent = "Enter weight and reps.";
    return;
  }
  const oneRM = w * (1 + r / 30);
  $("rmResult").textContent = `Estimated 1RM: ${oneRM.toFixed(1)} kg`;
});

// ===== REST TIMER =====
let timerId = null;
let remaining = 60;

function renderTimer() {
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  $("timerDisplay").textContent = `${m}:${s}`;
}

function beep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

$("timerPreset").addEventListener("change", () => {
  stopTimer();
  remaining = Number($("timerPreset").value);
  renderTimer();
});

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

$("timerStart").addEventListener("click", () => {
  if (timerId) return;
  timerId = setInterval(() => {
    remaining--;
    renderTimer();
    if (remaining <= 0) {
      stopTimer();
      beep();
      remaining = Number($("timerPreset").value);
      renderTimer();
    }
  }, 1000);
});

$("timerStop").addEventListener("click", stopTimer);

$("timerReset").addEventListener("click", () => {
  stopTimer();
  remaining = Number($("timerPreset").value);
  renderTimer();
});

// ===== MOTIVATION QUOTES =====
const quotes = [
  "The only bad workout is the one that didn't happen.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Success starts with self-discipline.",
  "Small progress is still progress.",
  "Push harder than yesterday if you want a different tomorrow.",
];

function newQuote() {
  $("quoteText").textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
}
$("newQuote").addEventListener("click", newQuote);

// ===== RENDER ALL & AUTO-LOGIN =====
function renderAll() {
  renderWater();
  renderWorkouts();
  renderCheckin();
  renderMacros();
  renderTimer();
  newQuote();
}

const savedSession = localStorage.getItem(SESSION_KEY);
if (savedSession && users[savedSession] !== undefined) {
  startApp(savedSession);
}