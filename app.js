/* global QUESTIONS, buildQuiz, suggestPoints, itemScore, grade */
// UI layer: renders the four screens (mode picker → quiz → self-grading → results) into #app.

const app = document.getElementById("app");
const HISTORY_KEY = "adbquiz.history";
const PASS_MARK = 70;
const LETTERS = "ABCD";
// The real exam is 12 multiple choice + 3 open questions; the other two modes practise one part each.
const MODES = {
  real: { title: "Real quiz", detail: "12 multiple choice + 3 open questions, like the exam", mc: 12, open: 3 },
  quick: { title: "Quick quiz", detail: "12 multiple-choice questions only", mc: 12, open: 0 },
  open: { title: "Open quiz", detail: "3 open questions only", mc: 0, open: 3 },
};

let state = null; // { screen, mode, items, index, startedAt, finishedAt, timerId, saved }

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const isAnswered = (it) => (it.q.type === "mc" ? it.choice !== null : it.text.trim() !== "");

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // Storage unavailable (private mode); history is a convenience, so ignore.
  }
}

// ───────────── Mode picker ─────────────
function renderSetup() {
  state = null;
  const history = loadHistory();
  app.innerHTML = `
    <section class="card">
      <h2>Choose a quiz</h2>
      <p class="muted">Questions cover Modules 1–4 and are drawn at random every time. You can move freely between
      questions. Open answers are graded against a rubric after you submit.</p>
      <div class="modes">
        ${Object.entries(MODES).map(([k, m], i) => `
          <button class="mode ${i === 0 ? "featured" : ""}" data-mode="${k}">
            <strong>${m.title}</strong><span class="muted small">${m.detail}</span>
          </button>`).join("")}
      </div>
    </section>
    ${history.length ? `
    <section class="card">
      <div class="row spread"><h2>Your attempts</h2><button class="link" data-act="clear-history">Clear</button></div>
      <table>
        <thead><tr><th>Date</th><th>Quiz</th><th class="num">Questions</th><th class="num">Score</th></tr></thead>
        <tbody>${history.map((h) => `
          <tr><td>${esc(new Date(h.date).toLocaleString())}</td><td>${esc(MODES[h.mode]?.title ?? "")}</td>
          <td class="num">${h.total}</td><td class="num">${h.percent}%</td></tr>`).join("")}
        </tbody>
      </table>
    </section>` : ""}`;
}

function startQuiz(mode) {
  const m = MODES[mode];
  state = {
    screen: "quiz",
    mode,
    items: buildQuiz(QUESTIONS, { mcCount: m.mc, openCount: m.open }),
    index: 0,
    startedAt: Date.now(),
    saved: false,
  };
  state.timerId = setInterval(tick, 1000);
  renderQuestion();
}

// ───────────── Quiz ─────────────
const timerText = () => `⏱ ${fmt(Math.floor((Date.now() - state.startedAt) / 1000))}`;

function tick() {
  const el = document.getElementById("timer");
  if (el) el.textContent = timerText();
}

function navClass(it, i) {
  return [isAnswered(it) && "answered", it.flagged && "flagged", i === state.index && "current"].filter(Boolean).join(" ");
}

function updateProgress() {
  const { items } = state;
  document.querySelector(".progress > span").style.width = `${(items.filter(isAnswered).length / items.length) * 100}%`;
  document.querySelector(`[data-goto="${state.index}"]`).className = navClass(items[state.index], state.index);
}

