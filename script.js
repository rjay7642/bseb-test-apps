/* ================= GLOBAL STATE ================= */
let studentName = "";
let currentStream = "";
let subject = "";
let currentIndex = 0;
let timer = null;
let timeLeft = 30;
let userAnswers = [];
let markedQuestions = [];
let elapsedSeconds = 0;
let testStartedAt = null;

/* ================= STORAGE KEYS ================= */
const PROGRESS_KEY = "bseb_test_progress";
const REVIEW_KEY = "bseb_last_review";

/* ================= STREAM → SUBJECT ================= */
const STREAM_SUBJECT_MAP = {
  science: [
    { id: "english", label: "English" },
    { id: "chemistery", label: "Chemistry" },
    { id: "physics", label: "Physics" },
    { id: "biology", label: "Biology" },
    { id: "hindi", label: "Hindi" },
    { id: "math", label: "Mathematics" }
  ],
  arts: [
    { id: "history", label: "History" },
    { id: "geography", label: "Geography" },
    { id: "politics", label: "Political Science" },
    { id: "hindi", label: "Hindi" },
    { id: "homescience", label: "Home Science" },
    { id: "english", label: "English" }
  ],
  commerce: [
    { id: "english", label: "English" }
  ]
};

/* ================= STREAM-WISE COMPLETION ================= */
function completedKey(stream) {
  return `bseb_completed_subjects_${stream}`;
}

function getCompletedSubjects(stream) {
  const d = localStorage.getItem(completedKey(stream));
  return d ? JSON.parse(d) : [];
}

function markSubjectCompleted(stream, subjectId) {
  const arr = getCompletedSubjects(stream);
  if (!arr.includes(subjectId)) {
    arr.push(subjectId);
    localStorage.setItem(completedKey(stream), JSON.stringify(arr));
  }
}

/* ================= ELEMENTS ================= */
const startPage = document.getElementById("startPage");
const testPage = document.getElementById("testPage");
const resultPage = document.getElementById("resultPage");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const markBtn = document.getElementById("markBtn");
const finishBtn = document.getElementById("finishBtn");

const questionText = document.getElementById("questionText");
const options = document.querySelectorAll(".option");
const timerEl = document.getElementById("timer");
const questionCount = document.getElementById("questionCount");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const markStatus = document.getElementById("markStatus");

const openGridBtn = document.getElementById("openGrid");
const closeGridBtn = document.getElementById("closeGrid");
const gridOverlay = document.getElementById("gridOverlay");
const questionGrid = document.getElementById("questionGrid");
const gridMeta = document.getElementById("gridMeta");

const resultName = document.getElementById("resultName");
const resultSubject = document.getElementById("resultSubject");
const scoreText = document.getElementById("scoreText");
const percentageText = document.getElementById("percentageText");
const correctCountEl = document.getElementById("correctCount");
const wrongCountEl = document.getElementById("wrongCount");
const skippedCountEl = document.getElementById("skippedCount");
const timeSpentEl = document.getElementById("timeSpent");
const themeToggles = document.querySelectorAll(".theme-toggle-input");
const printBtn = document.getElementById("printBtn");

const THEME_KEY = "bseb_theme";

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.getAttribute("data-page");

  initTheme();
  setAppMode();

  if (pageType === "review") {
    showReview();
    return;
  }

  const streamSelect = document.getElementById("streamSelect");
  const subjectSelect = document.getElementById("subject");

  subjectSelect.disabled = true;

  streamSelect.addEventListener("change", () => {
    currentStream = streamSelect.value;
    subjectSelect.innerHTML = `<option value="">— विषय चुनें —</option>`;
    subjectSelect.disabled = false;

    const completed = getCompletedSubjects(currentStream);

    STREAM_SUBJECT_MAP[currentStream].forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.id;
      opt.textContent = sub.label;

      if (completed.includes(sub.id)) {
        opt.disabled = true;
        opt.textContent += " ✔ Completed";
      }
      subjectSelect.appendChild(opt);
    });

    renderResetButton();
  });

  const saved = getSavedProgress();
  if (saved && saved.subject && saved.currentStream) {
    showResumeOption(saved);
  }
});

themeToggles.forEach(toggle => {
  toggle.addEventListener("change", () => {
    setTheme(toggle.checked ? "dark" : "light");
  });
});

if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

/* ================= RESUME ================= */
function showResumeOption(saved) {
  const card = document.querySelector(".glass-card");
  if (!card) return;

  const note = document.createElement("div");
  note.className = "note";
  note.innerHTML = `
    <b>अधूरा टेस्ट मिला</b>
    <p>${saved.studentName} • ${formatSubject(saved.subject)}</p>
    <button class="primary-btn" id="resumeBtn">Resume Test</button>
  `;

  card.appendChild(note);

  document.getElementById("resumeBtn").onclick = () => {
    studentName = saved.studentName;
    currentStream = saved.currentStream;
    subject = saved.subject;
    currentIndex = saved.currentIndex || 0;
    userAnswers = saved.userAnswers || [];
    markedQuestions = saved.markedQuestions || [];
    elapsedSeconds = saved.elapsedSeconds || 0;

    switchPage(startPage, testPage);
    startElapsedTimer();
    loadQuestion();
  };
}

