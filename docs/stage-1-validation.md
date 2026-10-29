# Stage 1 validation

Stage 1 implements compact gameplay and shared accessibility behavior. It does not add a practice tutorial, change scoring or saved-game formats, or provide a nonvisual replacement for the flashing puzzle.

## Automated checks

- `npm test`: 553 passing tests across 10 files (526 existing, 27 added).
- `npm run build`: passes. The existing large-bundle warning remains outside this stage.
- `git diff --check`: passes.
- New keyboard coverage exercises native form submission, empty/invalid input, persistent errors, correction, repeated guesses, complete rounds, and useful focus after automatic Results.
- Shared-modal coverage exercises all three dialogs: initial focus, Tab/Shift+Tab wrapping, Escape, background isolation, backdrop policy, exit transitions, removed openers, restoration, and Strict Mode. App coverage checks cancellation of pending input focus, uninterrupted Hard Mode deadlines, and replacement of an open dialog by automatic Results.
- Motion coverage changes the media-query preference during score roll-up and confetti, checks cancellation/cleanup, and verifies that letter scheduling and replay triggers stay unchanged. CSS keeps the same 300ms letter animation and changes only its decorative transform/filter variables under reduced motion.
- Axe scans idle, playing, validation, Instructions, Contact, completed Results (including explanation content), and recovery states with no structural violations. These run in jsdom with contrast disabled because jsdom cannot measure rendered layout or contrast.
- Existing daily/practice isolation, scores/streaks, deadline/restoration, refresh replay protection, theme recovery, read-only results, midnight rollover, and explanation tests continue to pass.
- Contact delivery and sharing are mocked in tests; no real Contact message was submitted.

## Desktop browser checks performed

These were performed in the desktop in-app browser against the local Vite app. They are **not real-device checks**.

- Active gameplay at 320×568, 375×667, and 390×844: document scroll width equals viewport width; enabled play controls have at least 44×44 CSS-pixel targets.
- Short landscape viewport at 667×320: no horizontal document overflow; vertical document scrolling remains available.
- Instructions, Contact, and completed Results at 320px: modal content width fits its container without horizontal overflow. Long result words fit/wrap.
- Instructions receives initial focus, Shift+Tab stays inside it, Escape closes it, and background controls disappear from the accessibility tree while it is open. Contact opens without focusing a text field.
- Empty and invalid submissions keep the guess input focused, retain invalid text, and show associated feedback. A complete local round was played with keyboard submission and Next activation; automatic Results received focus, Escape restored View Results, and Enter reopened the saved result.
- Word-position and correct-answer announcements are screen-reader-only; the visible word-length clue remains beneath the letter display. Incorrect-guess and failure feedback stays visible.
- Unrevealed letter text is absent from the browser accessibility tree. Revealed answers and stable final scores are present. Timer ticks are not live announcements.
- Computed foreground/background spot checks were performed across dark/light gameplay and modal text. Low-contrast light-theme error text was corrected. These spot checks do not replace a full rendered accessibility audit of gradients, effects, every game state, or assistive technology.

## Acceptance checks still unverified

No real iPhone/Android browser or spoken screen-reader session was available through the connected browser tools. Desktop viewport sizing does not simulate a software keyboard, mobile browser chrome, native sharing, or VoiceOver/TalkBack speech.

- **Real phone keyboards:** iPhone Safari and Android Chrome; keyboard opening, repeated invalid/incorrect guesses, Submit, Replay, reveal/Next, rotation, browser chrome changes, safe areas, and Contact fields. Verify input, error text, and relevant actions remain reachable without repeated layout jumps. Record phone model, OS, and browser version.
- **Screen readers:** VoiceOver/Safari or an equivalent combination; control names and states, concise instructions/errors, restrained result speech, silent timer ticks, modal containment/restoration, and no unrevealed answers.
- **Actual browser zoom:** 200% and 400%. Zoom shortcuts had no measurable effect in the connected in-app browser, so these are not claimed as tested. The 320px viewport check covers a narrow reflow condition, not actual page/text zoom.
- **OS-level reduced motion:** toggle during gameplay and celebrations in a real browser. Verify decorative effects stop while the letter exposure remains 300ms and deadlines/replay costs remain unchanged. Runtime preference changes are covered by automated tests, but OS/browser integration remains unverified.

If phone testing shows the compact document layout needs a separate play screen, a fixed keyboard-following toolbar, or substantial viewport-management logic, record the failing scenario and split that larger layout work before implementation. Stage 1 introduces none of those structures.
