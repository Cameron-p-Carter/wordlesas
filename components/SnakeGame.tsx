'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const GRID = 20;
const CELL = 26;
const INITIAL_MS = 160;
const MIN_MS = 65;
const SPEED_STEP = 4;

type Point = { x: number; y: number };
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

function randFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function SnakeGame({ onGameOver }: { onGameOver: (food: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const prevSnakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<Point>(randFood([{ x: 10, y: 10 }]));
  const dirRef = useRef<Dir>('RIGHT');
  const dirQueue = useRef<Dir[]>([]);
  const scoreRef = useRef(0);
  const isStarted = useRef(false);
  const isDead = useRef(false);
  const lastTick = useRef(0);
  const rafId = useRef(0);

  const getMs = () => Math.max(MIN_MS, INITIAL_MS - scoreRef.current * SPEED_STEP);

  const render = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const progress = isStarted.current ? Math.min((t - lastTick.current) / getMs(), 1) : 0;

    // Background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }

    // Food — pulsing glow
    const fp = foodRef.current;
    const pulse = 0.8 + 0.2 * Math.sin(t / 250);
    ctx.save();
    ctx.shadowColor = '#f87171';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fp.x * CELL + CELL / 2, fp.y * CELL + CELL / 2, (CELL / 2 - 3) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake — interpolated between previous and current grid positions
    const cur = snakeRef.current;
    const prev = prevSnakeRef.current;
    cur.forEach((seg, i) => {
      const ps = prev[i] ?? seg;
      // Only interpolate if delta is 1 cell (avoid glitch on first frame)
      const dx = seg.x - ps.x;
      const dy = seg.y - ps.y;
      const ix = Math.abs(dx) <= 1 ? ps.x + dx * progress : seg.x;
      const iy = Math.abs(dy) <= 1 ? ps.y + dy * progress : seg.y;

      const px = ix * CELL + 1;
      const py = iy * CELL + 1;
      const size = CELL - 2;

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#4ade80';
      } else {
        const lightness = Math.max(28, 38 - Math.min(i, 15));
        ctx.fillStyle = `hsl(142, 65%, ${lightness}%)`;
      }
      ctx.beginPath();
      ctx.roundRect(px, py, size, size, i === 0 ? 7 : 4);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const loop = useCallback((t: number) => {
    if (isDead.current) return;

    if (isStarted.current && t - lastTick.current >= getMs()) {
      // Consume the next valid direction from the queue
      while (dirQueue.current.length) {
        const next = dirQueue.current.shift()!;
        if (next !== OPPOSITE[dirRef.current]) { dirRef.current = next; break; }
      }

      const head = snakeRef.current[0];
      const d = dirRef.current;
      const next: Point = {
        x: head.x + (d === 'RIGHT' ? 1 : d === 'LEFT' ? -1 : 0),
        y: head.y + (d === 'DOWN' ? 1 : d === 'UP' ? -1 : 0),
      };

      // Wall + self collision
      const hitWall = next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID;
      const hitSelf = snakeRef.current.slice(0, -1).some((s) => s.x === next.x && s.y === next.y);
      if (hitWall || hitSelf) {
        isDead.current = true;
        setDead(true);
        onGameOver(scoreRef.current);
        render(t);
        return;
      }

      const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
      prevSnakeRef.current = [...snakeRef.current];
      const newSnake = [next, ...snakeRef.current];
      if (!ate) newSnake.pop();
      snakeRef.current = newSnake;

      if (ate) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        foodRef.current = randFood(newSnake);
      }

      lastTick.current = t;
    }

    render(t);
    rafId.current = requestAnimationFrame(loop);
  }, [render, onGameOver]);

  useEffect(() => {
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [loop]);

  useEffect(() => {
    const KEY: Record<string, Dir> = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
      W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
    };
    const onKey = (e: KeyboardEvent) => {
      const d = KEY[e.key];
      if (!d) return;
      e.preventDefault();

      if (!isStarted.current && !isDead.current) {
        isStarted.current = true;
        lastTick.current = performance.now();
        setStarted(true);
      }

      // Queue up to 3 moves; validate against the last queued direction
      const last = dirQueue.current[dirQueue.current.length - 1] ?? dirRef.current;
      if (d !== OPPOSITE[last] && dirQueue.current.length < 3) {
        dirQueue.current.push(d);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const size = GRID * CELL;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg font-semibold">
        Food eaten: <span className="text-green-400">{score}</span>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg border-2 border-gray-700"
        />
        {!started && !dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 rounded-lg">
            <p className="text-white text-xl font-bold tracking-wide">Press any arrow key to start</p>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Arrow keys or WASD · dodge the walls</p>
    </div>
  );
}
