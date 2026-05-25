import { useState } from 'react';
import { Level } from './types';
import LevelSelect from './components/LevelSelect';
import GameArea from './components/GameArea';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [screen, setScreen] = useState<'LEVEL_SELECT' | 'GAME'>('LEVEL_SELECT');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  // Sophisticated Dark side stats
  const [bricksClearedPercent, setBricksClearedPercent] = useState<number>(0);
  const [activePowerUps, setActivePowerUps] = useState<{ name: string; duration: string; color: string }[]>([
    { name: 'Multi-Ball', duration: '0:12s', color: 'bg-blue-400' },
    { name: 'Paddle Extender', duration: '0:08s', color: 'bg-green-400' }
  ]);
  const [comboMultiplier, setComboMultiplier] = useState<string>('1.5x');

  const handleSelectLevel = (level: Level) => {
    setSelectedLevel(level);
    setScreen('GAME');
    setBricksClearedPercent(0);
    setComboMultiplier('1.0x');
    setActivePowerUps([]);
  };

  const handleBackToLevels = () => {
    setScreen('LEVEL_SELECT');
  };

  // Callback to sync stats from game area
  const handleGameStatsUpdate = (percent: number, combo: string, activePowersList: { name: string; duration: string; color: string }[]) => {
    setBricksClearedPercent(percent);
    setComboMultiplier(combo);
    setActivePowerUps(activePowersList);
  };

  return (
    <div className="min-h-screen bg-[#0d0218] text-white flex flex-col justify-center items-center py-6 px-4 font-sans relative overflow-hidden select-none">
      
      {/* Decorative Animated Dark Ambient Purples */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-purple-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none"></div>



      {/* Horizontal Alignment Layout: Side-by-side on desktop */}
      <div className={`${screen === 'GAME' ? 'max-w-7xl' : 'max-w-4xl'} flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-8 z-10 w-full px-2 transition-all duration-300`}>
        
        {screen !== 'GAME' ? (
          <>
            {/* Main Arcade Frame Wrapper - Simulating Native Device proportions of Sophisticated Dark */}
            <main className="w-full max-w-[432px] h-[650px] bg-[#2D0B5A] rounded-2xl relative shadow-2xl border border-white/10 flex flex-col overflow-hidden">
              
              {/* Soft Retro Screen Glass Reflection Scanline Accent */}
              <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-white/3 to-transparent mix-blend-overlay z-30"></div>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_90%,rgba(0,0,0,0.35))] z-30"></div>

              <div className="flex-1 overflow-hidden h-full">
                <AnimatePresence mode="wait">
                  {screen === 'LEVEL_SELECT' && (
                    <motion.div
                      key="levels"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <LevelSelect
                        onSelectLevel={handleSelectLevel}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </>
        ) : (
          <GameArea
            level={selectedLevel!}
            onBackToLevels={handleBackToLevels}
            onStatsUpdate={handleGameStatsUpdate}
          />
        )}

      </div>
    </div>
  );
}
