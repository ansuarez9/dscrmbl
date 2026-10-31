# Results and personal progress

## Behavior and storage

- Stats is available alongside How to Play while idle, before play and after completion, including daily-theme loading and recovery. It receives no puzzle/result snapshot and cannot share a score. Active daily/fallback rounds and the practice tutorial do not offer Stats.
- Results and Stats share lifetime cards and a native Your Progress disclosure. Results keeps score sharing above explanations and progress. The disclosure resets on reopening.
- Lifetime totals and historical ranking continue to include all previously recorded daily games across modes. Current streak still means consecutive first-guess word solves without Replay, not consecutive days. Missed-day streak resets are derived without storage writes.
- `dscrmbl-daily.progress` uses `{ version: 1, records: { [challengeDate]: { challengeDate, score, mode, wordResults } } }`. Dates identify the original local challenge day; mode is explicitly `normal` or `hard`. Each record has five outcomes and no answer or explanation text. Existing aggregates and the latest detailed result retain their formats; new latest results also save mode.
- Recent results show the latest 10 challenge dates. Per-mode scores and rates use every valid tracked record. Both rates divide by all five words per game; first-try accuracy requires a solved word, one guess, and no replay. Empty modes have unavailable rates. Dates/modes/outcomes are never fabricated for aggregate-only history. A latest result is imported only during completion persistence when it explicitly contains consistent date, mode and complete outcomes.
- Daily completion writes aggregates, latest result and dated progress in one storage write. It re-reads data inside a shared Web Lock where supported, deduplicates by date, and retains session guards. Without Web Locks, synchronous read/check/write offers no transactional cross-tab guarantee.
- Completed daily game state remains recoverable until statistics are acknowledged. Failed writes also attempt to save a temporary completion journal under `dscrmbl-pending-daily-v1`, so starting a subsequent round need not discard an unsaved completion. The journal contains temporary completion inputs, including the existing result/theme snapshot, and is cleared after success. It is retried on application restoration or subsequent completion, never by opening a statistics dialog.
- Storage failures preserve usable session results and expose a status message. History is retained indefinitely, subject to browser storage quota; no silent pruning changes rate denominators. Browser/device/origin storage is finite and has no backup/sync. Clearing site data removes history. If all writes fail, durable recovery across refresh is impossible.

## Automated validation

- `npm test`: 628 passing tests across 13 files (589 baseline; 39 added).
- `npm run build`: passes; the existing dictionary/bundle-size warning remains.
- `git diff --check`: passes.
- Added coverage includes mode-separated score/rate metrics, explicit denominators, first-guess replay exclusion, misses/timeouts, 10-row presentation versus complete metric history, invalid dates/outcomes, older aggregate compatibility, eligible latest-result import, duplicate completion across calls/remounts/dates, concurrent Web Lock recording, recovery journals including another tab's journal, quota/blocked storage, malformed JSON, preservation of newer latest results during older completion recovery, and read-only storage access.
- App coverage verifies spoiler-free Stats, shared progress content, collapsed disclosure reopening, keyboard modal entry/containment/Escape/focus restoration, no writes on viewing or midnight rollover, hidden Stats during gameplay, recovery access, and original-date/Hard Mode completion restoration. Expanded Stats passes structural axe checks; jsdom contrast checking remains disabled.
- Sharing coverage verifies the existing exact text and optional link, clipboard/native paths, no progress/answers/explanations, and quiet cancellation without a clipboard side effect. Sharing is mocked; no result was sent externally.
- All existing deadline restoration, refresh replay protection, midnight, fallback practice, tutorial, explanation, reduced-motion and accessibility regressions pass.

## Desktop browser validation

These checks used the in-app desktop browser, not physical devices.

- Played a local Normal Mode daily to completion, confirmed automatic Results, recorded mode/date/outcomes, closed results, and opened Stats. The five clean solves produced 100% (5 of 5) for both rates; Hard Mode remained empty.
- Expanded detailed Stats in dark and light themes at 320×568, 375×667, 390×844 and 667×320. Document width matched viewport width; modal content had no horizontal overflow at every size. Vertical scrolling remained available.
- Verified native Enter activation of Your Progress in a real browser (jsdom does not implement native summary keyboard activation), initial dialog focus, Escape restoration to Stats, and 44px Share Score/disclosure/close targets.
- Checked narrow completed Results with long words and expanded progress. Content stays within the modal; the pre-existing high-score decorative border extends its scrollable box by 2px. The document does not overflow horizontally.
- Captured a 390px light-theme Stats preview with the tracked Normal Mode metrics visible.

## Remaining device checks

Real iPhone Safari/Android Chrome software keyboards and native sharing, spoken VoiceOver/TalkBack behavior, actual 200%/400% browser/text zoom, and OS-level reduced-motion integration remain unverified. Desktop viewport checks and mocked native sharing do not substitute for these checks.