/* ================= START TEST ================= */
startBtn.onclick = () => {
  studentName = document.getElementById("studentName").value.trim();
  subject = document.getElementById("subject").value;

  if (!studentName || !currentStream || !subject) {
    alert("नाम, स्ट्रीम और विषय भरें");
    return;
  }

  if (getCompletedSubjects(currentStream).includes(subject)) {
    alert("यह विषय पहले ही पूरा हो चुका है");
    return;
  }

  currentIndex = 0;
  userAnswers = [];
  markedQuestions = [];
  elapsedSeconds = 0;
  startElapsedTimer();

  saveProgress();
  switchPage(startPage, testPage);
  loadQuestion();
};

/* ================= QUESTIONS ================= */
function loadQuestion() {
  clearInterval(timer);
  timeLeft = 30;
  timerEl.innerText = timeLeft;

  const q = QUESTIONS[subject][currentIndex];
  questionText.innerText = q.q;
  questionCount.innerText =
    `Q ${currentIndex + 1} / ${QUESTIONS[subject].length}`;

  options.forEach((btn, i) => {
    btn.innerText = q.options[i];
    btn.classList.toggle("selected", userAnswers[currentIndex] === i);
    btn.onclick = () => selectOption(i);
  });

  updateProgressUI();
  updateMarkUI();
  updateNavUI();
  renderQuestionGrid();
  startTimer();
}

/* ================= TIMER ================= */
function startTimer() {
  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = timeLeft;
    if (timeLeft <= 0) goNext();
  }, 1000);
}

/* ================= ANSWER ================= */
function selectOption(i) {
  clearInterval(timer);
  userAnswers[currentIndex] = i;
  saveProgress();
  goNext();
}

/* ================= NAV ================= */
nextBtn.onclick = goNext;
prevBtn.onclick = goPrev;
markBtn.onclick = toggleMark;

function goNext() {
  if (userAnswers[currentIndex] === undefined) {
    userAnswers[currentIndex] = null;
  }

  currentIndex++;
  saveProgress();

  if (currentIndex < QUESTIONS[subject].length) loadQuestion();
  else finishTest();
}

function goPrev() {
  if (currentIndex === 0) return;
  currentIndex--;
  saveProgress();
  loadQuestion();
}

function goToQuestion(index) {
  if (index < 0 || index >= QUESTIONS[subject].length) return;
  currentIndex = index;
  saveProgress();
  loadQuestion();
  hideGrid();
}

function toggleMark() {
  markedQuestions[currentIndex] = !markedQuestions[currentIndex];
  saveProgress();
  updateMarkUI();
  renderQuestionGrid();
}

/* ================= FINISH ================= */
finishBtn.onclick = finishTest;

function finishTest() {
  clearInterval(timer);
  stopElapsedTimer();

  markSubjectCompleted(currentStream, subject);
  clearSavedProgress();
  renderResetButton();

  localStorage.setItem(REVIEW_KEY, JSON.stringify({
    subject,
    userAnswers,
    markedQuestions
  }));

  const total = QUESTIONS[subject].length;
  const { correct, wrong, skipped } = calculateScore();
  const percent = Math.round((correct / total) * 100);

  resultName.innerText = `Name: ${studentName}`;
  resultSubject.innerText =
    `Subject: ${formatSubject(subject)} (${currentStream.toUpperCase()})`;
  scoreText.innerText = `${correct} / ${total}`;
  percentageText.innerText = `${percent}%`;

  correctCountEl.innerText = correct;
  wrongCountEl.innerText = wrong;
  skippedCountEl.innerText = skipped;
  timeSpentEl.innerText = formatDuration(elapsedSeconds);

  switchPage(testPage, resultPage);
}

function calculateScore() {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  QUESTIONS[subject].forEach((q, idx) => {
    const ans = userAnswers[idx];
    if (ans === null || ans === undefined) skipped++;
    else if (ans === q.answer) correct++;
    else wrong++;
  });

  return { correct, wrong, skipped };
}

/* ================= GRID ================= */
if (openGridBtn) openGridBtn.onclick = showGrid;
if (closeGridBtn) closeGridBtn.onclick = hideGrid;

function showGrid() {
  if (!gridOverlay) return;
  gridOverlay.classList.remove("hidden");
  gridOverlay.setAttribute("aria-hidden", "false");
}

function hideGrid() {
  if (!gridOverlay) return;
  gridOverlay.classList.add("hidden");
  gridOverlay.setAttribute("aria-hidden", "true");
}

