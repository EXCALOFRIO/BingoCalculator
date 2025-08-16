
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

import { ProbabilityChart } from './components/ProbabilityChart';
import { GameScreen } from './components/GameScreen';
import { generateChartData } from './services/bingoCalculator';
import type { ChartDataPoint, BingoCardData } from './types';
import { BingoCard } from './components/BingoCard';

// Initialize AI client once to prevent re-creation on re-renders
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Helper Functions ---
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

/**
 * Valida y sanea la cuadrícula 3x9 recibida de la IA.
 * Reemplaza los 0 con null y verifica que el cartón sea válido (3x9 con 15 números y columnas correctas).
 * @param grid La cuadrícula 3x9 de la IA.
 * @returns Un BingoCardData válido o null si la cuadrícula es inválida.
 */
const processOcrGrid = (grid: (number | null)[][]): BingoCardData | null => {
  // 1. Validar estructura básica (3x9)
  if (!grid || grid.length !== 3 || !grid.every(row => Array.isArray(row) && row.length === 9)) {
    console.error("Estructura de grid inválida recibida de la IA: no es 3x9.", grid);
    return null;
  }

  // 2. Sanear la cuadrícula: reemplazar 0 y valores no válidos por null.
  const sanitizedGrid: BingoCardData = grid.map(row => 
    row.map(cell => {
      if (typeof cell === 'number' && cell >= 1 && cell <= 90) {
        return cell;
      }
      return null;
    })
  );

  // 3. Validar que el cartón tenga exactamente 15 números.
  const numbersCount = sanitizedGrid.flat().filter(n => n !== null).length;
  if (numbersCount !== 15) {
     console.error(`El cartón no tiene 15 números. Detectados: ${numbersCount}.`, sanitizedGrid);
     return null;
  }
  
  // 4. Validar que los números están en sus columnas correctas.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const num = sanitizedGrid[r][c];
      if (num !== null) {
        let expectedCol = -1;
        if (num >= 1 && num <= 9) expectedCol = 0;
        else if (num >= 10 && num <= 19) expectedCol = 1;
        else if (num >= 20 && num <= 29) expectedCol = 2;
        else if (num >= 30 && num <= 39) expectedCol = 3;
        else if (num >= 40 && num <= 49) expectedCol = 4;
        else if (num >= 50 && num <= 59) expectedCol = 5;
        else if (num >= 60 && num <= 69) expectedCol = 6;
        else if (num >= 70 && num <= 79) expectedCol = 7;
        else if (num >= 80 && num <= 90) expectedCol = 8;
        
        if (c !== expectedCol) {
          console.error(`Número ${num} en columna incorrecta. Encontrado en columna ${c}, esperado en ${expectedCol}.`);
          return null; // El cartón es inválido.
        }
      }
    }
  }

  return sanitizedGrid;
};


