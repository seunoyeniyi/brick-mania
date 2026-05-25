export type UniverseType = 'EASY' | 'DENSE' | 'HARD' | 'SUPER_HARD';

export interface Level {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  // A string-based grid for visual representation.
  // We can use characters to represent empty '.' or colors (e.g. 'W' = white, 'R' = red, 'Y' = yellow, 'G' = green, 'B' = blue, 'O' = orange, 'P' = pink, 'D' = dark red, 'M' = maroon, 'H' = brown, 'K' = black, 'S' = sky)
  layout: string[];
}

export interface Brick {
  row: number;
  col: number;
  color: string;
  maxHp: number;
  hp: number;
  // Dynamic scale inside the canvas
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export type PowerUpType = 
  | 'MULTIPLIER'   // x3 current balls
  | 'ADD_THREE'    // +3 immediate balls
  | 'SHRINK_PADDLE'// - shrink paddle temporarily
  | 'EXPLOSIVE'    // X clear random/nearby bricks
  | 'STAR';        // Star item to collect for score

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  radius: number;
  speed: number;
}

export interface StarParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface GameStats {
  score: number;
  starsCollected: number;
  lives: number;
  ballsDestroyed: number;
  bricksDestroyed: number;
}
