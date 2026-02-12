import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ['#00fff9', '#ff2d6a', '#39ff14', '#ffb800'];
const GRAVITY = 0.25;
const ALPHA_DECAY = 0.008;

export function HighScoreCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Determine particle count based on device capability
    const isLowEnd = (navigator.hardwareConcurrency ?? 4) < 4;
    const particleCount = isLowEnd ? 40 : 80;

    // Create particles bursting from center-top
    const centerX = canvas.width / 2;
    const startY = canvas.height * 0.15;

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 3 + Math.random() * 7;
      const size = 4 + Math.random() * 6;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: startY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // slight upward bias
        width: size,
        height: Math.random() > 0.5 ? size : size * 0.5, // squares and rectangles
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive = true;

        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= ALPHA_DECAY;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }

      if (alive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
        pointerEvents: 'none'
      }}
    />
  );
}
