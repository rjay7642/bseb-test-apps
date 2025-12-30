/* ================= GLOBAL STATE ================= */
let studentName = "";
let currentStream = "";
let subject = "";
let currentIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 30;
let userAnswers = [];

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

function markSubjectCompleted(stream, subject) {
  const arr = getCompletedSubjects(stream);
  if (!arr.includes(subject)) {
    arr.push(subject);
    localStorage.setItem(completedKey(stream), JSON.stringify(arr));
  }
}

/* ================= ELEMENTS ================= */
const startPage = document.getElementById("startPage");
const testPage = document.getElementById("testPage");
const resultPage = document.getElementById("resultPage");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");

const questionText = document.getElementById("questionText");
const options = document.querySelectorAll(".option");
const timerEl = document.getElementById("timer");
const questionCount = document.getElementById("questionCount");

const resultName = document.getElementById("resultName");
const resultSubject = document.getElementById("resultSubject");
const scoreText = document.getElementById("scoreText");
const percentageText = document.getElementById("percentageText");

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.getAttribute("data-page");

  /* 🔹 REVIEW PAGE */
  if (pageType === "review") {
    showReview();
    return;
  }

  const streamSelect = document.getElementById("streamSelect");
  const subjectSelect = document.getElementById("subject");

  subjectSelect.disabled = true;

  streamSelect.addEventListener("change", () => {
    currentStream = streamSelect.value;
    subjectSelect.innerHTML = `<option value="">— Select Subject —</option>`;
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

  /* 🔹 RESUME CHECK */
  const saved = getSavedProgress();
  if (saved && saved.subject && saved.currentStream) {
    showResumeOption(saved);
  }
});

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
    currentIndex = saved.currentIndex;
    score = saved.score;
    userAnswers = saved.userAnswers || [];

    switchPage(startPage, testPage);
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
    alert("यह विषय पहले ही complete हो चुका है");
    return;
  }

  score = 0;
  currentIndex = 0;
  userAnswers = [];

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
    btn.onclick = () => selectOption(i);
  });

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
  if (i === QUESTIONS[subject][currentIndex].answer) score++;
  saveProgress();
  goNext();
}

/* ================= NEXT ================= */
nextBtn.onclick = goNext;

function goNext() {
  if (userAnswers[currentIndex] === undefined)
    userAnswers[currentIndex] = null;

  currentIndex++;
  saveProgress();

  if (currentIndex < QUESTIONS[subject].length) loadQuestion();
  else finishTest();
}

/* ================= FINISH ================= */
finishBtn.onclick = finishTest;

function finishTest() {
  clearInterval(timer);

  markSubjectCompleted(currentStream, subject);

  /* 🔥 IMPORTANT: RESUME DATA CLEAR ONLY HERE */
  clearSavedProgress();

  renderResetButton();

  localStorage.setItem(REVIEW_KEY, JSON.stringify({
    subject,
    userAnswers
  }));

  const total = QUESTIONS[subject].length;
  const percent = Math.round((score / total) * 100);

  resultName.innerText = `Name: ${studentName}`;
  resultSubject.innerText =
    `Subject: ${formatSubject(subject)} (${currentStream.toUpperCase()})`;
  scoreText.innerText = `${score} / ${total}`;
  percentageText.innerText = `${percent}%`;

  switchPage(testPage, resultPage);
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
  if (!confirm("इस stream के सभी subjects reset कर दें?")) return;

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
  userAnswers = data.userAnswers;

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
      else if (userAnswers[i] === null)
        div.classList.add("not-attempted");

      div.innerText = opt;
      card.appendChild(div);
    });

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
    score,
    userAnswers
  }));
}

function getSavedProgress() {
  const d = localStorage.getItem(PROGRESS_KEY);
  return d ? JSON.parse(d) : null;
}

function clearSavedProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

/* ================= UTILS ================= */
function formatSubject(s) {
  return s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function switchPage(a, b) {
  a.classList.remove("active");
  b.classList.add("active");
}