function renderQuestion() {
  const { items, index } = state;
  const it = items[index];
  const q = it.q;
  const last = index === items.length - 1;
  app.innerHTML = `
    <div class="topbar">
      <strong>Question ${index + 1} of ${items.length}</strong>
      <span class="timer" id="timer" role="timer">${timerText()}</span>
    </div>
    <div class="progress" aria-hidden="true"><span style="width: ${(items.filter(isAnswered).length / items.length) * 100}%"></span></div>
    <nav class="nav" aria-label="Question navigator">
      ${items.map((x, i) => `<button type="button" data-goto="${i}" class="${navClass(x, i)}"
        aria-label="Question ${i + 1}${isAnswered(x) ? ", answered" : ""}${x.flagged ? ", flagged" : ""}">${i + 1}</button>`).join("")}
    </nav>
    <section class="card">
      <div class="badges">
        <span class="badge">Module ${q.module}</span>
        <span class="badge">${q.type === "mc" ? "Multiple choice" : "Open question"}</span>
        ${q.kind === "code" ? '<span class="badge code">Scenario</span>' : ""}
      </div>
      <p class="prompt" id="prompt">${esc(q.prompt)}</p>
      ${q.code ? `<pre><code>${esc(q.code)}</code></pre>` : ""}
      ${q.type === "mc"
        ? `<div class="options" role="radiogroup" aria-labelledby="prompt">
            ${it.order.map((orig, i) => `
              <label class="option"><input type="radio" name="opt" value="${i}" ${it.choice === i ? "checked" : ""}>
              <span class="letter">${LETTERS[i]}</span><span>${esc(q.options[orig])}</span></label>`).join("")}
          </div>`
        : `<textarea id="open-answer" aria-labelledby="prompt" placeholder="Write your answer as you would in the exam…">${esc(it.text)}</textarea>`}
    </section>
    <div class="row spread">
      <div class="row">
        <button data-act="prev" ${index === 0 ? "disabled" : ""}>← Previous</button>
        <button data-act="flag">${it.flagged ? "Unflag" : "Flag for review"}</button>
      </div>
      <div class="row">
        ${last ? "" : '<button class="primary" data-act="next">Next →</button>'}
        <button data-act="submit" class="${last ? "primary" : ""}">Submit quiz</button>
      </div>
    </div>
    <p class="muted small kbd-hint">Shortcuts: 1–4 or A–D to answer · ← → to move · F to flag</p>`;
}

function go(i) {
  if (i < 0 || i >= state.items.length) return;
  state.index = i;
  renderQuestion();
}

function submit() {
  const missing = state.items.filter((it) => !isAnswered(it)).length;
  if (missing && !confirm(`You have ${missing} unanswered question${missing > 1 ? "s" : ""}. Submit anyway?`)) return;
  clearInterval(state.timerId);
  state.finishedAt = Date.now();
  const open = state.items.filter((it) => it.q.type === "open" && it.text.trim());
  open.forEach((it) => (it.points = suggestPoints(it.q, it.text)));
  if (open.length) renderSelfGrade();
  else renderResults();
}

// ───────────── Self-grading of open answers ─────────────
function renderSelfGrade() {
  state.screen = "grade";
  const blocks = state.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.q.type === "open" && it.text.trim())
    .map(({ it, i }) => `
      <section class="card">
        <div class="badges"><span class="badge">Question ${i + 1}</span><span class="badge">Module ${it.q.module}</span></div>
        <p class="prompt">${esc(it.q.prompt)}</p>
        ${it.q.code ? `<pre><code>${esc(it.q.code)}</code></pre>` : ""}
        <h3>Your answer</h3>
        <p class="user-answer">${esc(it.text)}</p>
        <h3>Model answer</h3>
        <p class="model-answer">${esc(it.q.modelAnswer)}</p>
        <h3>Rubric: tick each point your answer covers</h3>
        <ul class="checklist">
          ${it.q.keyPoints.map((p, j) => `
            <li><label><input type="checkbox" data-item="${i}" data-point="${j}" ${it.points[j] ? "checked" : ""}> ${esc(p.text)}</label></li>`).join("")}
        </ul>
      </section>`)
    .join("");
  app.innerHTML = `
    <section class="card">
      <h2>Grade your open answers</h2>
      <p class="muted">Points were pre-ticked by keyword matching. Be honest: untick anything you did not really explain, and tick anything you covered in other words.</p>
    </section>
    ${blocks}
    <div class="row"><button class="primary" data-act="results">See my results</button></div>`;
  window.scrollTo(0, 0);
}

// ───────────── Results ─────────────
function renderResults() {
  state.screen = "results";
  const g = grade(state.items);
  const seconds = Math.round((state.finishedAt - state.startedAt) / 1000);
  if (!state.saved) {
    saveHistory([{ date: new Date().toISOString(), mode: state.mode, total: g.total, percent: g.percent }, ...loadHistory()]);
    state.saved = true;
  }
  const pass = g.percent >= PASS_MARK;
  app.innerHTML = `
    <section class="card">
      <div class="row spread">
        <div>
          <div class="score">${g.percent}%</div>
          <div class="verdict ${pass ? "pass" : "fail"}">${pass ? "Pass" : "Below the pass mark"} (${PASS_MARK}%)</div>
        </div>
        <div class="muted small">
          ${MODES[state.mode].title}<br>
          ${Math.round(g.earned * 10) / 10} / ${g.total} points<br>
          Time used: ${fmt(seconds)}
        </div>
      </div>
      <h3>Breakdown</h3>
      <div class="bars">
        ${Object.entries(g.groups).sort().map(([k, v]) => {
          const pct = Math.round((v.earned / v.total) * 100);
          return `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><span style="width: ${pct}%"></span></div><span class="small">${pct}%</span></div>`;
        }).join("")}
      </div>
      <div class="row" style="margin-top: 18px">
        <button class="primary" data-act="retake">New ${esc(MODES[state.mode].title.toLowerCase())}</button>
        <button data-act="setup">Choose another quiz</button>
      </div>
    </section>
    <div class="row spread">
      <h2>Review</h2>
      <label class="small"><input type="checkbox" id="only-mistakes"> Only show mistakes</label>
    </div>
    <div id="review">${state.items.map(reviewItem).join("")}</div>`;
  window.scrollTo(0, 0);
}

