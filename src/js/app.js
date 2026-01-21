// 125 words - last word is prisoners
let words = [
    'hello', 'blue', 'estelle', 'anniversary', 'ring', 'wedding', 'honey', 'john', 'horse', 'mouse', 'house',
    'train', 'appropriate', 'architecture', 'world', 'moon', 'poetry', 'microsoft', 'apple', 'saving', 'document',
    'output', 'listening', 'created', 'soccer', 'jamestown', 'district', 'rivalry', 'arlington', 'california',
    'handle', 'situation', 'price', 'grimace', 'submitted', 'university', 'brain', 'power', 'wisely', 'proud',
    'tortoise', 'turkish', 'cloudy', 'zebra', 'zombie', 'kansas', 'mathematical', 'typewriter', 'sprout', 'traveling',
    'alive', 'alien', 'toils', 'cranes', 'bratty', 'childish', 'orange', 'steelblue', 'jupiter', 'graciously', 'feverishly',
    'brackets', 'transitioning', 'incorrect', 'weeding', 'string', 'marissa', 'roberto', 'football', 'baseball', 'tennis',
    'hockey', 'basketball', 'elements', 'agriculture', 'keyboard', 'guitar', 'classical', 'theft', 'washington', 'amsterdam',
    'europe', 'saturn', 'submit', 'zoology', 'theoretical', 'spices', 'traitor', 'privately', 'scrabble', 'drafts', 'hamster',
    'hipster', 'finish', 'guessing', 'username', 'password', 'middle', 'large', 'extras', 'smaller', 'stratosphere', 'grounded',
    'mustache', 'corollary', 'ivory', 'scanners', 'scalpers', 'ticketmaster', 'immunodeficiency', 'scientology', 'grove', 'path',
    'shooters', 'spaniards', 'wordle', 'descramble', 'decoding', 'jeremiah', 'alice', 'andrew', 'javier', 'greenery',
    'rejuvenation', 'prisoners'
];

// Keep original words list for daily challenge
const originalWords = [...words];

let playableList = [];
let chosenWord = '';
let attempts;
let wordCount;
let previousScore;

// New game state variables
let replayCount = 0;
let replayPenalty = 0;
let streak = 0;
let streakBonus = 0;
let timerInterval = null;
let timeRemaining = 30;
let timerModeEnabled = false;
let isDailyChallenge = false;
let wordResults = []; // Track results for share feature

// Preferences
let darkMode = localStorage.getItem('darkMode') === 'true';
let soundMuted = localStorage.getItem('soundMuted') === 'true';

// Audio context for sound effects
let audioContext = null;

