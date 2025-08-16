export interface ChartDataPoint {
  name: number; // Represents the number of balls drawn
  Linea: number; // Probability of getting a line
  Bingo: number; // Probability of getting a full bingo
}

export type BingoNumber = number | null;
export type BingoRow = BingoNumber[];
export type BingoCardData = BingoRow[];
