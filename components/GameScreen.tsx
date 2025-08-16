import React, { useState, useMemo } from 'react';
import type { BingoCardData } from '../types';
import { BingoCard } from './BingoCard';
import { calculateLiveProbabilities } from '../services/bingoCalculator';

interface GameScreenProps {
  userCards: BingoCardData[];
  onNewGame: () => void;
  totalCardsInPlay: number;
}

interface StatCardProps {
    title: string;
    value: number | string;
    className?: string;
    subText?: string;
    probabilities?: { hit: number; win: number };
    outs?: Set<number>;
}

const InfoIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => (
    <span title={tooltip} className="cursor-help">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </span>
);

const StatCard: React.FC<StatCardProps> = ({ title, value, className, subText, probabilities, outs }) => {
    const outsArray = outs ? Array.from(outs).sort((a, b) => a - b) : [];
    const displayOuts = outsArray.slice(0, 5).join(', ');
    const hasMoreOuts = outsArray.length > 5;

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col justify-between h-full gap-2">
            <div>
                <div className={`text-4xl font-bold ${className}`}>{value}</div>
                <div className="text-sm text-gray-400">{title}</div>
                {subText && <div className="text-xs text-gray-500 mt-1">{subText}</div>}
            </div>
            
            {probabilities && (
                <div className="text-sm space-y-1 text-left">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Prob. acertar:</span>
                        <span className="font-semibold text-white bg-gray-700 px-2 py-0.5 rounded">{(probabilities.hit * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          Prob. ganar
                          <InfoIcon tooltip="Esta es tu probabilidad de ganar en la siguiente bola sin empates. Se reduce si muchos oponentes también están a punto de ganar, ya que podrían necesitar el mismo número que tú." />
                        </span>
                        <span className="font-semibold text-green-300 bg-green-900/50 px-2 py-0.5 rounded">{(probabilities.win * 100).toFixed(2)}%</span>
                    </div>
                </div>
            )}
            
            {outs && outs.size > 0 && (
                <div className="mt-1 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 font-semibold">Necesitas:</div>
                    <div className="text-sm font-mono text-white break-words">{displayOuts}{hasMoreOuts && '...'}</div>
                </div>
            )}
        </div>
    );
};


export const GameScreen: React.FC<GameScreenProps> = ({ userCards, onNewGame, totalCardsInPlay }) => {
  const [drawnNumbers, setDrawnNumbers] = useState<Set<number>>(new Set());
  const [drawnNumbersHistory, setDrawnNumbersHistory] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState('');

  const liveStats = useMemo(() => {
    return calculateLiveProbabilities(userCards, drawnNumbers, totalCardsInPlay);
  }, [userCards, drawnNumbers, totalCardsInPlay]);

  const handleAddNumber = (num: number) => {
    if (num >= 1 && num <= 90 && !drawnNumbers.has(num)) {
      setDrawnNumbers(prev => new Set(prev).add(num));
      setDrawnNumbersHistory(prev => [...prev, num]);
    }
  };

  const handleRemoveNumber = (num: number) => {
     if (drawnNumbers.has(num)) {
       setDrawnNumbers(prev => {
         const newSet = new Set(prev);
         newSet.delete(num);
         return newSet;
       });
       setDrawnNumbersHistory(prev => prev.filter(n => n !== num));
     }
  };

  const toggleNumber = (num: number) => {
    if (drawnNumbers.has(num)) {
      handleRemoveNumber(num);
    } else {
      handleAddNumber(num);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const num = parseInt(inputValue, 10);
      if (!isNaN(num)) {
          handleAddNumber(num);
          setInputValue('');
      }
  };

  const numberGrid = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => i + 1);
  }, []);
  
  const getStatClass = (needed: number) => {
      if (needed === 0) return 'text-amber-400'; // Win state
      if (needed === 1) return 'text-green-400'; // "1 away" state
      return 'text-brand-accent';
  };

  const lastCalledNumber = drawnNumbersHistory[drawnNumbersHistory.length - 1] ?? null;

  return (
    <div className="w-full flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Partida en Directo</h2>
          <p className="text-sm text-gray-400 text-center sm:text-left">{totalCardsInPlay} cartones en juego ({userCards.length} tuyos)</p>
        </div>
        <button
          onClick={onNewGame}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
        >
          Empezar Nueva Partida
        </button>
      </header>
      
      {/* Live Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <StatCard title="Bolas Extraídas" value={drawnNumbers.size} className="text-white" subText={`Última: ${lastCalledNumber ?? '-'}`} />
        <StatCard 
            title="Para Línea" 
            value={liveStats.neededForLine === Infinity ? '-' : liveStats.neededForLine}
            className={getStatClass(liveStats.neededForLine)}
            probabilities={liveStats.neededForLine === 1 ? { hit: liveStats.probHitLineOut, win: liveStats.probUserWinsLineNextDraw } : undefined}
            outs={liveStats.lineOuts}
        />
        <StatCard 
            title="Para Bingo" 
            value={liveStats.neededForBingo === Infinity ? '-' : liveStats.neededForBingo}
            className={getStatClass(liveStats.neededForBingo)}
            probabilities={liveStats.neededForBingo === 1 ? { hit: liveStats.probHitBingoOut, win: liveStats.probUserWinsBingoNextDraw } : undefined}
            outs={liveStats.bingoOuts}
        />
        <StatCard title="Bolas Restantes" value={90 - drawnNumbers.size} className="text-white" subText={`de 90`}/>
      </div>

      {/* User Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {userCards.map((card, index) => (
          <BingoCard key={index} cardData={card} drawnNumbers={drawnNumbers} />
        ))}
      </div>

      {/* Number Selection Area */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-3 text-center">Marcar Números Extraídos</h3>
        
        <form onSubmit={handleInputSubmit} className="flex gap-2 mb-4 max-w-sm mx-auto">
            <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Escribe un número..."
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 w-full text-center focus:ring-2 focus:ring-brand-blue focus:outline-none"
                min="1"
                max="90"
            />
            <button type="submit" className="bg-brand-blue hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
                Añadir
            </button>
        </form>

        <div className="grid grid-cols-10 gap-1.5 sm:gap-2 text-xs">
          {numberGrid.map(num => (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              className={`py-2 rounded-md transition-all duration-200 font-bold flex items-center justify-center aspect-square
                ${drawnNumbers.has(num) ? 'bg-green-500 text-white ring-2 ring-white scale-110 shadow-lg' : 'bg-gray-700 hover:bg-brand-secondary'}
              `}
              aria-pressed={drawnNumbers.has(num)}
              aria-label={`Marcar número ${num}`}
            >
              {num}
            </button>
          ))}
        </div>

        {drawnNumbersHistory.length > 0 && (
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">Historial (más reciente a la izquierda):</p>
                <div className="flex flex-row-reverse gap-2 mt-2 justify-center flex-wrap">
                    {drawnNumbersHistory.slice().reverse().slice(0, 15).map((num, index) => (
                       <span key={`${num}-${index}`} className={`font-mono px-2 py-1 rounded ${index === 0 ? 'bg-amber-400 text-black' : 'bg-gray-600 text-white'}`}>
                           {num}
                       </span>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};