function renderQuestionGrid() {
  if (!questionGrid || !gridMeta) return;
  const total = QUESTIONS[subject].length;
  questionGrid.innerHTML = "";
  gridMeta.innerText = `${total} Questions`;

  for (let i = 0; i < total; i++) {
    const btn = document.createElement("button");
    btn.className = "grid-btn";
    btn.innerText = i + 1;

    if (userAnswers[i] !== undefined && userAnswers[i] !== null) {
      btn.classList.add("answered");
    }
    if (markedQuestions[i]) {
      btn.classList.add("marked");
    }
    if (i === currentIndex) {
      btn.classList.add("current");
    }

    btn.onclick = () => goToQuestion(i);
    questionGrid.appendChild(btn);
  }
}

/* ================= UI HELPERS ================= */
function updateProgressUI() {
  const total = QUESTIONS[subject].length;
  const progress = Math.round(((currentIndex + 1) / total) * 100);
  progressBar.style.width = `${progress}%`;
  statusText.innerText = `Question ${currentIndex + 1} of ${total}`;
}

function updateMarkUI() {
  const isMarked = !!markedQuestions[currentIndex];
  markBtn.innerText = isMarked ? "Marked" : "Mark for Review";
  markStatus.innerText = isMarked ? "Marked" : "Not Marked";
  markStatus.classList.toggle("marked", isMarked);
}

function updateNavUI() {
  prevBtn.disabled = currentIndex === 0;
  prevBtn.style.opacity = prevBtn.disabled ? "0.6" : "1";
}

/* ================= RESET BUTTON ================= */
function renderResetButton() {
  const card = document.querySelector(".glass-card");
  if (!card || !currentStream) return;

  const old = document.getElementById("resetAllBtn");
  if (old) old.remove();

  const streamSubjects = STREAM_SUBJECT_MAP[currentStream].map(s => s.id);
  const completed = getCompletedSubjects(currentStream);

  const allDone = streamSubjects.every(s => completed.includes(s));
  if (!allDone) return;

  const btn = document.createElement("button");
  btn.id = "resetAllBtn";
  btn.className = "secondary-btn";
  btn.innerText = "Reset All Subjects";
  btn.onclick = resetAllSubjects;

  card.appendChild(btn);
}

function resetAllSubjects() {
  if (!confirm("इस स्ट्रीम के सभी विषय रीसेट कर दें?")) return;

  localStorage.removeItem(completedKey(currentStream));
  clearSavedProgress();
  localStorage.removeItem(REVIEW_KEY);
  location.reload();
}

/* ================= REVIEW ================= */
function showReview() {
  const data = JSON.parse(localStorage.getItem(REVIEW_KEY));
  if (!data) return;

  subject = data.subject;
  userAnswers = data.userAnswers || [];
  markedQuestions = data.markedQuestions || [];

  const reviewPage = document.getElementById("reviewPage");
  const reviewInfo = document.getElementById("reviewInfo");

  reviewInfo.innerText = `Subject: ${formatSubject(subject)}`;
  reviewPage.innerHTML = "";

  QUESTIONS[subject].forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `<h3>Q${i + 1}. ${q.q}</h3>`;

    q.options.forEach((opt, idx) => {
      const div = document.createElement("div");
      div.className = "review-option";

      if (userAnswers[i] === idx && idx === q.answer)
        div.classList.add("correct");
      else if (userAnswers[i] === idx)
        div.classList.add("wrong");
      else if (idx === q.answer)
        div.classList.add("right-answer");
      else if (userAnswers[i] === null || userAnswers[i] === undefined)
        div.classList.add("not-attempted");

      div.innerText = opt;
      card.appendChild(div);
    });

    if (markedQuestions[i]) {
      const tag = document.createElement("div");
      tag.className = "review-tag";
      tag.innerText = "Marked for Review";
      card.appendChild(tag);
    }

    reviewPage.appendChild(card);
  });
}

/* ================= STORAGE ================= */
function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    studentName,
    currentStream,
    subject,
    currentIndex,
    userAnswers,
    markedQuestions,
    elapsedSeconds: getElapsedSeconds()
  }));
}

function getSavedProgress() {
  const d = localStorage.getItem(PROGRESS_KEY);
  return d ? JSON.parse(d) : null;
}

function clearSavedProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

/* ================= TIMER HELPERS ================= */
function startElapsedTimer() {
  testStartedAt = Date.now();
}

function stopElapsedTimer() {
  if (!testStartedAt) return;
  elapsedSeconds += Math.floor((Date.now() - testStartedAt) / 1000);
  testStartedAt = null;
}

function getElapsedSeconds() {
  if (!testStartedAt) return elapsedSeconds;
  return elapsedSeconds + Math.floor((Date.now() - testStartedAt) / 1000);
}

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/* ================= UTILS ================= */
function formatSubject(s) {
  return s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function switchPage(a, b) {
  a.classList.remove("active");
  b.classList.add("active");
  setAppMode();
}

/* ================= THEME ================= */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
}

function setTheme(mode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

function applyTheme(mode) {
  document.body.classList.toggle("theme-dark", mode === "dark");
  themeToggles.forEach(toggle => {
    toggle.checked = mode === "dark";
  });
}

function setAppMode() {
  const inTest = testPage && testPage.classList.contains("active");
  document.body.classList.toggle("in-test", !!inTest);
}
