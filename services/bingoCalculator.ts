import type { ChartDataPoint, BingoCardData } from '../types';

/**
 * Calculates combinations C(n, k) = n! / (k! * (n-k)!).
 * Uses a multiplicative formula to avoid large intermediate numbers from factorials,
 * which can lead to precision errors or overflow in standard JavaScript numbers.
 * @param n The total number of items.
 * @param k The number of items to choose.
 * @returns The number of ways to choose k items from a set of n.
 */
const combinations = (n: number, k: number): number => {
  if (k < 0 || k > n) {
    return 0;
  }
  if (k === 0 || k === n) {
    return 1;
  }
  // Symmetry: C(n, k) === C(n, n-k). Use the smaller k for fewer iterations.
  if (k > n / 2) {
    k = n - k;
  }

  let res = 1;
  for (let i = 1; i <= k; i++) {
    // (res * (n - i + 1)) / i
    // This order of operations helps maintain precision.
    res = (res * (n - i + 1)) / i;
  }
  return res;
};

/**
 * Generates an array of data points for the probability chart.
 * It calculates the cumulative probability of achieving a line or a full bingo
 * for each number drawn from 1 to 90.
 *
 * A standard Spanish bingo has 90 balls.
 * A card has 15 numbers.
 * A line has 5 numbers.
 */
export const generateChartData = (): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const TOTAL_BALLS = 90;
  const NUMBERS_FOR_LINE = 5;
  const NUMBERS_FOR_BINGO = 15;

  for (let ballsDrawn = 1; ballsDrawn <= TOTAL_BALLS; ballsDrawn++) {
    let probLinea = 0;
    let probBingo = 0;

    if (ballsDrawn >= NUMBERS_FOR_LINE) {
      const successfulOutcomes = combinations(TOTAL_BALLS - NUMBERS_FOR_LINE, ballsDrawn - NUMBERS_FOR_LINE);
      const totalOutcomes = combinations(TOTAL_BALLS, ballsDrawn);
      probLinea = totalOutcomes > 0 ? successfulOutcomes / totalOutcomes : 0;
    }

    if (ballsDrawn >= NUMBERS_FOR_BINGO) {
      const successfulOutcomes = combinations(TOTAL_BALLS - NUMBERS_FOR_BINGO, ballsDrawn - NUMBERS_FOR_BINGO);
      const totalOutcomes = combinations(TOTAL_BALLS, ballsDrawn);
      probBingo = totalOutcomes > 0 ? successfulOutcomes / totalOutcomes : 0;
    }

    data.push({
      name: ballsDrawn,
      Linea: probLinea,
      Bingo: probBingo,
    });
  }

  return data;
};

export const calculateLiveProbabilities = (cards: BingoCardData[], drawnNumbers: Set<number>) => {
  if (cards.length === 0 || drawnNumbers.size >= 90) {
    return {
      neededForLine: Infinity,
      neededForBingo: Infinity,
      probLineNextDraw: 0,
      probBingoNextDraw: 0,
    };
  }

  let minNeededForLine = 5;
  let minNeededForBingo = 15;

  const cardDetails = cards.map(card => {
    const flatNumbers = card.flat().filter(n => n !== null);
    const cardHits = flatNumbers.filter(n => drawnNumbers.has(n)).length;
    const cardNeeded = 15 - cardHits;
    if (cardNeeded < minNeededForBingo) {
      minNeededForBingo = cardNeeded;
    }
    
    card.forEach(row => {
      const rowNumbers = row.filter(n => n !== null);
      if (rowNumbers.length > 0) {
        const lineHits = rowNumbers.filter(n => drawnNumbers.has(n)).length;
        const lineNeeded = 5 - lineHits;
        if (lineNeeded < minNeededForLine) {
          minNeededForLine = lineNeeded;
        }
      }
    });
    return { card, cardNeeded };
  });

  const winningNumbersForLine = new Set<number>();
  if (minNeededForLine === 1) {
    cards.forEach(card => {
      card.forEach(row => {
        const rowNumbers = row.filter(n => n !== null);
        if (rowNumbers.length === 5) {
          const hits = rowNumbers.filter(n => drawnNumbers.has(n));
          if (hits.length === 4) {
            const neededNumber = rowNumbers.find(n => !drawnNumbers.has(n as number));
            if (neededNumber) {
              winningNumbersForLine.add(neededNumber);
            }
          }
        }
      });
    });
  }
  
  const winningNumbersForBingo = new Set<number>();
  if (minNeededForBingo === 1) {
    cardDetails.forEach(({ card, cardNeeded }) => {
      if (cardNeeded === 1) {
        const neededNumber = card.flat().find(n => n !== null && !drawnNumbers.has(n));
        if (neededNumber) {
          winningNumbersForBingo.add(neededNumber);
        }
      }
    });
  }

  const remainingBalls = 90 - drawnNumbers.size;
  if (remainingBalls <= 0) {
    return {
      neededForLine: minNeededForLine,
      neededForBingo: minNeededForBingo,
      probLineNextDraw: 0,
      probBingoNextDraw: 0,
    };
  }

  const probLineNextDraw = minNeededForLine === 1 ? winningNumbersForLine.size / remainingBalls : 0;
  const probBingoNextDraw = minNeededForBingo === 1 ? winningNumbersForBingo.size / remainingBalls : 0;
  
  return {
    neededForLine: minNeededForLine,
    neededForBingo: minNeededForBingo,
    probLineNextDraw: Math.min(probLineNextDraw, 1),
    probBingoNextDraw: Math.min(probBingoNextDraw, 1),
  };
};
