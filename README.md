# Requack

**Spaced repetition for interview prep, with a rubber duck.**

You solved Two Sum in September. Could you solve it today? Requack schedules when to re-test everything you practise, makes you explain it to a duck before you see your notes, and trains you to review code the way OAs now ask: whole codebases with one bug in them.

**Live:** https://andreasm79.github.io/requack/

<p>
  <img src="docs/today.png" width="260" alt="Today: due recalls, streak and the daily progress bar">
  <img src="docs/progress.png" width="260" alt="Progress: tiles, recall forecast and mastery by topic">
  <img src="docs/mock-oa.png" width="260" alt="Mock OA rules screen in light mode">
</p>

<img src="docs/solve.png" width="800" alt="The editor: problem statement, Python or JavaScript, run against hidden tests">

<img src="docs/fix-and-test.png" width="800" alt="Fix & test: edit a repo, run its tests in a terminal, then submit against hidden acceptance tests">

<img src="docs/repo-hunt.png" width="800" alt="A repo hunt: file tree, grep across files and the incident ticket">

## What it does

- **Write and run code.** 29 problems run in the browser, in Python (Pyodide) or JavaScript, against about 25 hidden tests each, with time limits, output and tracebacks. Statements are original, and each maps to a NeetCode 150 problem.
- **Coding OA.** Pick any list and the duck draws 2 to 4 random problems from it. Timed, fullscreen, copy and paste blocked, hidden inputs stay hidden, and you get a score and an integrity report.
- **Your own lists.** Paste a company list, a Discord pin or spreadsheet rows. Known problems are matched (including the runnable ones) and the rest are added with their links. Or build lists from problem pages.
- **Recall queue.** Log a solve with the trick in one line. Each problem comes back right before you'd forget it: tomorrow on a FAIL, weeks out on an O(1).
- **Duck recall.** On recall day you explain the approach first, then see your notes and grade yourself. One button runs every due recall back to back.
- **Repo hunts.** Eight multi-file codebases (8 to 13 files) with a file tree, grep and an incident ticket. Six are modelled on real public write-ups: Cloudflare's 2019 regex outage, CrowdStrike's Channel File 291, Knight Capital, Log4Shell, Apple's goto fail and the Mars Climate Orbiter, with the source linked once you've solved it.
- **Fix & test.** The five Python and JavaScript repos open in an IDE: edit any file, run the repo's own tests in a terminal, and submit your fix against hidden acceptance tests. The Java and C repos are review-only.
- **Snippet hunts.** 24 short ones in Python, JavaScript, Java, SQL and C.
- **Code review OA.** Two snippets and a repo, timed and proctored the same way.
- **Add anything.** Coding, system design, behavioural, concepts, with your own topic, question and link.
- **Already solved some?** Tick them in bulk and they join the queue spread over two weeks.
- **Progress.** Mastery by topic, weakest topic with a one-tap drill, 14-day forecast, streak, and a stats block to paste in Discord.
- **Daily reminder.** A repeating Google Calendar event or an .ics file.
- **Light and dark**, keyboard shortcuts (`/` search, Enter, 1 to 4 to grade), undo on every grade.
- **No account, no server.** Data stays in your browser, with export and restore. Python downloads once per visit (about 10 MB) the first time you run it.

Inside Claude, the Bugs page can also generate hunts: a quick snippet, or a whole practice repo built from a bug report you paste in. That needs Claude, so it's hidden on GitHub Pages.

## Run it

No build step.

```
npm start              # serves on http://localhost:8080
npm test               # unit tests, Node 22+
npm run build:hunts    # after editing anything in hunts-src/
npm run build:problems # after editing problems-src/bank.mjs
```

## Add a bug hunt

Each hunt is a folder in `hunts-src/`:

```
hunts-src/my-hunt/
  hunt.json    title, lang, difficulty, tag, ticket, explanation, optional source
  fix.txt      the corrected code
  repo/        the files, exactly as the player sees them
```

Start every buggy line with `!!` (before the indentation). For a Python or JavaScript repo, add an `acceptance/` folder with tests that fail with the bug and pass once it's fixed; that turns on Fix & test. Add the folder name to `ORDER` in `scripts/build-hunts.mjs`, then run `npm run build:hunts`. A test fails if the generated file is out of date.

## Add a runnable problem

Add an entry to `problems-src/bank.mjs`: an original statement, examples, a reference solution and a random input generator. `npm run build:problems` generates the tests. Use the NeetCode slug as the id so lists and recalls pick it up.

## Structure

```
index.html
css/styles.css
hunts-src/              repo and snippet hunts as plain files, with hidden acceptance tests
problems-src/bank.mjs   runnable problems: statements, reference solutions, generators
scripts/                build steps for both, with freshness tests
js/app.js               router, shortcuts, command palette wiring
js/data/                NeetCode 150 / Blind 75, snippet hunts, generated repo hunts
js/core/                scheduler, stats, storage, lists, judge, reminders (no DOM)
js/ui/runtime.js        Python (Pyodide) and JavaScript workers with time limits
js/ui/                  editor, solve screen, repo IDE, OA modes, proctoring, sheets, theme
css/vendor/             CodeMirror 5.65.16 stylesheet (MIT)
js/ui/views/            Today, Problems, Bugs, Progress, More
tests/                  node:test suites for the core and the hunt data
```

## Schedule

SM-2 style. First attempt: 1, 2, 4 or 7 days depending on how it went. After that a good recall multiplies the interval by the card's ease (starts at 2.5), a shaky one grows it by 20%, an instant one by ease × 1.3, and a fail resets it to 1 day and lowers the ease. Intervals cap at 180 days. An item is mastered once its interval reaches 21 days.

Requack is not affiliated with LeetCode, NeetCode, HackerRank or CodeSignal. Built for the DUCSS Project of the Month, November 2026.
