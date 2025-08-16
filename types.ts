export type BingoNumber = number | null;
export type BingoRow = BingoNumber[];
export type BingoCardData = BingoRow[];

export interface ChartDataPoint {
  name: number; // Represents the number of balls drawn
  Linea: number; // Probability of winning Linea
  Bingo: number; // Probability of winning Bingo
}
