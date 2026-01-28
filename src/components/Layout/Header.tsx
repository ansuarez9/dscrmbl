import { useThemeContext } from '../../context/ThemeContext';

interface HeaderProps {
  onInstructionsClick: () => void;
}

export function Header({ onInstructionsClick }: HeaderProps) {
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
