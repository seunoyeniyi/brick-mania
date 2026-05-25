import { Level } from '../types';
import { ALL_LEVELS } from '../levels';
import { motion } from 'motion/react';
import { Play, Star } from 'lucide-react';

interface LevelSelectProps {
  onSelectLevel: (level: Level) => void;
}

export default function LevelSelect({ onSelectLevel }: LevelSelectProps) {
  const levels = ALL_LEVELS;

  return (
    <div id="level-select" className="h-full flex flex-col px-6 py-6 overflow-y-auto select-none bg-gradient-to-b from-[#2D0B5A] to-[#1a0533]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-3 border-b border-white/5">
        <span className="text-pink-400 font-extrabold tracking-widest text-[11px] font-mono">
          ★ BRICK MANIA ARCADE
        </span>
        <span className="text-zinc-400 text-xs font-mono">STAGES 1-8</span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h2 className="text-[10px] font-mono font-bold tracking-widest text-[#F97316] uppercase mb-1">
          CHOOSE CHALLENGE STAGE
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-wider uppercase text-pink-400">
            PLAY LEVEL
          </span>
          <span className="text-xxs text-zinc-400 font-mono">
            {levels.length} PIXEL GRIDS IN-STORE
          </span>
        </div>
      </div>

      {/* Levels list */}
      <div className="flex-1 flex flex-col gap-3.5 pb-4">
        {levels.map((level, index) => {
          // Count bricks roughly to show as a level stat
          const brickCount = level.layout.join('').replace(/\./g, '').length;
          
          return (
            <motion.div
              id={`level-card-${level.id}`}
              key={level.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.25 }}
              whileHover={{ scale: 1.02, x: 2 }}
              onClick={() => onSelectLevel(level)}
              className="flex items-center justify-between p-3.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/15 hover:border-purple-500/35 rounded-xl cursor-pointer shadow-lg group transition-colors duration-200"
            >
              <div className="flex items-center gap-4">
                {/* Level Index Number Badge - Styled in Amber/Orange Theme */}
                <div className="w-11 h-11 flex flex-col justify-center items-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 font-mono font-black text-white text-base shadow-inner">
                  <span className="text-xl">{level.id}</span>
                </div>

                {/* Level Description */}
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide group-hover:text-pink-300 transition-colors">
                    {level.name}
                  </h3>
                  <div className="flex gap-3 text-[11px] text-purple-300/70 font-mono mt-0.5">
                    <span>GRID: {level.gridWidth}x{level.gridHeight}</span>
                    <span>•</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Star size={10} className="fill-amber-400" /> {brickCount} Bricks
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:bg-pink-500 group-hover:text-white group-hover:border-transparent active:scale-90 transition-all duration-200">
                <Play size={16} className="ml-0.5 fill-current" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-[10px] text-purple-400/45 font-mono">
        ★ Brick Mania • Authentic Retro Physics Clone ★
      </div>
    </div>
  );
}
