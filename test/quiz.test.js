const test = require("node:test");
const assert = require("node:assert/strict");
const QUESTIONS = require("../questions.js");
const { buildQuiz, suggestPoints, itemScore, grade } = require("../quiz.js");

test("question bank is well formed", () => {
  const ids = new Set();
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok([1, 2, 3, 4].includes(q.module), q.id);
    assert.ok(["theory", "code"].includes(q.kind), q.id);
    assert.ok(q.prompt.length > 10, q.id);
    if (q.kind === "code") assert.ok(q.code, `${q.id} is a scenario question without a scenario`);
    if (q.type === "mc") {
      assert.equal(q.options.length, 4, q.id);
      assert.equal(new Set(q.options).size, 4, `${q.id} has duplicate options`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
      assert.ok(q.explanation, q.id);
      assert.ok(!/(all|none) of the above/i.test(q.options.join(" ")), `${q.id} breaks under option shuffling`);
      const longestWrong = Math.max(...q.options.filter((_, i) => i !== q.answer).map((o) => o.length));
      assert.ok(q.options[q.answer].length <= Math.max(30, longestWrong * 1.2), `${q.id}: correct option is a giveaway by length`);
    } else {
      assert.equal(q.type, "open", q.id);
      assert.ok(q.modelAnswer && q.keyPoints.length >= 2, q.id);
      for (const p of q.keyPoints) assert.ok(p.text && p.keywords.length, q.id);
    }
  }
});

test("real quiz: 12 multiple choice + 3 open, theory before scenarios before open", () => {
  const quiz = buildQuiz(QUESTIONS, { mcCount: 12, openCount: 3 });
  assert.equal(new Set(quiz.map((it) => it.q.id)).size, 15, "no repeated questions");
  assert.deepEqual(quiz.map((it) => `${it.q.type}-${it.q.kind}`), [
    ...Array(10).fill("mc-theory"), ...Array(2).fill("mc-code"), ...Array(3).fill("open-theory"),
  ]);
});

test("quick quiz is only multiple choice and open quiz is only open questions", () => {
  const quick = buildQuiz(QUESTIONS, { mcCount: 6, openCount: 0 });
  assert.equal(quick.length, 6);
  assert.ok(quick.every((it) => it.q.type === "mc"));
  const open = buildQuiz(QUESTIONS, { mcCount: 0, openCount: 3 });
  assert.equal(open.length, 3);
  assert.ok(open.every((it) => it.q.type === "open"));
});

test("shuffled options still grade against the original answer", () => {
  for (let run = 0; run < 50; run++) {
    const [item] = buildQuiz(QUESTIONS, { mcCount: 1, openCount: 0 });
    assert.deepEqual([...item.order].sort(), [0, 1, 2, 3]);
    item.choice = item.order.indexOf(item.q.answer);
    assert.equal(itemScore(item), 1);
    item.choice = (item.choice + 1) % 4;
    assert.equal(itemScore(item), 0);
  }
});

test("open answers earn partial credit from the rubric", () => {
  const q = QUESTIONS.find((x) => x.id === "m4-o1");
  const text = "Entity integrity means the primary key can't be NULL.";
  const item = { q, text, points: suggestPoints(q, text) };
  assert.deepEqual(item.points, [true, false, false]);
  assert.equal(itemScore(item), 1 / 3);
  assert.equal(itemScore({ ...item, text: "  " }), 0, "blank answers score zero even if ticked");
});

test("grade aggregates totals and groups", () => {
  const mcQ = QUESTIONS.find((x) => x.type === "mc" && x.module === 1);
  const openQ = QUESTIONS.find((x) => x.type === "open" && x.module === 2);
  const items = [
    { q: mcQ, order: [0, 1, 2, 3], choice: mcQ.answer },
    { q: openQ, text: "x", points: openQ.keyPoints.map((_, i) => i === 0) },
  ];
  const g = grade(items);
  assert.equal(g.total, 2);
  assert.equal(g.groups["Module 1"].earned, 1);
  assert.equal(g.groups["Open question"].earned, 1 / openQ.keyPoints.length);
  assert.equal(g.percent, Math.round(((1 + 1 / openQ.keyPoints.length) / 2) * 100));
});
