'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
};

export function ParticlesCanvas(props: { className?: string }) {
  const { className } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) return;

    let raf = 0;
    let particles: Particle[] = [];

    const dpr = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const ratio = dpr();
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawn = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = Math.max(26, Math.min(120, Math.floor((w * h) / 14000)));
      particles = Array.from({ length: count }).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.8,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        alpha: Math.random() * 0.35 + 0.18,
      }));
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Colors tuned to “blue oval / gold”
      const dot = (a: number) => `rgba(59, 130, 246, ${a})`; // blue
      const line = (a: number) => `rgba(245, 198, 24, ${a})`; // gold

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dot(p.alpha);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 105;
          if (dist < maxDist) {
            const opacity = 0.14 * (1 - dist / maxDist);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = line(opacity);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      raf = window.requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      spawn();
    };

    resize();
    spawn();
    raf = window.requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
      } else {
        raf = window.requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

