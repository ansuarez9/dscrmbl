import type { ReactNode } from 'react';

interface GameContainerProps {
  children: ReactNode;
}

export function GameContainer({ children }: GameContainerProps) {
  return (
    <>
      {/* Scanline overlay */}
      <div className="scanlines" aria-hidden="true"></div>

      {/* Ambient glow */}
      <div className="ambient-glow" aria-hidden="true"></div>

      <main className="game-container">
        {children}
      </main>
    </>
  );
}
