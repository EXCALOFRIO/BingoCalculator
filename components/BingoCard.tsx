import React from 'react';
import type { BingoCardData } from '../types';

interface BingoCardProps {
  cardData: BingoCardData;
  drawnNumbers: Set<number>;
}

export const BingoCard: React.FC<BingoCardProps> = ({ cardData, drawnNumbers }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg grid grid-cols-9 gap-1 aspect-[9/3]">
      {cardData.flat().map((number, index) => {
        const isDrawn = number !== null && drawnNumbers.has(number);
        return (
          <div
            key={index}
            className={`flex items-center justify-center rounded text-sm sm:text-base font-bold transition-all duration-300
              ${number === null ? 'bg-gray-900/50' : 'bg-brand-light text-brand-dark'}
              ${isDrawn ? 'transform scale-105 bg-green-400 text-gray-900 shadow-lg ring-2 ring-green-200' : ''}
            `}
          >
            {number}
          </div>
        );
      })}
    </div>
  );
};
