import { useThemeContext } from '../../context/ThemeContext';
import { trackGameEvent } from '../../utils/analytics';
import { TIP_JAR_URL } from '../../config/monetization';

interface HeaderProps {
  onInstructionsClick: () => void;
  onContactClick: () => void;
  onMerchClick: () => void;
}

export function Header({ onInstructionsClick, onContactClick, onMerchClick }: HeaderProps) {
  const { lightMode, toggleTheme } = useThemeContext();

  return (
    <>
      <header className="game-header">
        <div className="logo-container">
          <img src={`${import.meta.env.BASE_URL}logo-d-only.png`} alt="D" className="logo-d" />
          <h1 className="logo-text">SCRMBL</h1>
          <span className="version-tag">v2.0</span>
        </div>
        <div className="header-actions">
          <a
            className="icon-btn icon-btn--tip"
            href={TIP_JAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Tip the devs"
            aria-label="Tip the devs"
            onClick={() => trackGameEvent.tipJarClick('header')}
          >
            <span className="icon-glow"></span>
            <span className="icon-text">{String.fromCodePoint(0x2615)}</span>
          </a>
          <button
            className="icon-btn icon-btn--merch"
            title="Shop merch"
            aria-label="Shop merch"
            onClick={onMerchClick}
          >
            <span className="icon-glow"></span>
            <span className="icon-text">{String.fromCodePoint(0x1F455)}</span>
          </button>
          <button
            className="icon-btn"
            title="Contact / Suggestions"
            aria-label="Contact"
            onClick={onContactClick}
          >
            <span className="icon-glow"></span>
            <span className="icon-text">{String.fromCodePoint(0x2709, 0xFE0F)}</span>
          </button>
          <button
            id="dark-mode-toggle"
            className="icon-btn"
            title="Toggle Theme"
            aria-label="Toggle Theme"
            onClick={toggleTheme}
          >
            <span className="icon-glow"></span>
            <span className="icon-text">{lightMode ? String.fromCodePoint(0x1F319) : String.fromCodePoint(0x2600, 0xFE0F)}</span>
          </button>
        </div>
      </header>

      {/* Instructions trigger */}
      <div className="instructions-bar">
        <button id="instructions" className="instructions-link" onClick={onInstructionsClick}>
          <span className="bracket">[</span>
          <span className="link-text">HOW TO PLAY</span>
          <span className="bracket">]</span>
        </button>
        <p className="tagline">A new challenge every day. Compete with friends!</p>
      </div>
    </>
  );
}
