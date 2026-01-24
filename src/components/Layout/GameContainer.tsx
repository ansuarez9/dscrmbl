import type { ReactNode } from 'react';

interface GameContainerProps {
  children: ReactNode;
}

export function GameContainer({ children }: GameContainerProps) {
  return (
    <>
      {/* Scanline overlay */}
      <div className="scanlines"></div>

      {/* Ambient glow */}
      <div className="ambient-glow"></div>

      <div className="game-container">
        {children}
      </div>
    </>
  );
}
