import React, { useState, useEffect, useMemo } from 'react';
import type { BingoCardData } from '../types';
import { BingoCard } from './BingoCard';
import { calculateLiveProbabilities } from '../services/bingoCalculator';

interface GameScreenProps {
  userCards: BingoCardData[];
  onNewGame: () => void;
}

const StatCard: React.FC<{ title: string; value: number | string; className?: string; subText?: string }> = ({ title, value, className, subText }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col justify-center">
        <div className={`text-4xl font-bold ${className}`}>{value}</div>
        <div className="text-sm text-gray-400">{title}</div>
        {subText && <div className="text-xs text-gray-500 mt-1">{subText}</div>}
    </div>
);

export const GameScreen: React.FC<GameScreenProps> = ({ userCards, onNewGame }) => {
  const [drawnNumbers, setDrawnNumbers] = useState<Set<number>>(new Set());
  const [liveStats, setLiveStats] = useState({
    neededForLine: Infinity,
    neededForBingo: Infinity,
    probLineNextDraw: 0,
    probBingoNextDraw: 0,
  });

  useEffect(() => {
    const stats = calculateLiveProbabilities(userCards, drawnNumbers);
    setLiveStats(stats);
  }, [userCards, drawnNumbers]);

  const toggleNumber = (num: number) => {
    setDrawnNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(num)) {
        newSet.delete(num);
      } else {
        newSet.add(num);
      }
      return newSet;
    });
  };

  const numberGrid = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => i + 1);
  }, []);
  
  const getStatClass = (needed: number) => {
      if (needed === 0) return 'text-amber-400'; // Win state
      if (needed === 1) return 'text-green-400'; // "1 away" state
      return 'text-brand-accent';
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Partida en Directo</h2>
        <button
          onClick={onNewGame}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
        >
          Empezar Nueva Partida
        </button>
      </header>
      
      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <StatCard title="Bolas Extraídas" value={drawnNumbers.size} className="text-white" />
        <StatCard 
            title="Para Línea" 
            value={liveStats.neededForLine === Infinity ? '-' : liveStats.neededForLine}
            className={getStatClass(liveStats.neededForLine)}
            subText={`Prob: ${(liveStats.probLineNextDraw * 100).toFixed(1)}%`}
        />
        <StatCard 
            title="Para Bingo" 
            value={liveStats.neededForBingo === Infinity ? '-' : liveStats.neededForBingo}
            className={getStatClass(liveStats.neededForBingo)}
            subText={`Prob: ${(liveStats.probBingoNextDraw * 100).toFixed(1)}%`}
        />
        <StatCard title="Bolas Restantes" value={90 - drawnNumbers.size} className="text-white" />
      </div>

      {/* User Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {userCards.map((card, index) => (
          <BingoCard key={index} cardData={card} drawnNumbers={drawnNumbers} />
        ))}
      </div>

      {/* Number Selection Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-3 text-center">Marcar Números Extraídos</h3>
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 grid grid-cols-10 gap-1.5 sm:gap-2 text-xs">
          {numberGrid.map(num => (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              className={`py-2 rounded-md transition-all duration-200 font-bold flex items-center justify-center aspect-square
                ${drawnNumbers.has(num) ? 'bg-green-500 text-white ring-2 ring-white scale-110 shadow-lg' : 'bg-gray-700 hover:bg-brand-secondary'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
