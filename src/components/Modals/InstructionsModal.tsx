import { useEffect, useState } from 'react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsHiding(false);
    } else if (isVisible) {
      setIsHiding(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsHiding(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  const overlayClass = `modal-overlay ${isHiding ? 'hide-modal' : 'show-modal'}`;

  return (
    <div id="instruction-modal" className={overlayClass} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">// HOW TO PLAY</h2>
            <div className="modal-decoration"></div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close instructions">✕</button>
        </div>

        <div className="modal-content">
          <section className="instruction-section">
            <h3>OBJECTIVE</h3>
            <p>Guess all 5 words in today's themed challenge in 3 tries or less. Each day features a new theme with words that share a lateral thinking connection.</p>
          </section>

          <section className="instruction-section">
            <h3>DAILY THEMES</h3>
            <p>Each day's words follow a specific theme inspired by NYT Connections. Themes explore creative categories like:</p>
            <ul>
              <li>Words with shared letter patterns or sounds</li>
              <li>Words hidden within compound words</li>
              <li>Words united by meaning or origin</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h3>REPLAYS</h3>
            <ul>
              <li>You get <strong>5 replays per word</strong></li>
              <li>Use replays anytime to see the word again</li>
              <li>Click the <strong>REPLAY</strong> button (shows remaining replays)</li>
              <li>Use strategically to maximize your bonus</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h3>AFTER A FAILED GUESS</h3>
            <ul>
              <li>The orb flips showing <span className="text-danger">RED</span></li>
              <li>You can click REPLAY to see the word again</li>
              <li>After 3rd failed try, word reveals</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h3>AFTER A CORRECT GUESS</h3>
            <ul>
              <li>The orb flips showing <span className="text-success">GREEN</span></li>
              <li>Word automatically reveals</li>
              <li>Progress indicator updates</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h3>SCORING</h3>
            <div className="score-formula">
              <code>SCORE = (LETTERS x REMAINING_TRIES) + REPLAY_BONUS</code>
            </div>
            <ul>
              <li><strong>Replay bonus:</strong> 2 points per unused replay (max +10)</li>
              <li><strong>Timer bonus:</strong> +3 if solved under 10s</li>
              <li><strong>Streak bonus:</strong> streak x 2 for consecutive first-tries without replays</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h3>GAME MODES</h3>
            <ul className="feature-list">
              <li><span className="feature-tag">TIMER MODE</span> Optional 20-second timer per word (choose before starting)</li>
              <li><span className="feature-tag">STREAK</span> Bonus for consecutive wins</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
