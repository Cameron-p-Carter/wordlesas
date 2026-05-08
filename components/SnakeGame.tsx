'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 3;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

function randomFood(snake: Point[]): Point {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

type Props = {
  onGameOver: (foodEaten: number) => void;
};

export default function SnakeGame({ onGameOver }: Props) {
  const initialSnake: Point[] = [{ x: 10, y: 10 }];
  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>(() => randomFood(initialSnake));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [foodEaten, setFoodEaten] = useState(0);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>(initialSnake);
  const foodRef = useRef<Point>(food);
  const foodEatenRef = useRef(0);
  const deadRef = useRef(false);
  const gameLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  foodRef.current = food;

  const tick = useCallback(() => {
    if (deadRef.current) return;

    const head = snakeRef.current[0];
    const dir = directionRef.current;

    const next: Point = {
      x: head.x + (dir === 'RIGHT' ? 1 : dir === 'LEFT' ? -1 : 0),
      y: head.y + (dir === 'DOWN' ? 1 : dir === 'UP' ? -1 : 0),
    };

    // Wall collision
    if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE) {
      deadRef.current = true;
      setDead(true);
      onGameOver(foodEatenRef.current);
      return;
    }

    // Self collision
    if (snakeRef.current.some((s) => s.x === next.x && s.y === next.y)) {
      deadRef.current = true;
      setDead(true);
      onGameOver(foodEatenRef.current);
      return;
    }

    const ateFood = next.x === foodRef.current.x && next.y === foodRef.current.y;
    const newSnake = [next, ...snakeRef.current];
    if (!ateFood) newSnake.pop();

    snakeRef.current = newSnake;
    setSnake([...newSnake]);

    if (ateFood) {
      foodEatenRef.current += 1;
      setFoodEaten(foodEatenRef.current);
      const newFood = randomFood(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
    }

    const speed = Math.max(60, INITIAL_SPEED - foodEatenRef.current * SPEED_INCREMENT);
    gameLoopRef.current = setTimeout(tick, speed);
  }, [onGameOver]);

  useEffect(() => {
    if (!started) return;

    gameLoopRef.current = setTimeout(tick, INITIAL_SPEED);
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    };
  }, [started, tick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
      };
      const newDir = map[e.key];
      if (!newDir) return;

      // Prevent reversing
      const opposite: Record<Direction, Direction> = {
        UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
      };
      if (newDir !== opposite[directionRef.current]) {
        directionRef.current = newDir;
        setDirection(newDir);
      }

      if (!started && !dead) setStarted(true);

      e.preventDefault();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, dead]);

  const boardWidth = GRID_SIZE * CELL_SIZE;
  const boardHeight = GRID_SIZE * CELL_SIZE;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-8 text-lg font-semibold">
        <span>Food eaten: <span className="text-green-600">{foodEaten}</span></span>
      </div>

      <div
        className="relative border-2 border-gray-800 bg-gray-900 rounded"
        style={{ width: boardWidth, height: boardHeight }}
      >
        {/* Food */}
        <div
          className="absolute rounded-full bg-red-500"
          style={{
            left: food.x * CELL_SIZE + 2,
            top: food.y * CELL_SIZE + 2,
            width: CELL_SIZE - 4,
            height: CELL_SIZE - 4,
          }}
        />

        {/* Snake */}
        {snake.map((seg, i) => (
          <div
            key={i}
            className={`absolute rounded-sm ${i === 0 ? 'bg-green-400' : 'bg-green-600'}`}
            style={{
              left: seg.x * CELL_SIZE + 1,
              top: seg.y * CELL_SIZE + 1,
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
            }}
          />
        ))}

        {/* Overlay: press any key to start */}
        {!started && !dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
            <p className="text-white text-xl font-bold">Press any arrow key to start</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Arrow keys or WASD to move</p>
    </div>
  );
}
