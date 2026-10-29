// Pure quiz logic: selection, shuffling and scoring. No DOM access, so it runs in Node tests too.

const CODE_SHARE = 0.2; // about 1 in 5 multiple-choice questions is a scenario to interpret ("code" kind)

function shuffle(items, rand = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks n questions of one type, aiming for CODE_SHARE code questions and topping up from
// whatever is left if a bucket runs short.
function pickType(pool, n, rand) {
  const code = shuffle(pool.filter((q) => q.kind === "code"), rand);
  const theory = shuffle(pool.filter((q) => q.kind !== "code"), rand);
  const nCode = Math.min(code.length, Math.round(n * CODE_SHARE));
  const picked = [...code.slice(0, nCode), ...theory.slice(0, n - nCode)];
  const rest = [...theory.slice(n - nCode), ...code.slice(nCode)];
  return [...picked, ...rest.slice(0, n - picked.length)];
}

// Theory before code; sort is stable, so the random order within each kind is kept.
const theoryFirst = (a, b) => (a.kind === "code") - (b.kind === "code");

// Returns quiz items in exam order: theory MC, scenario MC, then open questions.
// MC options are shuffled; `order` maps display index → original index.
function buildQuiz(bank, { mcCount, openCount }, rand = Math.random) {
  const mc = bank.filter((q) => q.type === "mc");
  const open = bank.filter((q) => q.type === "open");
  const nMc = Math.min(mc.length, mcCount);
  const nOpen = Math.min(open.length, openCount);
  return [
    ...shuffle(pickType(mc, nMc, rand), rand).sort(theoryFirst).map((q) => ({ q, order: shuffle([0, 1, 2, 3], rand), choice: null, flagged: false })),
    ...shuffle(pickType(open, nOpen, rand), rand).sort(theoryFirst).map((q) => ({ q, text: "", points: q.keyPoints.map(() => false), flagged: false })),
  ];
}

// Pre-ticks the key points whose keywords appear in the answer; the student reviews and adjusts.
function suggestPoints(question, text) {
  const t = ` ${text.toLowerCase()} `;
  return question.keyPoints.map((p) => p.keywords.some((k) => t.includes(k.toLowerCase())));
}

// Score of one item in [0, 1]. Open questions earn partial credit per key point.
function itemScore(item) {
  if (item.q.type === "mc") return item.choice !== null && item.order[item.choice] === item.q.answer ? 1 : 0;
  if (!item.text.trim()) return 0;
  return item.points.filter(Boolean).length / item.points.length;
}

function grade(items) {
  const groups = {};
  const add = (key, s) => {
    groups[key] ??= { earned: 0, total: 0 };
    groups[key].earned += s;
    groups[key].total += 1;
  };
  let earned = 0;
  for (const it of items) {
    const s = itemScore(it);
    earned += s;
    add(`Module ${it.q.module}`, s);
    add(it.q.type === "mc" ? "Multiple choice" : "Open question", s);
    add(it.q.kind === "code" ? "Scenario" : "Theory", s);
  }
  return { earned, total: items.length, percent: items.length ? Math.round((earned / items.length) * 100) : 0, groups };
}

if (typeof module !== "undefined") module.exports = { shuffle, buildQuiz, suggestPoints, itemScore, grade, CODE_SHARE };
