# Turner’s Teach Tree

A *tech tree* unlocks new abilities one branch at a time. This is a *teach
tree*: every scenario unlocks a new piece of programming.

Interactive pseudocode practice for an intro computer science class. Each
scenario is a short program — variables, math, comparisons, AND / OR / NOT and
IF / ELSE IF / ELSE — that drives a small animated picture. Students:

1. **Set the memory** — click the variable boxes, or pick a ready-made situation.
2. **Predict** which part of the IF will run (turn on *Predict first*).
3. **Run** or **Step** through the code. The *Step by step* panel shows every
   condition being simplified until it is TRUE or FALSE.
4. **Change the code** — swap AND for OR, change `≥` to `>`, switch off a NOT,
   edit a number — and see what breaks.

The code can be shown as **blocks** or as **pseudocode**, and the ⚙ button
switches notation (`←` or `=` for assignment, `= ≠ ≤ ≥` or `== != <= >=`).

## Pages

| page | what it does |
|---|---|
| Scenarios (home) | eight scenarios, each with challenges that check themselves |
| Warm-Up | AND / OR / NOT with truth tables, a comparison tester, an assignment walkthrough, and a rapid-fire TRUE-or-FALSE quiz |
| Cheat Sheet | every symbol and keyword on one page |

## Running it

It is a static site: plain HTML, CSS and JavaScript with no build step and no
outside downloads. Open `index.html` in a browser, or serve the folder with any
web server. It is published with GitHub Pages from the `main` branch.

Challenge progress and settings are saved in each browser's local storage.
Nothing is sent anywhere.

## Adding a scenario

Scenarios live in `js/scenarios.js` and their pictures in `js/scenes.js`. A
scenario lists its variables, builds its program with the helpers in
`js/engine.js` (`B.set`, `B.iff`, `B.and`, `B.cmp`, ...), and gives presets,
challenges and discussion questions. The comment at the top of
`js/scenarios.js` describes each field.
