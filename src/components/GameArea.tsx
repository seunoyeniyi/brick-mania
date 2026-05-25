import React, { useEffect, useRef, useState } from 'react';
import { Ball, Brick, GameStats, Level, PowerUp, PowerUpType, StarParticle, UniverseType } from '../types';
import { COLOR_PALETTE } from '../levels';
import { ArrowLeft, Pause, Play, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameAreaProps {
  level: Level;
  onBackToLevels: () => void;
  onStatsUpdate?: (percent: number, combo: string, activePowersList: { name: string; duration: string; color: string }[]) => void;
}

export default function GameArea({ level, onBackToLevels, onStatsUpdate }: GameAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core Game State
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);

  // Star points/currency matches '⭐ : 21' screenshot
  const [stars, setStars] = useState(21);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isLaunched, setIsLaunched] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // Local active stats for sidebar updates
  const [localStats, setLocalStats] = useState({
    bricksPercent: 0,
    comboMultiplierVal: '1.0x',
    activeList: [] as { name: string; duration: string; color: string }[]
  });

  // References to keep loop synchronized with 60fps animations
  const stateRef = useRef({
    paddleX: 180,
    paddleWidth: 80,
    paddleHeight: 12,
    balls: [] as Ball[],
    bricks: [] as Brick[],
    brickGrid: [] as (Brick | null)[][],
    powerUps: [] as PowerUp[],
    particles: [] as StarParticle[],
    starsCollected: 21,
    score: 0,
    lives: 3,
    isLaunched: false,
    nextBallId: 1,
    nextPowerUpId: 1,
    nextParticleId: 1,
    isPaused: false,
    width: 400,
    height: 520,
    brickRows: 0,
    brickCols: 0,
    levelName: level.name,
    isMuted: false,
    initialBricksCount: 1,
    activePowerUps: [] as { name: string; color: string; expiresAt: number }[],
    gameSpeed: 1,
    isAutoPlay: false
  });

  // Keep references updated with state
  useEffect(() => {
    stateRef.current.isPaused = isPaused;
  }, [isPaused]);

  useEffect(() => {
    stateRef.current.isMuted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    stateRef.current.gameSpeed = gameSpeed;
  }, [gameSpeed]);

  useEffect(() => {
    stateRef.current.isAutoPlay = isAutoPlay;
  }, [isAutoPlay]);

  // Sound generator using Web Audio API for rich arcade experience
  // Throttle play times to prevent thread-locking audio buffer overhead
  const lastPlayedTimes = useRef<{ [key: string]: number }>({});

  const playSound = (type: 'brick' | 'paddle' | 'wall' | 'powerup' | 'powerup_buy' | 'lose' | 'victory') => {
    if (stateRef.current.isMuted) return;

    // Fast-path: mute regular bounces if screen is hyperactive (> 12 balls)
    const activeBallCount = stateRef.current.balls.length;
    if (activeBallCount > 12 && (type === 'brick' || type === 'paddle' || type === 'wall')) {
      return;
    }

    // Rate-limiting identical sounds within brief periods
    const now = Date.now();
    const threshold = type === 'brick' ? 100 : (type === 'wall' ? 140 : 80);
    if (lastPlayedTimes.current[type] && now - lastPlayedTimes.current[type] < threshold) {
      return;
    }
    lastPlayedTimes.current[type] = now;

    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'brick') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'paddle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'wall') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'powerup') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'powerup_buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'victory') {
        // Star spangled fanfare
        osc.type = 'triangle';
        const notes = [523, 659, 784, 1046, 784, 1046];
        notes.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        });
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.73);
      }
    } catch (e) {
      // Audio context might be blocked or unsupported
    }
  };

  // Launch initial ball tracking
  const triggerLaunch = () => {
    if (stateRef.current.isLaunched) return;
    stateRef.current.isLaunched = true;
    setIsLaunched(true);
    stateRef.current.balls.forEach((ball) => {
      ball.vx = (Math.random() * 2 - 1) * 2; // Random directional spread
      ball.vy = -5.5; // Always launch upwards
    });
  };

  // Reset core states on mounting level, mapping bricks carefully
  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameWidth = canvas.width;
    const gameHeight = canvas.height;

    stateRef.current.width = gameWidth;
    stateRef.current.height = gameHeight;
    stateRef.current.lives = 3;
    stateRef.current.score = 0;
    stateRef.current.starsCollected = stars;
    stateRef.current.paddleWidth = 84;
    stateRef.current.paddleHeight = 12;
    stateRef.current.paddleX = (gameWidth - stateRef.current.paddleWidth) / 2;
    stateRef.current.isLaunched = false;
    stateRef.current.balls = [];
    stateRef.current.bricks = [];
    stateRef.current.powerUps = [];
    stateRef.current.particles = [];

    setScore(0);
    setLives(3);
    setIsLaunched(false);
    setShowVictory(false);
    setShowGameOver(false);

    // Initial Ball positioned snug onto the paddle
    stateRef.current.balls = [
      {
        id: stateRef.current.nextBallId++,
        x: gameWidth / 2,
        y: gameHeight - 24,
        vx: 0,
        vy: 0,
        radius: 6,
        color: '#FFFFFF'
      }
    ];

    // Build the Bricks array using the layout
    const gridCols = level.gridWidth;
    const gridRows = level.layout.length;
    stateRef.current.brickCols = gridCols;
    stateRef.current.brickRows = gridRows;

    // Bricks occupy top 60% of vertical space
    const brickMarginTop = 50;
    const availableWidth = gameWidth - 32; // Side paddings
    const cellWidth = availableWidth / gridCols;
    const cellHeight = 7.5; // Pristine small square brick style from mobile screenshot

    const bricksList: Brick[] = [];
    const grid: (Brick | null)[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));

    for (let r = 0; r < gridRows; r++) {
      const rowStr = level.layout[r];
      if (!rowStr) continue;
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (char && char !== '.') {
          const colorHex = COLOR_PALETTE[char] || '#EC4899';
          const brick: Brick = {
            row: r,
            col: c,
            color: colorHex,
            maxHp: 1,
            hp: 1,
            x: 16 + c * cellWidth,
            y: brickMarginTop + r * cellHeight,
            width: cellWidth - 1, // small subpixel spacing to simulate gap grid
            height: cellHeight - 1
          };
          bricksList.push(brick);
          grid[r][c] = brick;
        }
      }
    }

    stateRef.current.bricks = bricksList;
    stateRef.current.brickGrid = grid;
    stateRef.current.initialBricksCount = bricksList.length || 1;
    stateRef.current.activePowerUps = [];
    if (onStatsUpdate) {
      onStatsUpdate(0, '1.0x', []);
    }
  };

  // Resize boundaries of mobile viewport dynamically
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Restrict aspect ratio tightly (e.g. mobile columns/rows)
      const rect = container.getBoundingClientRect();
      const targetWidth = Math.min(rect.width, 410);
      const targetHeight = Math.min(rect.height, 530);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Re-initialize layouts on resize wrapper
      initGame();
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [level]);

  // Input controller tracking
  useEffect(() => {
    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || showVictory || showGameOver) return;
      const speed = 25;
      const pWidth = stateRef.current.paddleWidth;
      const limit = stateRef.current.width - pWidth;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.paddleX = Math.max(0, stateRef.current.paddleX - speed);
        if (!stateRef.current.isLaunched) {
          stateRef.current.balls.forEach((ball) => {
            ball.x = stateRef.current.paddleX + pWidth / 2;
          });
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.paddleX = Math.min(limit, stateRef.current.paddleX + speed);
        if (!stateRef.current.isLaunched) {
          stateRef.current.balls.forEach((ball) => {
            ball.x = stateRef.current.paddleX + pWidth / 2;
          });
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        triggerLaunch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused, showVictory, showGameOver]);

  // Touch & Mouse glide operations on Canvas
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaused || showVictory || showGameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pWidth = stateRef.current.paddleWidth;

    // Center paddle on pointer
    let targetX = x - pWidth / 2;
    targetX = Math.max(0, Math.min(targetX, stateRef.current.width - pWidth));
    stateRef.current.paddleX = targetX;

    // Pin unlaunched balls to paddle top center marker
    if (!stateRef.current.isLaunched) {
      stateRef.current.balls.forEach((ball) => {
        ball.x = targetX + pWidth / 2;
      });
    }
  };

  // Store click triggers launch
  const handleCanvasClick = () => {
    if (isPaused || showVictory || showGameOver) return;
    triggerLaunch();
  };

  // Spawns star particle trails matching the video retro visuals
  const createExplosion = (x: number, y: number, color: string, count = 8) => {
    // Performance guard: suppress particle load if there are too many active balls
    const ballCount = stateRef.current.balls.length;
    let actualCount = count;
    if (ballCount > 50) {
      actualCount = Math.max(1, Math.floor(count / 4));
    } else if (ballCount > 15) {
      actualCount = Math.max(2, Math.floor(count / 2));
    }

    // Hard ceiling for particle array size to prevent draw slowdowns
    if (stateRef.current.particles.length > 150) {
      return;
    }

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      stateRef.current.particles.push({
        id: stateRef.current.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: 30 + Math.random() * 20
      });
    }
  };

  // In-Game store purchases using collected stars matches custom HUD
  const buyPowerUp = (type: PowerUpType, cost: number) => {
    if (stateRef.current.starsCollected < cost || stateRef.current.balls.length === 0) return;

    // Deduct Star Points Currency
    const newStars = stateRef.current.starsCollected - cost;
    stateRef.current.starsCollected = newStars;
    setStars(newStars);
    playSound('powerup_buy');

    // Trigger effect
    if (type === 'MULTIPLIER') {
      // Triplicate all active balls up to a high-perf limit
      const maxBallsAllowed = 400;
      const listCopy = [...stateRef.current.balls];
      for (let i = 0; i < listCopy.length; i++) {
        if (stateRef.current.balls.length >= maxBallsAllowed) break;
        const ball = listCopy[i];

        // Spawn 2 extra balls branching off
        stateRef.current.balls.push({
          id: stateRef.current.nextBallId++,
          x: ball.x,
          y: ball.y,
          vx: ball.vx * 1.1 + Math.random() - 0.5,
          vy: -Math.abs(ball.vy) + Math.random() - 0.5,
          radius: ball.radius,
          color: '#E0F2FE'
        });

        if (stateRef.current.balls.length >= maxBallsAllowed) break;
        stateRef.current.balls.push({
          id: stateRef.current.nextBallId++,
          x: ball.x,
          y: ball.y,
          vx: ball.vx * 0.9 + Math.random() - 0.5,
          vy: -Math.abs(ball.vy) + Math.random() - 0.5,
          radius: ball.radius,
          color: '#F472B6'
        });
      }
    } else if (type === 'ADD_THREE') {
      // Immediate 3 launches from center of current paddle
      const paddleCenterX = stateRef.current.paddleX + stateRef.current.paddleWidth / 2;
      const paddleTopY = stateRef.current.height - 20;

      for (let i = 0; i < 3; i++) {
        stateRef.current.balls.push({
          id: stateRef.current.nextBallId++,
          x: paddleCenterX,
          y: paddleTopY,
          vx: (Math.random() * 2 - 1) * 3,
          vy: -4.5 - i * 0.5,
          radius: 6,
          color: '#34D399'
        });
      }
      stateRef.current.isLaunched = true;
      setIsLaunched(true);
    } else if (type === 'SHRINK_PADDLE') {
      // Reverse: Magnify Paddle width for 12 seconds instead of shrink!
      const originalW = stateRef.current.paddleWidth;
      stateRef.current.paddleWidth = originalW * 1.5;
      createExplosion(stateRef.current.paddleX + originalW / 2, stateRef.current.height - 12, '#38BDF8', 25);
      
      // Store in active power-up trackers
      stateRef.current.activePowerUps.push({
        name: 'Paddle Extender',
        color: 'bg-green-400',
        expiresAt: Date.now() + 12000
      });

      setTimeout(() => {
        stateRef.current.paddleWidth = originalW;
      }, 12000);
    } else if (type === 'EXPLOSIVE') {
      // Clear a random 15 columns of bricks
      const itemsToDestroy = Math.min(18, stateRef.current.bricks.length);
      for (let i = 0; i < itemsToDestroy; i++) {
        const randomIndex = Math.floor(Math.random() * stateRef.current.bricks.length);
        const brick = stateRef.current.bricks[randomIndex];
        if (brick) {
          createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 15);
          // 40% chance of generating a collectible star on random explosion clears
          if (Math.random() < 0.4) {
            stateRef.current.powerUps.push({
              id: stateRef.current.nextPowerUpId++,
              x: brick.x + brick.width / 2,
              y: brick.y + brick.height / 2,
              type: 'STAR',
              radius: 7,
              speed: 1.5 + Math.random() * 1.0
            });
          }
          // Remove from 2D grid
          if (stateRef.current.brickGrid[brick.row]) {
            stateRef.current.brickGrid[brick.row][brick.col] = null;
          }
          stateRef.current.bricks.splice(randomIndex, 1);
        }
      }
      stateRef.current.score += itemsToDestroy * 10;
      setScore(stateRef.current.score);

      // Check Victory Condition
      if (stateRef.current.bricks.length === 0) {
        setShowVictory(true);
        playSound('victory');
      }
    }
  };

  // Setup main RAF 60FPS animation physics loop
  useEffect(() => {
    let animId: number;
    let statsThrottleCounter = 0;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const state = stateRef.current;

      // Handle pauses or outcome locks
      if (state.isPaused || showVictory || showGameOver) {
        drawFrame(ctx, state);
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // PHYSICS SIMULATIONS
      const ticks = state.gameSpeed || 1;
      for (let tick = 0; tick < ticks; tick++) {
        if (state.bricks.length === 0 || state.lives <= 0) {
          break;
        }

        // COMPUTER HELP PLAY MODE
        if (state.isAutoPlay) {
          if (!state.isLaunched) {
            triggerLaunch();
          }

          // Locate lowest ball
          let targetBall = null;
          let lowestY = -1;
          for (let b = 0; b < state.balls.length; b++) {
            const ball = state.balls[b];
            if (ball.y > lowestY) {
              lowestY = ball.y;
              targetBall = ball;
            }
          }

          if (targetBall) {
            // Intelligent Target Offset calculation on the paddle (0.0 is left edge, 1.0 is right edge)
            let targetOffset = 0.5; // default center bounce

            // 1. Target bricks by calculating the cluster centroid of remaining bricks to choose steering direction
            if (state.bricks.length > 0) {
              let sumX = 0;
              state.bricks.forEach((b: any) => {
                sumX += b.x + b.width / 2;
              });
              const avgBrickX = sumX / state.bricks.length;

              // If remaining bricks are situated on the left, try to steer left (hit left side of paddle)
              if (avgBrickX < targetBall.x - 40) {
                targetOffset = 0.35;
              } 
              // If remaining bricks are on the right, steer right (hit right side of paddle)
              else if (avgBrickX > targetBall.x + 40) {
                targetOffset = 0.65;
              }
            }

            // 2. Prevent Vertical Trap: Force diagonal deflects if the ball vx speed is too straight (infinite loops)
            if (Math.abs(targetBall.vx) < 1.2) {
              if (targetBall.x > state.width / 2) {
                targetOffset = 0.28; // force steer left
              } else {
                targetOffset = 0.72; // force steer right
              }
            }

            // Human-like tracing anticipation delay: If the lowest ball is high up in the screen
            // (e.g. above 58% height), the paddle relaxes and lazily slides towards center as standard human anticipation.
            if (targetBall.y < state.height * 0.58) {
              const centerIdealX = (state.width - state.paddleWidth) / 2;
              const relaxDiff = centerIdealX - state.paddleX;
              if (Math.abs(relaxDiff) > 1.5) {
                state.paddleX += Math.sign(relaxDiff) * Math.min(Math.abs(relaxDiff), 1.8);
              }
              if (!state.isLaunched) {
                state.balls.forEach((ball) => {
                  ball.x = state.paddleX + state.paddleWidth / 2;
                });
              }
            } else {
              // ACTIVE TRACKING (Ball is descending below the bricks, entering the tracking danger zone)
              // Determine ideal paddle targeting slot (safely clamped so the ball never slips outside reachable hitbox)
              const clampedOffset = Math.max(0.18, Math.min(0.82, targetOffset));
              let idealX = targetBall.x - clampedOffset * state.paddleWidth;

              // Catch falling premium power-ups and stars if the ball is safely far from danger zone
              const distanceToPaddleY = (state.height - 20) - targetBall.y;
              if (state.powerUps.length > 0 && distanceToPaddleY > 180) {
                let targetPowerUp = null;
                let lowestPuY = -1;
                for (let p = 0; p < state.powerUps.length; p++) {
                  const pu = state.powerUps[p];
                  if (pu.y > lowestPuY) {
                    lowestPuY = pu.y;
                    targetPowerUp = pu;
                  }
                }
                if (targetPowerUp && targetPowerUp.y > state.height * 0.4) {
                  idealX = targetPowerUp.x - 0.5 * state.paddleWidth;
                }
              }

              const diff = idealX - state.paddleX;

              // Emergency snapping constraint: only activate instant snappings when down to 1 or 2 balls.
              // When there are many balls, smooth fluid tracking handles them naturally and lets some drop if chaotic.
              const isEmergency = (distanceToPaddleY < 50) && (state.balls.length <= 2);

              if (isEmergency) {
                const finalX = Math.max(0, Math.min(state.width - state.paddleWidth, idealX));
                state.paddleX = finalX;
                if (!state.isLaunched) {
                  state.balls.forEach((ball) => {
                    ball.x = finalX + state.paddleWidth / 2;
                  });
                }
              } else {
                // Elastic tracking speed that scales up as the ball gets closer to the paddle
                let trackingSpeed = 10;
                if (distanceToPaddleY < 150) {
                  trackingSpeed = 12 + (150 - distanceToPaddleY) * 0.18;
                }

                let nextPaddleX = state.paddleX + Math.sign(diff) * Math.min(Math.abs(diff), trackingSpeed);
                nextPaddleX = Math.max(0, Math.min(nextPaddleX, state.width - state.paddleWidth));
                state.paddleX = nextPaddleX;

                if (!state.isLaunched) {
                  state.balls.forEach((ball) => {
                    ball.x = nextPaddleX + state.paddleWidth / 2;
                  });
                }
              }
            }
          }
        }

        if (state.isLaunched) {
          // Multi-ball coordinate updates
        for (let i = state.balls.length - 1; i >= 0; i--) {
          const ball = state.balls[i];

          // Apply a gentle downward gravity path
          ball.vy += 0.04;

          // Prevent extremely flat horizontal locking bounces
          if (Math.abs(ball.vy) < 1.4) {
            ball.vy = 1.4 * (ball.vy >= 0 ? 1 : -1);
          }

          // Enforce terminal velocity cap for control
          const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (currentSpeed > 10.0) {
            ball.vx = (ball.vx / currentSpeed) * 10.0;
            ball.vy = (ball.vy / currentSpeed) * 10.0;
          }

          // Forward physics step
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Side walls bounce
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx;
            playSound('wall');
          } else if (ball.x + ball.radius >= state.width) {
            ball.x = state.width - ball.radius;
            ball.vx = -ball.vx;
            playSound('wall');
          }

          // Ceiling bounce
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = -ball.vy;
            playSound('wall');
          }

          // Bottom screen drop-out handling
          if (ball.y - ball.radius > state.height) {
            state.balls.splice(i, 1);
            continue;
          }

          // Paddle collision math
          const pTopY = state.height - 20;
          if (
            ball.vy > 0 &&
            ball.y + ball.radius >= pTopY &&
            ball.y - ball.radius <= pTopY + state.paddleHeight &&
            ball.x + ball.radius >= state.paddleX &&
            ball.x - ball.radius <= state.paddleX + state.paddleWidth
          ) {
            // Recalculate bounce vector angle depending on touch proximity offset
            const offset = (ball.x - state.paddleX) / state.paddleWidth;
            const normalizedOffset = Math.max(0, Math.min(1, offset));
            const angle = (normalizedOffset - 0.5) * Math.PI * 0.65; // sharper deflection on ends

            const speedVec = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const bounceSpeed = Math.max(5.5, speedVec); // keep pace steady

            ball.vx = bounceSpeed * Math.sin(angle);
            ball.vy = -bounceSpeed * Math.cos(angle);
            ball.y = pTopY - ball.radius; // clear overlap

            playSound('paddle');
            createExplosion(ball.x, pTopY, '#F97316', 5);
          }

          // Bricks intersection math using extremely fast O(1) grid layout bounding box lookup
          const brickMarginTop = 50;
          const availableWidth = state.width - 32;
          const cellWidth = availableWidth / state.brickCols;
          const cellHeight = 7.5;

          const colStart = Math.max(0, Math.floor((ball.x - ball.radius - 16) / cellWidth));
          const colEnd = Math.min(state.brickCols - 1, Math.floor((ball.x + ball.radius - 16) / cellWidth));
          const rowStart = Math.max(0, Math.floor((ball.y - ball.radius - brickMarginTop) / cellHeight));
          const rowEnd = Math.min(state.brickRows - 1, Math.floor((ball.y + ball.radius - brickMarginTop) / cellHeight));

          let brickCollided = false;

          for (let r = rowStart; r <= rowEnd; r++) {
            if (brickCollided) break;
            for (let c = colStart; c <= colEnd; c++) {
              const brick = state.brickGrid[r]?.[c];
              if (!brick) continue;

              // Distance calculation between ball circle and brick AABB boundary
              const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
              const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));

              const distX = ball.x - closestX;
              const distY = ball.y - closestY;
              const distSq = distX * distX + distY * distY;

              if (distSq < ball.radius * ball.radius) {
                brickCollided = true;

                // Register points!
                state.score += 10;
                setScore(state.score);

                // Sparks particle effects
                createExplosion(closestX, closestY, brick.color, 7);

                // 8% chance to drop active custom power-ups
                if (Math.random() < 0.1) {
                  const types: PowerUpType[] = ['MULTIPLIER', 'ADD_THREE', 'SHRINK_PADDLE', 'STAR'];
                  const selectedType = types[Math.floor(Math.random() * types.length)];
                  state.powerUps.push({
                    id: state.nextPowerUpId++,
                    x: brick.x + brick.width / 2,
                    y: brick.y + brick.height / 2,
                    type: selectedType,
                    radius: 8,
                    speed: 1.8
                  });
                }

                // Sound feedback
                playSound('brick');

                // Physics collision normal response
                const dist = Math.sqrt(distSq);
                let nx = dist > 0 ? distX / dist : 0;
                let ny = dist > 0 ? distY / dist : -1;

                if (dist === 0) {
                  const brickCX = brick.x + brick.width / 2;
                  const brickCY = brick.y + brick.height / 2;
                  const dx = ball.x - brickCX;
                  const dy = ball.y - brickCY;
                  const l = Math.sqrt(dx * dx + dy * dy);
                  nx = l > 0 ? dx / l : 0;
                  ny = l > 0 ? dy / l : -1;
                }

                // Resolve overlaps cleanly
                const overlap = ball.radius - dist;
                ball.x += nx * (overlap + 0.1);
                ball.y += ny * (overlap + 0.1);

                const dot = ball.vx * nx + ball.vy * ny;
                if (dot < 0) {
                  ball.vx = ball.vx - 2 * dot * nx;
                  ball.vy = ball.vy - 2 * dot * ny;
                }

                // Drop brick HP
                brick.hp--;
                if (brick.hp <= 0) {
                  // Clear from the fast-lookup 2D grid
                  state.brickGrid[r][c] = null;

                  // Splice out of the graphics/render brick array
                  const bIndex = state.bricks.findIndex((bk: any) => bk.row === r && bk.col === c);
                  if (bIndex !== -1) {
                    state.bricks.splice(bIndex, 1);
                  }
                }
                break; // Handle single brick strike per ball per frame
              }
            }
          }

          // Check level clean victory condition
          if (state.bricks.length === 0) {
            setShowVictory(true);
            playSound('victory');
            break;
          }
        }
      }

      // No active balls remaining scenario
      if (state.balls.length === 0) {
        state.lives--;
        setLives(state.lives);
        state.isLaunched = false;
        setIsLaunched(false);
        playSound('lose');

        if (state.lives <= 0) {
          setShowGameOver(true);
        } else {
          // Recreate ball at top center of current paddle state
          state.balls = [
            {
              id: state.nextBallId++,
              x: state.paddleX + state.paddleWidth / 2,
              y: state.height - 24,
              vx: 0,
              vy: 0,
              radius: 6,
              color: '#FFFFFF'
            }
          ];
        }
      }

      // Update falling Power-ups
      for (let p = state.powerUps.length - 1; p >= 0; p--) {
        const item = state.powerUps[p];
        item.y += item.speed;

        // Intersection bounds with paddle
        const pTopY = state.height - 20;
        if (
          item.y + item.radius >= pTopY &&
          item.y - item.radius <= pTopY + state.paddleHeight &&
          item.x >= state.paddleX &&
          item.x <= state.paddleX + state.paddleWidth
        ) {
          // Play collection sound
          playSound('powerup');

          // Trigger drop effect
          if (item.type === 'STAR') {
            const plusStars = state.starsCollected + 1;
            state.starsCollected = plusStars;
            setStars(plusStars);
            createExplosion(item.x, item.y, '#FBBF24', 15);
          } else if (item.type === 'MULTIPLIER') {
            // Duplicate every single active ball up to limits
            const maxBallsAllowed = 400;
            const listCopy = [...state.balls];
            for (let i = 0; i < listCopy.length; i++) {
              if (state.balls.length >= maxBallsAllowed) break;
              const ball = listCopy[i];
              state.balls.push({
                id: state.nextBallId++,
                x: ball.x,
                y: ball.y,
                vx: -ball.vx + (Math.random() - 0.5),
                vy: ball.vy,
                radius: ball.radius,
                color: '#60A5FA'
              });
            }
            createExplosion(item.x, item.y, '#3B82F6', 15);
          } else if (item.type === 'ADD_THREE') {
            // Spawn 3 supplementary balls up to limits
            const maxBallsAllowed = 400;
            for (let i = 0; i < 3; i++) {
              if (state.balls.length >= maxBallsAllowed) break;
              state.balls.push({
                id: state.nextBallId++,
                x: state.paddleX + state.paddleWidth / 2,
                y: state.height - 24,
                vx: (Math.random() * 2 - 1) * 3,
                vy: -5,
                radius: 6,
                color: '#34D399'
              });
            }
            createExplosion(item.x, item.y, '#10B981', 15);
          } else if (item.type === 'SHRINK_PADDLE') {
            // Boost wide paddle size temporarily
            const currentW = state.paddleWidth;
            state.paddleWidth = currentW * 1.5;
            createExplosion(item.x, item.y, '#FF007F', 15);
            
            // Push active list item with expiry
            state.activePowerUps.push({
              name: 'Paddle Extender',
              color: 'bg-green-400',
              expiresAt: Date.now() + 8000
            });

            setTimeout(() => {
              state.paddleWidth = currentW;
            }, 8000);
          }

          state.powerUps.splice(p, 1);
          continue;
        }

        // Drop below the fold check
        if (item.y - item.radius > state.height) {
          state.powerUps.splice(p, 1);
        }
      }

      // Update flying sparks and engine particles
      for (let pt = state.particles.length - 1; pt >= 0; pt--) {
        const particle = state.particles[pt];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;
        particle.alpha = 1.0 - particle.life / particle.maxLife;

        if (particle.life >= particle.maxLife) {
          state.particles.splice(pt, 1);
        }
      }

      // Clean up expired power-ups
      state.activePowerUps = state.activePowerUps.filter((p: any) => p.expiresAt > Date.now());
      }

      // Throttle and dispatch current stats state to the parent dashboard layout
      statsThrottleCounter++;
      if (statsThrottleCounter % 15 === 0) {
        const bricksLeft = state.bricks.length;
        const totalInit = state.initialBricksCount;
        const bricksPercent = Math.min(100, Math.max(0, Math.round(((totalInit - bricksLeft) / totalInit) * 100)));
        const comboMultiplierVal = (1.0 + Math.max(0, state.balls.length - 1) * 0.5).toFixed(1) + 'x';
        
        // Build powerup display list
        const activeList: { name: string; duration: string; color: string }[] = [];
        if (state.balls.length > 1) {
          activeList.push({ name: 'Multi-Ball', duration: `x${state.balls.length}`, color: 'bg-blue-400' });
        }
        state.activePowerUps.forEach((pu: any) => {
          const timeLeft = Math.max(0, Math.ceil((pu.expiresAt - Date.now()) / 1000));
          activeList.push({ name: pu.name, duration: `0:${timeLeft < 10 ? '0' + timeLeft : timeLeft}s`, color: pu.color });
        });
        
        setLocalStats({
          bricksPercent,
          comboMultiplierVal,
          activeList
        });

        if (onStatsUpdate) {
          onStatsUpdate(bricksPercent, comboMultiplierVal, activeList);
        }
      }

      // Finally render frames onto canvas Context
      drawFrame(ctx, state);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showVictory, showGameOver]);

  // Clean custom rendering routines
  const drawFrame = (ctx: CanvasRenderingContext2D, state: any) => {
    // Clear canvas viewport
    ctx.clearRect(0, 0, state.width, state.height);

    // Deep purple canvas background matches screenshots
    ctx.fillStyle = '#220845';
    ctx.fillRect(0, 0, state.width, state.height);

    // Draw boundary guide highlights matching aesthetic
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, state.width - 8, state.height - 8);

    // Draw active brick squares
    for (let c = 0; c < state.bricks.length; c++) {
      const brick = state.bricks[c];
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

      // Subtle drop shadow/borders simulating pixels
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
    }

    // Draw active bouncing balls (Optimized dynamic renderer)
    if (state.balls.length <= 5) {
      // Small number of balls: draw with gorgeous glowing outer halos
      for (let b = 0; b < state.balls.length; b++) {
        const ball = state.balls[b];
        ctx.save();
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Subtle outer border styling
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
      }
    } else {
      // Multiple balls active: batch paths inside single GPU flush (Zero slowdown / 60FPS)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let b = 0; b < state.balls.length; b++) {
        const ball = state.balls[b];
        ctx.moveTo(ball.x + ball.radius, ball.y);
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Elegant Glowing White Paddle
    const rad = 6;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(state.paddleX, state.height - 20, state.paddleWidth, state.paddleHeight, rad);
    ctx.fill();
    ctx.restore();

    // Center white guide marker line shown on screenshot paddle
    ctx.fillStyle = '#E5E7EB';
    ctx.beginPath();
    ctx.arc(state.paddleX + state.paddleWidth / 2, state.height - 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    // Draw falling collectable Power-ups
    for (let p = 0; p < state.powerUps.length; p++) {
      const pUp = state.powerUps[p];
      ctx.beginPath();
      ctx.arc(pUp.x, pUp.y, pUp.radius, 0, Math.PI * 2);

      // Style based on powerup type
      if (pUp.type === 'STAR') {
        ctx.fillStyle = '#FBBF24'; // Golden amber
      } else if (pUp.type === 'MULTIPLIER') {
        ctx.fillStyle = '#3B82F6'; // Sky Blue
      } else if (pUp.type === 'ADD_THREE') {
        ctx.fillStyle = '#10B981'; // Green
      } else {
        ctx.fillStyle = '#EC4899'; // Pink
      }
      ctx.fill();
      ctx.closePath();

      // Text markers inside the floating items
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let label = '?';
      if (pUp.type === 'STAR') label = '★';
      else if (pUp.type === 'MULTIPLIER') label = 'x3';
      else if (pUp.type === 'ADD_THREE') label = '+3';
      else if (pUp.type === 'SHRINK_PADDLE') label = '↔';

      ctx.fillText(label, pUp.x, pUp.y);
    }

    // Draw spark particles
    for (let pt = 0; pt < state.particles.length; pt++) {
      const particle = state.particles[pt];
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.restore();
    }
  };

  return (
    <div id="game-playground-root" className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-8 select-none">
      
      {/* 1. LEFT COLUMN: Shop & Stars details */}
      <aside id="game-left-sidebar" className="w-full lg:w-[100px] bg-white/5 border border-white/10 rounded-2xl flex flex-row lg:flex-col items-center py-4 px-3 shrink-0 justify-between lg:justify-start lg:gap-5 shadow-lg">
        <div className="flex flex-row lg:flex-col items-center gap-3 lg:gap-4 w-full">
          
          {/* Star Score tracker - Matches ⭐ : 21 in screenshot */}
          <div className="bg-[#2a0e4e] w-24 lg:w-full py-2.5 rounded-xl text-center border border-purple-500/20 shadow-inner shrink-0">
            <span className="text-amber-400 font-extrabold flex items-center justify-center gap-1">
              <span className="text-base leading-none">⭐</span>
              <span className="text-lg font-mono tracking-tight font-black leading-none">{stars}</span>
            </span>
            <span className="text-[9px] text-purple-400 block font-mono font-bold mt-1 leading-none">STARS</span>
          </div>

          {/* Shop Separator */}
          <div className="hidden lg:block w-8 h-[1px] bg-purple-950/60 my-1"></div>

          {/* Power-up purchase triggers with star prices matching screenshots */}
          <div className="flex flex-row lg:flex-col gap-3 lg:gap-3.5 w-full items-center justify-center">
            {/* x3 multiplier */}
            <button
              id="shop-btn-x3"
              disabled={stars < 10}
              onClick={() => buyPowerUp('MULTIPLIER', 10)}
              className={`w-11 h-11 rounded-full flex flex-col justify-center items-center relative transition-all group cursor-pointer ${
                stars >= 10
                  ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-md shadow-blue-900/50 text-white'
                  : 'bg-zinc-800/80 opacity-40 cursor-not-allowed text-zinc-500'
              }`}
            >
              <span className="text-base font-black leading-none">x3</span>
              <span className="absolute -bottom-1 bg-[#10061e] px-1 rounded border border-amber-500/40 text-[7px] font-mono text-amber-400 font-bold leading-none">
                10★
              </span>
              <div className="absolute left-14 bg-blue-950 text-blue-100 text-[10px] py-1 px-2 rounded hidden group-hover:block whitespace-nowrap z-40 border border-blue-500/30">
                Triplicate Current Balls (10★)
              </div>
            </button>

            {/* +3 immediate launch */}
            <button
              id="shop-btn-add3"
              disabled={stars < 5}
              onClick={() => buyPowerUp('ADD_THREE', 5)}
              className={`w-11 h-11 rounded-full flex flex-col justify-center items-center relative transition-all group cursor-pointer ${
                stars >= 5
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 shadow-md shadow-emerald-900/50 text-white'
                  : 'bg-zinc-800/80 opacity-40 cursor-not-allowed text-zinc-500'
              }`}
            >
              <span className="text-sm font-black leading-none">+3</span>
              <span className="absolute -bottom-1 bg-[#10061e] px-1 rounded border border-amber-500/40 text-[7px] font-mono text-amber-400 font-bold leading-none">
                5★
              </span>
              <div className="absolute left-14 bg-emerald-950 text-emerald-100 text-[10px] py-1 px-2 rounded hidden group-hover:block whitespace-nowrap z-40 border border-emerald-500/30">
                Spawn 3 Balls instantly (5★)
              </div>
            </button>

            {/* shrink paddle / actual wide paddle boost */}
            <button
              id="shop-btn-pill"
              disabled={stars < 5}
              onClick={() => buyPowerUp('SHRINK_PADDLE', 5)}
              className={`w-11 h-11 rounded-full flex flex-col justify-center items-center relative transition-all group cursor-pointer ${
                stars >= 5
                  ? 'bg-amber-600 hover:bg-amber-500 hover:scale-105 active:scale-95 shadow-md shadow-amber-900/50 text-white'
                  : 'bg-zinc-800/80 opacity-40 cursor-not-allowed text-zinc-500'
              }`}
            >
              <span className="text-base font-black leading-none">↔</span>
              <span className="absolute -bottom-1 bg-[#10061e] px-1 rounded border border-amber-500/40 text-[7px] font-mono text-amber-400 font-bold leading-none">
                5★
              </span>
              <div className="absolute left-14 bg-amber-950 text-amber-100 text-[10px] py-1 px-2 rounded hidden group-hover:block whitespace-nowrap z-40 border border-amber-500/30">
                Magnify Paddle size by 50% (5★)
              </div>
            </button>

            {/* Special explosive X */}
            <button
              id="shop-btn-explosive"
              disabled={stars < 5}
              onClick={() => buyPowerUp('EXPLOSIVE', 5)}
              className={`w-11 h-11 rounded-full flex flex-col justify-center items-center relative transition-all group cursor-pointer ${
                stars >= 5
                  ? 'bg-rose-700 hover:bg-rose-600 hover:scale-105 active:scale-95 shadow-md shadow-rose-900/50 text-white'
                  : 'bg-zinc-800/80 opacity-40 cursor-not-allowed text-zinc-500'
              }`}
            >
              <span className="text-base font-black leading-none">X</span>
              <span className="absolute -bottom-1 bg-[#10061e] px-1 rounded border border-amber-500/40 text-[7px] font-mono text-amber-400 font-bold leading-none">
                5★
              </span>
              <div className="absolute left-14 bg-purple-950 text-pink-100 text-[10px] py-1 px-2 rounded hidden group-hover:block whitespace-nowrap z-40 border border-pink-500/30">
                Explosive Clears 18 random bricks (5★)
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Settings toggle items */}
        <div className="flex flex-row lg:flex-col items-center gap-2 lg:mt-6 shrink-0">
          <button
            id="btn-toggle-sound"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-xl bg-[#250d44] hover:bg-[#34145c] text-purple-300 hover:text-white transition-all cursor-pointer border border-purple-500/10 active:scale-95"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div className="text-[8px] font-mono text-purple-500 font-bold uppercase tracking-tight hidden lg:block">
            AUDIO
          </div>
        </div>
      </aside>

      {/* 2. CENTER COLUMN: App Bar (Header) + Canvas (Pure Game broadcasting layout) */}
      <main id="game-center-cabinet" className="w-full max-w-[432px] h-[650px] bg-[#2D0B5A] rounded-2xl relative shadow-2xl border border-white/10 flex flex-col overflow-hidden shrink-0">
        
        {/* Soft Retro Screen Glass Reflection Scanline Accent */}
        <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-white/3 to-transparent mix-blend-overlay z-30"></div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_90%,rgba(0,0,0,0.35))] z-30"></div>

        {/* Top Header of Sophisticated Dark */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#3D1B6A] border-b border-white/10 z-20">
          {/* Play/Back action */}
          <button
            id="btn-back-to-levels"
            onClick={onBackToLevels}
            className="p-1.5 px-2 rounded-lg text-zinc-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Level details */}
          <div className="text-center">
            <h3 className="text-base font-extrabold tracking-wide text-white leading-none uppercase">
              BRICK MANIA
            </h3>
            <span className="text-[9px] text-[#F97316]/95 uppercase tracking-widest font-extrabold font-mono mt-1 block">
              {level.name}
            </span>
          </div>

          {/* Live counter (Heart icons of Sophisticated Dark) */}
          <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full border border-white/5">
            {[1, 2, 3].map((val) => (
              <svg
                key={val}
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  val <= lives ? 'text-red-500 fill-current scale-100' : 'text-white/20 scale-90'
                }`}
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ))}
          </div>
        </div>

        {/* Gameplay Stage Container */}
        <div id="canvas-container" ref={containerRef} className="flex-1 flex justify-center items-center bg-[#2D0B5A] relative p-1 pb-2">
          
          {/* Main Gameplay Canvas */}
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onClick={handleCanvasClick}
            className="rounded-xl shadow-2xl border-2 border-white/10 cursor-crosshair max-w-full outline-none"
          />

          {/* Launch guide notifier overlay */}
          {!isLaunched && !showVictory && !showGameOver && (
            <div className="pointer-events-none absolute bottom-12 flex flex-col items-center bg-black/70 px-4 py-2 rounded-lg backdrop-blur-xs border border-white/10">
              <span className="text-xs text-white uppercase tracking-widest font-mono animate-pulse">
                Tap playfield to shoot ball
              </span>
              <span className="text-[9px] text-[#F97316]/90 font-mono font-bold mt-1">
                Drag pointer to slide glowing paddle
              </span>
            </div>
          )}

          {/* Overlay state screens */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col justify-center items-center text-center z-10"
              >
                <div className="bg-[#240848] border-2 border-pink-500 p-8 rounded-2xl max-w-xs shadow-2xl mx-4">
                  <h2 className="text-4xl font-extrabold text-[#F97316] tracking-widest uppercase mb-4">
                    PAUSED
                  </h2>
                  <p className="text-purple-200 text-xs font-mono mb-6 leading-relaxed">
                    Take a breath! Gather your star powers and resume ready to crash.
                  </p>
                  <button
                    id="btn-paused-resume"
                    onClick={() => setIsPaused(false)}
                    className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold tracking-widest rounded-xl shadow-md cursor-pointer uppercase text-sm"
                  >
                    CONTINUE
                  </button>
                </div>
              </motion.div>
            )}

            {showGameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center text-center z-10"
              >
                <div className="bg-[#2c0003] border-2 border-red-500 p-8 rounded-2xl max-w-xs shadow-2xl mx-4">
                  <h2 className="text-4xl font-black text-rose-500 tracking-widest uppercase mb-1 drop-shadow-md">
                    GAME OVER
                  </h2>
                  <span className="text-[10px] text-red-400 font-mono font-bold tracking-widest uppercase block mb-4">
                    You ran out of lives
                  </span>
                  
                  <div className="bg-black/40 py-3 px-4 rounded-xl font-mono text-center mb-6">
                    <span className="text-zinc-400 text-xs block">FINAL SCORE</span>
                    <span className="text-3xl font-black text-white">{score}</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      id="btn-gameover-restart"
                      onClick={initGame}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold tracking-wider rounded-xl cursor-pointer uppercase text-xs"
                    >
                      TRY AGAIN
                    </button>
                    <button
                      id="btn-gameover-exit"
                      onClick={onBackToLevels}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold tracking-wider rounded-xl cursor-pointer uppercase text-xs"
                    >
                      EXIT
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {showVictory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center text-center z-10"
              >
                <div className="bg-[#122e17] border-2 border-emerald-500 p-8 rounded-2xl max-w-xs shadow-2xl mx-4">
                  <h2 className="text-4xl font-black text-emerald-400 tracking-widest uppercase mb-1 drop-shadow-md">
                    VICTORY!
                  </h2>
                  <span className="text-[10px] text-emerald-300 font-mono font-bold tracking-widest uppercase block mb-4">
                    Pixel Art Cleared Perfectly
                  </span>
                  
                  <div className="bg-black/40 py-3 px-4 rounded-xl font-mono text-center mb-6">
                    <span className="text-zinc-400 text-xs block">TOTAL SCORE</span>
                    <span className="text-3xl font-black text-amber-400">{score + 100}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      id="btn-victory-restart"
                      onClick={initGame}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold tracking-wide rounded-xl cursor-pointer uppercase text-xs"
                    >
                      PLAY AGAIN
                    </button>
                    <button
                      id="btn-victory-exit"
                      onClick={onBackToLevels}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold tracking-wide rounded-xl cursor-pointer uppercase text-xs"
                    >
                      LEVEL SELECTION
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. RIGHT COLUMN: System Controls & Dynamic informative HUD Stats */}
      <aside id="game-right-sidebar" className="w-full lg:w-64 flex flex-col gap-5 shrink-0">
        
        {/* A. System Control operations (Squeezed bottom controls moved to top) */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg flex flex-col gap-4">
          <h3 className="text-white/60 text-xxs font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5 leading-none">
            <Zap size={11} className="text-amber-400 fill-amber-400" />
            ★ System Controls
          </h3>

          {/* Engine Velocity Fast Forward Speed selector */}
          <div className="flex flex-col gap-1.5 bg-black/25 p-2.5 rounded-lg border border-white/5">
            <span className="text-[9px] font-mono font-extrabold text-[#F97316] uppercase tracking-wide leading-none">
              Game Velocity Controller:
            </span>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((spd) => (
                <button
                  key={spd}
                  id={`game-speed-${spd}x`}
                  onClick={() => setGameSpeed(spd)}
                  className={`flex-1 py-1 rounded font-mono font-black text-[10px] transition-all cursor-pointer border ${
                    gameSpeed === spd
                      ? 'bg-amber-500 border-amber-400 text-black'
                      : 'bg-[#240c44]/60 border-white/5 text-zinc-400 hover:text-white hover:bg-[#34145c]'
                  }`}
                >
                  {spd}X
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {/* Play/Pause control and Retry operations */}
            <div className="flex gap-2 w-full">
              <button
                id="btn-hud-pause"
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 flex items-center gap-1.5 px-3 py-2 justify-center bg-[#250d44]/50 hover:bg-[#34145c] text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-all font-mono text-[10px] cursor-pointer"
              >
                {isPaused ? <Play size={10} className="fill-current" /> : <Pause size={10} className="fill-current" />}
                <span className="font-extrabold">{isPaused ? "RESUME" : "PAUSE"}</span>
              </button>

              <button
                id="btn-hud-retry"
                onClick={initGame}
                className="flex-1 flex items-center gap-1.5 px-3 py-2 justify-center bg-[#250d44]/50 hover:bg-[#34145c] text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-all font-mono text-[10px] cursor-pointer"
              >
                <RotateCcw size={10} />
                <span className="font-extrabold">RETRY</span>
              </button>
            </div>

            {/* Computer Autoplay Mode switch */}
            <button
              id="btn-hud-computer"
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`w-full flex items-center gap-1.5 px-3 py-2 justify-center rounded-lg border transition-all font-mono text-[10px] cursor-pointer ${
                isAutoPlay 
                  ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981] hover:bg-[#10B981]/30 font-extrabold shadow-md' 
                  : 'bg-[#250d44]/50 border-white/10 text-zinc-300 hover:text-white hover:bg-[#34145c]'
              }`}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {isAutoPlay && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isAutoPlay ? 'bg-emerald-400' : 'bg-zinc-500'}`}></span>
              </span>
              <span className="font-extrabold uppercase">{isAutoPlay ? "COMPUTER HELP: ON" : "HELP AUTOPLAY MODE"}</span>
            </button>
          </div>
        </div>

        {/* B. Live Score Monitor with Star Emblem */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-white/40 text-[9px] uppercase tracking-widest font-extrabold font-mono mb-1 leading-none">
              Current Score
            </span>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#FFD700">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              <span className="text-white text-2xl font-bold font-mono tracking-tighter leading-none">
                {score.toLocaleString('en-US', { minimumIntegerDigits: 4, useGrouping: false })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-white/40 text-[9px] uppercase tracking-widest font-extrabold font-mono mb-1 block leading-none">
              Engine
            </span>
            <div className="text-[#34D399] font-extrabold text-base italic tracking-tighter leading-none">
              CLASSIC
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}
