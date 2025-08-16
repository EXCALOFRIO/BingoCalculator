import type { BingoCardData } from '../types';

// --- Advanced Probability Calculation for Live Game ---

// Precompute log factorials for performance and to handle large numbers safely
const LOG_FACTORIALS = [0];
for (let i = 1; i <= 90; i++) {
  LOG_FACTORIALS[i] = LOG_FACTORIALS[i - 1] + Math.log(i);
}

/**
 * Calculates log(C(n, k)) to avoid large number overflow.
 */
const logCombinations = (n: number, k: number): number => {
  if (k < 0 || k > n) {
    return -Infinity; // log(0)
  }
  return LOG_FACTORIALS[n] - LOG_FACTORIALS[k] - LOG_FACTORIALS[n - k];
};

/**
 * Calculates the probability of getting `successesInSample` successes from a sample of `sampleSize`,
 * drawn from a population of `population` which contains `successesInPopulation` total successes.
 * P(x) = [C(K, x) * C(N-K, n-x)] / C(N, n)
 */
const hypergeometricProbability = (population: number, successesInPopulation: number, sampleSize: number, successesInSample: number): number => {
    if (sampleSize < 0 || successesInSample < 0 || sampleSize > population || successesInSample > successesInPopulation || (sampleSize - successesInSample) > (population - successesInPopulation)) {
        return 0;
    }
    const logProb = logCombinations(successesInPopulation, successesInSample) +
                    logCombinations(population - successesInPopulation, sampleSize - successesInSample) -
                    logCombinations(population, sampleSize);
    return Math.exp(logProb);
};


export const calculateLiveProbabilities = (cards: BingoCardData[], drawnNumbers: Set<number>, totalCardsInPlay: number) => {
  const userCardCount = cards.length;
  const opponentCardCount = totalCardsInPlay > userCardCount ? totalCardsInPlay - userCardCount : 0;
  const ballsDrawnCount = drawnNumbers.size;
  const remainingBallsCount = 90 - ballsDrawnCount;
  
  const initialResult = {
      neededForLine: Infinity,
      neededForBingo: Infinity,
      probHitLineOut: 0,
      probHitBingoOut: 0,
      probUserWinsLineNextDraw: 0,
      probUserWinsBingoNextDraw: 0,
      lineOuts: new Set<number>(),
      bingoOuts: new Set<number>(),
  };

  if (userCardCount === 0 || remainingBallsCount <= 0) {
    return initialResult;
  }

  let minNeededForLine = 5;
  let minNeededForBingo = 15;

  // First pass: find the minimum numbers needed for line and bingo for the user
  cards.forEach(card => {
    const flatNumbers = card.flat().filter((n): n is number => n !== null);
    const cardHits = flatNumbers.filter(n => drawnNumbers.has(n)).length;
    const cardNeeded = 15 - cardHits;
    if (cardNeeded < minNeededForBingo) {
      minNeededForBingo = cardNeeded;
    }
    
    card.forEach(row => {
      const rowNumbers = row.filter((n): n is number => n !== null);
      if (rowNumbers.length === 5) { // Ensure it's a valid line of 5 numbers
        const lineHits = rowNumbers.filter(n => drawnNumbers.has(n)).length;
        const lineNeeded = 5 - lineHits;
        if (lineNeeded < minNeededForLine) {
          minNeededForLine = lineNeeded;
        }
      }
    });
  });
  
  // Second pass: collect all "outs" for the user's lines/cards that are closest to winning
  const lineOuts = new Set<number>();
  if (minNeededForLine <= 5 && minNeededForLine > 0) {
    cards.forEach(card => {
      card.forEach(row => {
        const rowNumbers = row.filter((n): n is number => n !== null);
        if (rowNumbers.length === 5) {
          const lineHits = rowNumbers.filter(n => drawnNumbers.has(n)).length;
          if (5 - lineHits === minNeededForLine) {
            rowNumbers.forEach(num => {
              if (!drawnNumbers.has(num)) {
                lineOuts.add(num);
              }
            });
          }
        }
      });
    });
  }

  const bingoOuts = new Set<number>();
  if (minNeededForBingo <= 15 && minNeededForBingo > 0) {
    cards.forEach(card => {
      const flatNumbers = card.flat().filter((n): n is number => n !== null);
      const cardHits = flatNumbers.filter(n => drawnNumbers.has(n)).length;
      if (15 - cardHits === minNeededForBingo) {
        flatNumbers.forEach(num => {
          if (!drawnNumbers.has(num)) {
            bingoOuts.add(num);
          }
        });
      }
    });
  }
  
  // --- Calculate Win Probabilities ---
  
  let probHitLineOut = 0;
  let probUserWinsLineNextDraw = 0;
  if (minNeededForLine === 1) {
    probHitLineOut = lineOuts.size / remainingBallsCount;
    
    const pLine4Hits = hypergeometricProbability(90, 5, ballsDrawnCount, 4);
    const expectedOpponentReadyLines = opponentCardCount * 3 * pLine4Hits;
    
    // Prob that at least one opponent wins is 1 - (prob that no opponents win)
    // We model the "outs" for ready opponents as being randomly distributed among remaining balls.
    const probOpponentWinsLine = expectedOpponentReadyLines > 0 
        ? 1 - Math.pow(1 - 1 / remainingBallsCount, expectedOpponentReadyLines) 
        : 0;
    
    probUserWinsLineNextDraw = probHitLineOut * (1 - probOpponentWinsLine);
  }

  let probHitBingoOut = 0;
  let probUserWinsBingoNextDraw = 0;
  if (minNeededForBingo === 1) {
    probHitBingoOut = bingoOuts.size / remainingBallsCount;
    
    const pBingo14Hits = hypergeometricProbability(90, 15, ballsDrawnCount, 14);
    const expectedOpponentReadyCards = opponentCardCount * pBingo14Hits;

    const probOpponentWinsBingo = expectedOpponentReadyCards > 0
        ? 1 - Math.pow(1 - 1 / remainingBallsCount, expectedOpponentReadyCards)
        : 0;
    
    probUserWinsBingoNextDraw = probHitBingoOut * (1 - probOpponentWinsBingo);
  }


  return {
    neededForLine: minNeededForLine,
    neededForBingo: minNeededForBingo,
    probHitLineOut: Math.min(probHitLineOut, 1),
    probHitBingoOut: Math.min(probHitBingoOut, 1),
    probUserWinsLineNextDraw: Math.max(0, Math.min(probUserWinsLineNextDraw, 1)),
    probUserWinsBingoNextDraw: Math.max(0, Math.min(probUserWinsBingoNextDraw, 1)),
    lineOuts,
    bingoOuts,
  };
};