function reviewItem(it, i) {
  const q = it.q;
  const s = itemScore(it);
  const status = s === 1 ? "correct" : s === 0 ? "wrong" : "partial";
  const head = `
    <div class="badges">
      <span class="badge">Q${i + 1}</span><span class="badge">Module ${q.module}</span>
      ${q.kind === "code" ? '<span class="badge code">Scenario</span>' : ""}
      <span class="badge">${q.type === "mc" ? `${s} / 1` : `${Math.round(s * 100)}%`}</span>
    </div>
    <p class="prompt">${esc(q.prompt)}</p>
    ${q.code ? `<pre><code>${esc(q.code)}</code></pre>` : ""}`;
  if (q.type === "mc") {
    const picked = it.choice === null ? null : it.order[it.choice];
    return `<section class="card review-item ${status}">${head}
      ${picked === null ? '<div class="answer-line bad">You did not answer.</div>'
        : picked !== q.answer ? `<div class="answer-line bad">Your answer: ${esc(q.options[picked])}</div>` : ""}
      <div class="answer-line good">Correct answer: ${esc(q.options[q.answer])}</div>
      <p class="explanation">${esc(q.explanation)}</p>
    </section>`;
  }
  return `<section class="card review-item ${status}">${head}
    <h3>Your answer</h3>
    <p class="user-answer">${it.text.trim() ? esc(it.text) : '<span class="muted">No answer.</span>'}</p>
    <h3>Model answer</h3>
    <p class="model-answer">${esc(q.modelAnswer)}</p>
    <ul class="checklist">${q.keyPoints.map((p, j) => `<li>${it.text.trim() && it.points[j] ? "✅" : "❌"} ${esc(p.text)}</li>`).join("")}</ul>
  </section>`;
}

// ───────────── Events ─────────────
app.addEventListener("click", (e) => {
  const mode = e.target.closest("[data-mode]");
  if (mode) return startQuiz(mode.dataset.mode);
  const goto = e.target.closest("[data-goto]");
  if (goto) return go(Number(goto.dataset.goto));
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "prev") go(state.index - 1);
  else if (act === "next") go(state.index + 1);
  else if (act === "flag") {
    state.items[state.index].flagged = !state.items[state.index].flagged;
    renderQuestion();
  } else if (act === "submit") submit();
  else if (act === "results") renderResults();
  else if (act === "retake") startQuiz(state.mode);
  else if (act === "setup") renderSetup();
  else if (act === "clear-history" && confirm("Delete all saved attempts?")) {
    saveHistory([]);
    renderSetup();
  }
});

app.addEventListener("change", (e) => {
  const t = e.target;
  if (t.name === "opt") {
    state.items[state.index].choice = Number(t.value);
    updateProgress();
  } else if (t.dataset.point !== undefined) {
    state.items[Number(t.dataset.item)].points[Number(t.dataset.point)] = t.checked;
  } else if (t.id === "only-mistakes") {
    document.querySelectorAll("#review .review-item.correct").forEach((el) => (el.hidden = t.checked));
  }
});

app.addEventListener("input", (e) => {
  if (e.target.id !== "open-answer") return;
  state.items[state.index].text = e.target.value;
  updateProgress();
});

document.addEventListener("keydown", (e) => {
  if (state?.screen !== "quiz" || e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === "TEXTAREA") return;
  const it = state.items[state.index];
  const key = e.key.toLowerCase();
  const opt = "1234".indexOf(key) >= 0 ? "1234".indexOf(key) : "abcd".indexOf(key);
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    go(state.index + (e.key === "ArrowRight" ? 1 : -1));
  } else if (key === "f") {
    it.flagged = !it.flagged;
    renderQuestion();
  } else if (it.q.type === "mc" && opt >= 0) {
    it.choice = opt;
    renderQuestion();
  }
});

window.addEventListener("beforeunload", (e) => {
  if (state?.screen === "quiz") e.preventDefault();
});

renderSetup();