const submitBtn = document.getElementById('submit-action');
const startBtn = document.getElementById('start-game');
const dailyBtn = document.getElementById('daily-challenge');
const outputContainer = document.getElementById('typewritter-output');
const userInput = document.getElementById('user-input');
const repeatBtn = document.getElementById('repeat');
const instructionsLink = document.getElementById('instructions');
const instructionModalEl = document.getElementById('instruction-modal');
const finalScoreModalEl = document.getElementById('final-score-modal');
const scoreEl = document.getElementById('score');
const gamesPlayedEl = document.getElementById('gamesPlayed');
const highScoreEl = document.getElementById('highScore');
const averageScoreEl = document.getElementById('averageScore');
const percentageFillEl = document.getElementById('percentage-fill');
const markerTextEl = document.getElementById('marker-text');
const letterCountEl = document.getElementById('letter-count');
const timerDisplayEl = document.getElementById('timer-display');
const streakDisplayEl = document.getElementById('streak-display');
const timerModeToggle = document.getElementById('timer-mode-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const shareBtn = document.getElementById('share-btn');

// Event listeners
submitBtn.addEventListener('click', handleSubmitClick);
startBtn.addEventListener('click', () => handleStartGame(false));
dailyBtn.addEventListener('click', () => handleStartGame(true));
repeatBtn.addEventListener('click', handleRepeatAction);
userInput.addEventListener('keypress', handleKeyPress);
instructionsLink.addEventListener('click', () => handleInstructionsClick(instructionModalEl, true));
instructionModalEl.addEventListener('click', () => handleInstructionsClick(instructionModalEl, false));
finalScoreModalEl.addEventListener('click', (e) => {
    if (e.target === finalScoreModalEl) {
        handleInstructionsClick(finalScoreModalEl, false);
    }
});
timerModeToggle.addEventListener('change', handleTimerModeToggle);
darkModeToggle.addEventListener('click', handleDarkModeToggle);
shareBtn.addEventListener('click', handleShareClick);

// Initialize preferences on load
initializePreferences();

function initializePreferences() {
    // Timer mode
    timerModeToggle.checked = timerModeEnabled;
    updateReplayButtonText();

    // Dark mode
    if (darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
}

function handleTimerModeToggle() {
    timerModeEnabled = timerModeToggle.checked;
}

function handleDarkModeToggle() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode');
    darkModeToggle.textContent = darkMode ? '☀️' : '🌙';
}

// Sound effects using Web Audio API
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(frequency, duration, type = 'sine') {
    if (soundMuted) return;
    initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playCorrectSound() {
    if (soundMuted) return;
    initAudio();
    // Ascending happy tone
    playTone(523.25, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 0.2), 200); // G5
}

function playWrongSound() {
    if (soundMuted) return;
    initAudio();
    // Descending sad tone
    playTone(392, 0.15); // G4
    setTimeout(() => playTone(349.23, 0.2), 150); // F4
}

function playVictorySound() {
    if (soundMuted) return;
    initAudio();
    // Victory fanfare
    playTone(523.25, 0.1); // C5
    setTimeout(() => playTone(659.25, 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 0.1), 200); // G5
    setTimeout(() => playTone(1046.5, 0.3), 300); // C6
}

function playTimerWarningSound() {
    if (soundMuted) return;
    initAudio();
    playTone(880, 0.1); // A5 short beep
}

// Seeded random for daily challenge
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDailyNumber() {
    const startDate = new Date('2024-01-01');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getDailyWords() {
    const today = new Date().toDateString();
    const seed = hashCode(today);
    const wordsCopy = [...originalWords];
    const dailyWords = [];

    // Sort words by length for progressive difficulty
    const wordsByLength = {
        short: wordsCopy.filter(w => w.length >= 4 && w.length <= 5),
        medium: wordsCopy.filter(w => w.length >= 5 && w.length <= 6),
        mediumLong: wordsCopy.filter(w => w.length >= 6 && w.length <= 7),
        long: wordsCopy.filter(w => w.length >= 7 && w.length <= 8),
        veryLong: wordsCopy.filter(w => w.length >= 8)
    };

    const categories = [wordsByLength.short, wordsByLength.medium, wordsByLength.mediumLong, wordsByLength.long, wordsByLength.veryLong];

    for (let i = 0; i < 5; i++) {
        const category = categories[i];
        if (category.length > 0) {
            const idx = Math.floor(seededRandom(seed + i) * category.length);
            dailyWords.push(category[idx]);
        } else {
            // Fallback to any word
            const idx = Math.floor(seededRandom(seed + i) * wordsCopy.length);
            dailyWords.push(wordsCopy[idx]);
        }
    }

    return dailyWords;
}

function canPlayDaily() {
    const dailyStats = JSON.parse(localStorage.getItem('dscrmbl-daily'));
    if (!dailyStats) return true;

    const today = new Date().toDateString();
    return dailyStats.lastPlayed !== today;
}

function randomTimeout() {
    return Math.floor(Math.random() * 1500);
}

function handleInstructionsClick(modalEl, openModal) {
    if(openModal){
        modalEl.classList.remove('display-none');
        modalEl.classList.remove('hide-modal');
        modalEl.classList.add('show-modal');
    } else {
        modalEl.classList.add('hide-modal');

        setTimeout(() => {
            modalEl.classList.add('display-none');
            modalEl.classList.remove('show-modal');
        }, 250);
    }
}

function handleKeyPress(e) {
    if(e.key === 'Enter'){
        handleSubmitClick();
    }
}

function handleRevealAction(solved) {
    stopTimer();
    removeWordAtPlayIndicator();
    addWordSolvedIndicator(solved);
    addDisabledAttr(startBtn, false);
    addDisabledAttr(repeatBtn, true);
    outputContainer.innerText = chosenWord;
    outputContainer.className = 'fade-in-result';
    updateLetterCount(chosenWord.length, true);

    if (solved) {
        playCorrectSound();
    } else {
        playWrongSound();
    }
}

function handleRepeatAction() {
    if (replayCount >= 2) return;

    const hiddenEl = document.getElementsByClassName('hidden-output');

    // Apply replay penalty
    replayCount++;
    if (replayCount === 1) {
        replayPenalty += 3;
    } else if (replayCount === 2) {
        replayPenalty += 5;
    }

    // Disable button if max replays reached
    if (replayCount >= 2) {
        addDisabledAttr(repeatBtn, true);
    }

    // Update button text to show remaining replays
    updateReplayButtonText();

    // Replay the fade-in animation
    if(hiddenEl.length === 0) {
        if(outputContainer.classList.contains('fade-in-result')){
            outputContainer.classList.remove('fade-in-result');
        }
        outputContainer.innerText = '';
        chosenWord.split('').forEach(val => {
            insertSpanElement(val);
        });
    } else {
        for(let i = 0; i < hiddenEl.length; i++){
            if(hiddenEl[i].classList.contains('fade-in-output')){
                hiddenEl[i].classList.remove('fade-in-output');
            }
        }
    }
    triggerFadeInEffect();

    focusInput();
}

function updateReplayButtonText() {
    const remaining = 2 - replayCount;
    if (remaining > 0) {
        repeatBtn.textContent = `Replay (${remaining} left)`;
    } else {
        repeatBtn.textContent = 'Replay';
    }
}

function resetGame() {
    const attemptContainersEls = document.getElementsByClassName('attempt-container');
    const resultEls = document.getElementsByClassName('result');

    attemptContainersEls[0].className = 'attempt-container';
    attemptContainersEls[1].className = 'attempt-container';
    attemptContainersEls[2].className = 'attempt-container';

    resultEls[0].className = 'result';
    resultEls[1].className = 'result';
    resultEls[2].className = 'result';

    addDisabledAttr(repeatBtn, true);

    // Reset replay
    replayCount = 0;
    replayPenalty = 0;
    updateReplayButtonText();
}

function createPlayableList(playLength) {
    previousScore = 0;

    // Sort words by length for progressive difficulty
    const wordsByLength = {
        short: words.filter(w => w.length >= 4 && w.length <= 5),
        medium: words.filter(w => w.length >= 5 && w.length <= 6),
        mediumLong: words.filter(w => w.length >= 6 && w.length <= 7),
        long: words.filter(w => w.length >= 7 && w.length <= 8),
        veryLong: words.filter(w => w.length >= 8)
    };

    const categories = [wordsByLength.short, wordsByLength.medium, wordsByLength.mediumLong, wordsByLength.long, wordsByLength.veryLong];

    playableList = [];

    for (let i = 0; i < playLength; i++) {
        let category = categories[i];
        if (category.length === 0) {
            // Fallback: use any remaining word
            category = words;
        }

        const randomIdx = Math.floor(Math.random() * category.length);
        const randomWord = category[randomIdx];
        playableList.push(randomWord);
        words = words.filter(w => w !== randomWord);
    }
}

// if disabled is true, then add disabled attribute; else remove disabled attribute
function addDisabledAttr(el, disabled){
    if (!el) return;
    if(disabled){
        el.setAttribute('disabled', 'disabled');
    } else {
        el.removeAttribute('disabled');
    }
}

function focusInput() {
    setTimeout(() => {
        userInput.focus();
    }, 100);
}

function updateLetterCount(length, revealed = false) {
    if (revealed) {
        letterCountEl.textContent = `(${length} letters)`;
    } else {
        const underscores = '_ '.repeat(length).trim();
        letterCountEl.textContent = underscores + ` (${length} letters)`;
    }
}

function updateStreakDisplay() {
    if (streak > 0) {
        streakDisplayEl.textContent = `🔥 Streak: ${streak}`;
        streakDisplayEl.classList.remove('display-none');
    } else {
        streakDisplayEl.classList.add('display-none');
    }
}

// Timer functions
function startTimer() {
    if (!timerModeEnabled) return;

    timeRemaining = 30;
    updateTimerDisplay();
    timerDisplayEl.classList.remove('display-none');
    timerDisplayEl.classList.remove('timer-warning');

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining === 10) {
            timerDisplayEl.classList.add('timer-warning');
            playTimerWarningSound();
        }

        if (timeRemaining <= 0) {
            // Auto-submit (counts as failed)
            handleTimerExpired();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerDisplayEl.classList.add('display-none');
}

function updateTimerDisplay() {
    timerDisplayEl.textContent = `⏱️ ${timeRemaining}s`;
}

function handleTimerExpired() {
    stopTimer();

    // Count as failed attempt
    const resultIdEl = document.getElementById(`result-${attempts}`);
    const attemptContainerIdEl = document.getElementById(`attempt-container-${attempts}`);

    resultIdEl.classList.add('wrong');
    attemptContainerIdEl.classList.add('rotate-attempt');

    // Record result
    wordResults.push({ attempts: 4, skipped: false }); // 4 means failed

    // Reset streak
    streak = 0;
    updateStreakDisplay();

    handleRevealAction(false);
    addDisabledAttr(submitBtn, true);

    if (playableList.length === 0) {
        userInput.blur();
        setTimeout(showFinalScoreModal, 1500);
    }

    userInput.value = '';
}

function handleStartGame(isDaily = false) {
    resetGame();

    // Reset word results for new game
    if (playableList.length === 0) {
        wordResults = [];
        streak = 0;
        streakBonus = 0;
        updateStreakDisplay();
    }

    isDailyChallenge = isDaily;

    if(playableList.length === 0){
        if (isDaily) {
            if (!canPlayDaily()) {
                alert('You have already played today\'s Daily Challenge! Come back tomorrow.');
                return;
            }
            playableList = getDailyWords();
        } else {
            createPlayableList(5);
        }
        resetWordSolvedIndicator();
        startBtn.innerText='Next Word';
        dailyBtn.classList.add('display-none');
    }

    wordCount = 5 - playableList.length;

    addDisabledAttr(startBtn, true);
    addDisabledAttr(submitBtn, false);

    // Enable replay button
    addDisabledAttr(repeatBtn, false);
    replayCount = 0;
    replayPenalty = 0;
    updateReplayButtonText();

    attempts = 1;

    if(outputContainer.classList.contains('fade-in-result')) {
        outputContainer.classList.remove('fade-in-result')
    }

    outputContainer.innerText = '';

    // Take words in order (shortest to longest)
    chosenWord = playableList[0].toUpperCase();
    playableList = playableList.slice(1);

    // Update letter count display
    updateLetterCount(chosenWord.length);

    // Display letters with flash animation
    chosenWord.split('').forEach(val => {
        insertSpanElement(val);
    });
    triggerFadeInEffect();

    addWordAtPlayIndicator();
    focusInput();

    // Start timer if enabled
    startTimer();
}

function addWordAtPlayIndicator() {
    document.getElementsByClassName('word')[wordCount].classList.add('at-play');
}

function removeWordAtPlayIndicator() {
    document.getElementsByClassName('word')[wordCount].classList.remove('at-play');
}

function addWordSolvedIndicator(solved) {
    const wordEl = document.getElementsByClassName('word')[wordCount];
    wordEl.innerText = calculateWordScore(solved);
    if(solved){
        wordEl.classList.add('solved');
    } else {
        wordEl.classList.add('not-solved');
    }
}

function resetWordSolvedIndicator(){
    const wordEls = document.getElementsByClassName('word');
    wordEls[0].className = 'word';
    wordEls[0].innerText = 'Word';
    wordEls[1].className = 'word';
    wordEls[1].innerText = 'Word';
    wordEls[2].className = 'word';
    wordEls[2].innerText = 'Word';
    wordEls[3].className = 'word';
    wordEls[3].innerText = 'Word';
    wordEls[4].className = 'word';
    wordEls[4].innerText = 'Word';
}

function calculateWordScore(solved) {
    let wordScore = chosenWord.length * (4 - attempts);

    // Apply replay penalty
    if (replayPenalty > 0 && solved) {
        wordScore = Math.max(0, wordScore - replayPenalty);
    }

    // Apply timer bonus (if solved in under 10 seconds)
    if (timerModeEnabled && solved && timeRemaining > 20) {
        wordScore += 3;
    }

    // Apply streak bonus (first-try correct guesses without replay)
    if (solved && attempts === 1 && replayCount === 0) {
        streak++;
        if (streak > 1) {
            const bonus = streak * 2;
            wordScore += bonus;
            streakBonus += bonus;
        }
        updateStreakDisplay();
    } else if (!solved || attempts > 1 || replayCount > 0) {
        streak = 0;
        updateStreakDisplay();
    }

    previousScore = solved ? wordScore + previousScore : previousScore;
    return previousScore;
}

function calculateScoreAverage(average, gamesPlayed, score) {
    // Handle first game where average and gamesPlayed are undefined
    if (average === undefined || average === null || gamesPlayed === undefined || gamesPlayed === null) {
        return score;
    }
    const newAverage = ((average * gamesPlayed) + score) / (gamesPlayed + 1);
    return newAverage || score;
}

function getHighScore(highScore, score) {
    if(!(!!highScore)) {
        return score;
    }
    return (score > highScore) ? score : highScore;
}

function getHistory(history, score) {
    let percentile = 100;
    if(history) {
        insertIdx = history.findIndex(s => s > score);
        if(insertIdx === -1) {
            // position being at the end
            history = [...history, score];
        } else {
            // position being inserted at (insertIdx + 1) or at beginning
            history.splice(insertIdx, 0, score);
            percentile = (((insertIdx + 1) / history.length) * 100);
        }
    } else {
        // starting the array
        history = [score];
    }

    return ({
        history: history,
        percentile: Math.round(percentile)
    });
}

function finalScoreCalculations(score) {
    const storageKey = isDailyChallenge ? 'dscrmbl-daily' : 'dscrmbl';
    const cached = JSON.parse(localStorage.getItem(storageKey));
    const average = calculateScoreAverage(cached?.average, cached?.gamesPlayed, score);
    const gamesPlayed = (cached?.gamesPlayed + 1) || 1;
    const highScore = getHighScore(cached?.highScore, score);
    const historyPercentile = getHistory(cached?.history, score);

    const cachedScore = {
        score: score,
        average: average,
        gamesPlayed: gamesPlayed,
        highScore: highScore,
        history: historyPercentile.history,
        lastPlayed: isDailyChallenge ? new Date().toDateString() : cached?.lastPlayed
    }

    localStorage.setItem(storageKey, JSON.stringify(cachedScore));

    return {cachedScore, historyPercentile};
}

function showFinalScoreModal(solved) {
    const finalScore = document.getElementsByClassName('word')[4].innerText;
    scoreEl.innerText = finalScore;

    const {cachedScore, historyPercentile} = finalScoreCalculations(Number(finalScore));
    gamesPlayedEl.innerText = cachedScore.gamesPlayed;
    highScoreEl.innerText = cachedScore.highScore;
    averageScoreEl.innerText = Math.round(cachedScore.average);

    // Update modal title for daily challenge
    const modalTitle = document.getElementById('modal-title');
    if (isDailyChallenge) {
        modalTitle.textContent = `Daily #${getDailyNumber()}`;
    } else {
        modalTitle.textContent = 'Score:';
    }

    finalScoreModalEl.classList.remove('display-none');
    finalScoreModalEl.classList.add('show-modal');

    // Play victory sound
    playVictorySound();

    setTimeout(() => {
        // and scroll to bottom of page
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        const percentage = `${historyPercentile.percentile}%`;
        percentageFillEl.style.width = percentage;
        percentageFillEl.classList.add('fill-effect');

        markerTextEl.innerText = percentage; // has to be calculated
        markerTextEl.classList.add('marker-text-fade-in');
    }, 1000)
}

function generateShareText() {
    const finalScore = document.getElementsByClassName('word')[4].innerText;
    const dailyNum = isDailyChallenge ? ` Daily #${getDailyNumber()}` : '';

    let shareText = `DSCRMBL${dailyNum} 🎯 Score: ${finalScore}\n`;

    // Generate emoji grid for word results
    const wordEls = document.getElementsByClassName('word');
    let emojiRow = '';
    for (let i = 0; i < 5; i++) {
        if (wordEls[i].classList.contains('solved')) {
            emojiRow += '🟩';
        } else {
            emojiRow += '🟥';
        }
    }
    shareText += emojiRow + '\n';

    // Add streak if > 0
    if (streakBonus > 0) {
        shareText += `🔥 Best Streak Bonus: +${streakBonus}\n`;
    }

    shareText += `\nPlay at: ${window.location.href}`;

    return shareText;
}

function handleShareClick() {
    const shareText = generateShareText();

    navigator.clipboard.writeText(shareText).then(() => {
        const originalText = shareBtn.textContent;
        shareBtn.textContent = 'Copied!';
        setTimeout(() => {
            shareBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
}

function handleSubmitClick() {
    const guess = userInput.value.trim();
    const h5El = document.getElementsByTagName('h5')[0];

    if(
        (!(!!chosenWord) && (!!guess)) ||
        ((!!chosenWord) && !(!!guess)) ||
        !(!!chosenWord) || !(!!guess)){
        document.getElementById('button-text').innerHTML = startBtn.innerText;
        h5El.classList.add('fade-out');

        setTimeout(() => {
            h5El.classList.remove('fade-out');
        }, 2000);
        return;
    }

    const correct = guess.toLowerCase() === chosenWord.toLowerCase();

    const resultIdEl = document.getElementById(`result-${attempts}`);
    const attemptContainerIdEl = document.getElementById(`attempt-container-${attempts}`);

    if((correct || attempts === 3) && playableList.length === 0){
        startBtn.innerText='Start New DSCRMBL!';
        dailyBtn.classList.remove('display-none');
    } else if((correct || attempts === 3) && playableList.length === 1) {
        startBtn.innerText='Final Word in Set';
    }

    if(!correct){
        resultIdEl.classList.add('wrong');

        if(attempts === 3){
            wordResults.push({ attempts: 4, skipped: false }); // 4 means failed
            handleRevealAction(false);
            addDisabledAttr(submitBtn, true);
        } else {
            setTimeout(() => {
                handleRepeatAction();
                addDisabledAttr(repeatBtn, false);
            }, 1500);
        }

        attempts++;
    } else {
        wordResults.push({ attempts: attempts, skipped: false });
        resultIdEl.classList.add('correct');
        handleRevealAction(true)
    }

    if(playableList.length === 0 && (attempts === 4 || correct)){
        // blur input field to try to force the keyboard to collapse on mobile devices,
        userInput.blur();
        setTimeout(showFinalScoreModal, 1500);
    }

    attemptContainerIdEl.classList.add('rotate-attempt');

    userInput.value = '';

    // Focus input if more attempts remain
    if (!correct && attempts < 4) {
        focusInput();
    }
}

function insertSpanElement(val) {
    const el = document.createElement('span');
    el.className="hidden-output"
    el.innerHTML = val;
    outputContainer.appendChild(el);
}

function triggerFadeInEffect() {
    const hiddenEl = document.getElementsByClassName('hidden-output');
    for(let i = 0; i < hiddenEl.length; i++){
        setTimeout(() => {
            hiddenEl[i].className = 'hidden-output fade-in-output';
        }, randomTimeout());
    }
}
