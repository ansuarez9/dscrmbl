# Stage 2: optional practice tutorial

Stage 2 adds an optional two-word tutorial while preserving the existing daily and fallback practice flows.

## Behavior

- First-time players receive a one-time optional invitation, replacing automatic long instructions. Existing instruction history, daily records, and saved games are checked before the main game initializes. Skip, close, Escape, backdrop dismissal, and Read Instructions all consume the invitation without completing practice or starting a daily game.
- Help offers Start, Resume/Restart, or Replay Tutorial. Starting is blocked while a daily/fallback round is unfinished, including while its revealed-word/result flow is still active.
- CAT teaches watching and guessing; SUN encourages Replay. Both use the same reducer, scoring, dictionary validation, attempts, replay limits, letter animation, controls, and feedback as the main game. A ready step and countdown let the player read guidance before each initial flash. Input becomes available after that first flash; pointer Replay keeps an already-focused input active.
- The tutorial always uses Normal Mode. Its progress is stored only under `dscrmbl-tutorial-v1`; it never starts/resets the main round or records daily completion. Completion clears the unfinished run and keeps the completion flag. There is no tutorial sharing, ranking, record history, or theme explanation.
- Exit saves progress and returns to the landing screen. Refresh also returns there; Resume from Help preserves attempts, points, and replay costs without an automatic flash. Interrupted countdowns return to ready. Exhausted replays remain exhausted; Restart only replaces tutorial progress.
- Return actions follow current daily availability, including midnight rollover, and focus Play, View Results, recovery controls, or the landing heading. They never start a scored challenge automatically.

## Automated validation

- `npm test`: **589 passing tests across 11 files** (553 existing plus 36 tutorial tests).
- `npm run build`: passes; the existing bundle-size warning remains outside this stage.
- `git diff --check`: passes.
- Tests cover new/returning entry, every invitation dismissal, Help entry, keyboard-only completion, optional replay, invalid/wrong guesses, missed words, actual scoring, completion/manual replay, ready/countdown/flashing/guessing/result restoration, second-word score restoration, replay exhaustion, exit/restart, malformed/incompatible saves, session-only progress when tutorial storage fails, saved daily/fallback protection, unchanged daily stats and Hard Mode preference, loading/error/completed returns, midnight rollover, and motion-preference changes without extra flashes or replay costs.
- Axe reports no structural violations for invitation, ready, guessing, result, and summary. Contrast is disabled in these jsdom scans because jsdom does not measure rendered layout or colors.
- The existing Hard Mode restoration, replay protection, practice isolation, recovery, read-only results, rollover, explanation, modal, and accessibility regressions continue to pass.

## Desktop browser checks

The local preview was checked in the desktop in-app browser, not on a physical phone.

- At 320×568, 375×667, 390×844, and 667×320, document width matched viewport width. Watch controls met the 44px target minimum; Watch and Replay share one row.
- Initial invitation focus, ready-step heading focus, keyboard guess submission, Next/Finish focus, and summary heading focus were checked through CAT and SUN.
- Refresh returned to the regular game. Help offered Resume/Restart; Resume retained CAT's 19 points on SUN's ready step.
- Replay retained guess-input focus, reduced the visible remaining count from five to four, and kept unrevealed letters out of the accessibility tree.
- The observed run scored 19 for CAT and 17 for SUN after Replay, then showed 36 practice points and a summary without sharing controls.

## Remaining device checks

- Real iPhone Safari/Android Chrome with the software keyboard: guidance visibility, input/Replay/Submit reachability, rotation, and browser chrome. Viewport sizing does not emulate a phone keyboard.
- Spoken VoiceOver/TalkBack or equivalent: concise guidance/results, no unrevealed answers, and predictable focus. Accessibility-tree checks are not speech verification.
- Actual 200%/400% browser/text zoom and OS-level reduced motion. Automated preference changes and narrow desktop widths do not replace these checks.

No archive, general practice expansion, accounts, or visual redesign was introduced. The existing unrelated local settings modification was preserved.