// --- Main App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<'SETUP' | 'GAME'>('SETUP');
  const [userCards, setUserCards] = useState<BingoCardData[]>([]);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  
  // State for the theory calculator
  const [totalCardsStr, setTotalCardsStr] = useState<string>('100');
  const [totalCards, setTotalCards] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string>('');
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCalculate = () => {
    const cards = parseInt(totalCardsStr, 10);
    if (isNaN(cards) || cards <= 0) {
      setError('Por favor, introduce un número válido de cartones.');
      setTotalCards(null);
      setChartData([]);
      setIsCalculated(false);
    } else {
      setError('');
      setTotalCards(cards);
      const data = generateChartData();
      
      const adjustedData = data.map(d => {
        const probLineaOneCard = d.Linea;
        const probBingoOneCard = d.Bingo;
        const probNoLineaOneCard = 1 - probLineaOneCard;
        const probNoBingoOneCard = 1 - probBingoOneCard;
        const probNoLineaAllCards = Math.pow(probNoLineaOneCard, cards);
        const probNoBingoAllCards = Math.pow(probNoBingoOneCard, cards);
        return {
          ...d,
          Linea: 1 - probNoLineaAllCards,
          Bingo: 1 - probNoBingoAllCards,
        };
      });
      setChartData(adjustedData);
      setIsCalculated(true);
    }
  };

  const runOcr = useCallback(async (file: File) => {
    setIsLoadingOcr(true);
    setOcrError(null);
    try {
      const imagePart = await fileToGenerativePart(file);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [
            imagePart,
            { text: "Analiza esta imagen de un cartón de bingo de 90 bolas español. Extrae los números y su posición exacta en una cuadrícula de 3x9. Las reglas de las columnas son: Columna 1 (índice 0): 1-9. Columna 2 (índice 1): 10-19. Columna 3 (índice 2): 20-29. Columna 4 (índice 3): 30-39. Columna 5 (índice 4): 40-49. Columna 6 (índice 5): 50-59. Columna 7 (índice 6): 60-69. Columna 8 (índice 7): 70-79. Columna 9 (índice 8): 80-90. Devuelve solo un array JSON de 3x9. Usa 'null' para las casillas vacías. Asegúrate de que cada número esté en su columna correcta según las reglas." }
        ]},
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.INTEGER,
                nullable: true,
              }
            }
          }
        }
      });
      
      const jsonText = response.text.trim();
      const grid = JSON.parse(jsonText);
      
      const processedCard = processOcrGrid(grid);
      if (processedCard) {
        setUserCards(prev => [...prev, processedCard]);
      } else {
        setOcrError('No se han podido leer cartones válidos en la imagen. Asegúrate de que la foto sea clara, esté bien iluminada y el cartón completo sea visible.');
      }

    } catch (e) {
      console.error(e);
      setOcrError("Ha ocurrido un error inesperado al procesar la imagen.");
    } finally {
      setIsLoadingOcr(false);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      runOcr(file);
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const onStartGame = () => {
    if (userCards.length > 0) {
      setView('GAME');
    }
  };
  
  const onNewGame = () => {
    setUserCards([]);
    setView('SETUP');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-7xl mx-auto flex flex-col gap-8">
        <header className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-accent mb-2">
              Calculadora de Probabilidad de Bingo
            </h1>
            <p className="text-lg text-gray-400">
              Analiza tus probabilidades teóricas o juega una partida en directo.
            </p>
        </header>

        {view === 'SETUP' ? (
          <div className="flex flex-col gap-8">
            <section id="calculator" className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-center text-brand-accent">Calculadora Teórica</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <input
                  type="number"
                  value={totalCardsStr}
                  onChange={(e) => setTotalCardsStr(e.target.value)}
                  placeholder="Ej: 100"
                  className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 w-full sm:w-auto text-center focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  aria-label="Número total de cartones vendidos"
                />
                <button
                  onClick={handleCalculate}
                  className="bg-brand-blue hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                >
                  Calcular Probabilidad
                </button>
              </div>
              {error && <p className="text-red-400 text-center mt-2">{error}</p>}
              
              <div className="mt-6 h-80 w-full bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                {isCalculated ? (
                    <ProbabilityChart data={chartData} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Introduce el número de cartones y pulsa "Calcular" para ver la gráfica.</p>
                    </div>
                )}
              </div>
            </section>

            <section id="live-game" className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-center text-brand-accent">Jugar Partida en Directo</h2>
                <div className="text-center mb-6">
                    <p className="text-gray-400 mb-4">Sube una foto de tus cartones para empezar a jugar y ver tus probabilidades en tiempo real.</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      ref={fileInputRef}
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer bg-brand-secondary hover:bg-brand-blue text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 inline-block">
                        {isLoadingOcr ? "Procesando..." : "Subir Cartón"}
                    </label>
                    {ocrError && <p className="text-red-400 text-center mt-4">{ocrError}</p>}
                </div>
                
                {userCards.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {userCards.map((card, index) => (
                                <div key={index} className="relative">
                                    <BingoCard cardData={card} drawnNumbers={new Set()} />
                                    <button
                                      onClick={() => setUserCards(cards => cards.filter((_, i) => i !== index))}
                                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
                                      aria-label="Eliminar cartón"
                                    >&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="text-center">
                            <button
                                onClick={onStartGame}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105 text-lg"
                            >
                                ¡Empezar a Jugar con {userCards.length} Cartón(es)!
                            </button>
                        </div>
                    </>
                )}
            </section>
          </div>
        ) : (
          <GameScreen userCards={userCards} onNewGame={onNewGame} />
        )}
      </main>
    </div>
  );
};

export default App;
