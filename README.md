# Advanced Databases Quiz Simulator

A practice quiz for **Advanced Databases (MCAI 510), Modules 1–4**. Pick one of three quiz types. Questions are drawn at random from a bank of 204, every attempt is scored, and every question comes with an explanation.

**Live:** https://alanjuker.github.io/advanced-databases-quiz-simulator/

| Quiz | What you get |
| --- | --- |
| **Real quiz** | 12 multiple choice + 3 open questions, like the exam |
| **Quick quiz** | 12 multiple-choice questions only |
| **Open quiz** | 3 open questions only |

| Module | Topics |
| --- | --- |
| 1 · Concepts & architectures | Database vs DBMS vs database system, metadata and catalog, DBMS characteristics, data models, schema vs instance, three-schema architecture, data independence, DDL/DML, interfaces, centralized/two-tier/three-tier/distributed/cloud, database types |
| 2 · Storage, buffers & indexing | Storage hierarchy, blocks and disk access cost, buffer pool, pin-count and dirty bit, LRU/FIFO/clock, records and file headers, heap/sorted/hashed files, primary/clustering/secondary indexes, RAID, NAS/SAN, storage tiering |
| 3 · Specialized data models | Hierarchical, active (triggers, ECA), temporal (valid/transaction time, bitemporal), spatial (range, nearest-neighbour, spatial join), multimedia, deductive (Datalog), plus the Module 3 in-class activities |
| 4 · Schema design & integrity | Relations, domains, atomic values, NULL meanings, superkeys/candidate/primary keys, constraint types, entity and referential integrity, restrict/cascade/set NULL, transactions, design-to-storage alignment, plus the Module 4 in-class activities |

## How a quiz works

- **Style:** the questions test understanding, not memorisation. You identify the concept, pick the right model or design, or spot which rule a scenario breaks, and there are no calculations. Open questions ask one thing each and can be answered in 2–3 sentences.
- **Order:** theory questions first, then scenario questions (a schema, some rows, a buffer state, a rule to interpret), then the open questions.
- **During the quiz:** a question navigator, flags, an elapsed-time clock, and keyboard shortcuts (`1`–`4` / `A`–`D` to answer, `←` `→` to move, `F` to flag).
- **Open answers:** after you submit, you see the model answer and a rubric. Points are pre-ticked by keyword matching, and you confirm or correct them. Each open answer earns partial credit.
- **Results:** your score against a 70% pass mark, a breakdown by module and question type, and a full review with explanations. Past attempts are saved in your browser.

Multiple-choice options are shuffled on every attempt, and a test checks that the correct option is never noticeably longer than the others.

## Run locally

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
npm start          # python3 -m http.server 8000 → http://localhost:8000
```

## Tests

```bash
npm test           # node --test (Node 20+)
```

The tests check that the question bank is well formed, that each quiz type has the right number and order of questions, that grading still matches after the options are shuffled, and that open answers get the right partial credit. CI runs them on every push.

## Project structure

```
index.html        page shell
styles.css        light/dark theme, responsive layout
questions.js      question bank (edit here to add questions)
quiz.js           pure logic: selection, shuffling, scoring
app.js            UI: quiz picker → quiz → self-grading → results
test/             node:test suite
```

### Adding a question

Append an object to `QUESTIONS` in `questions.js`:

```js
{
  id: "m4-35", module: 4, type: "mc", kind: "theory",   // kind: "theory" | "code" (scenario to interpret)
  prompt: "…", code: "optional schema, rows or rule",
  options: ["correct", "distractor", "distractor", "distractor"],
  answer: 0,                                            // index into options
  explanation: "Why the answer is correct.",
}
```

Open questions use `type: "open"` with `modelAnswer` and `keyPoints: [{ text, keywords: [] }]`. Run `npm test` to validate the bank.

## Disclaimer

This is an unofficial study aid. The questions are written from the Module 1–4 readings and in-class activities, and they are not the professor's actual exam.

## License

[MIT](LICENSE)
