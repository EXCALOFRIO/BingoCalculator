
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartDataPoint } from '../types';

interface ProbabilityChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-white mb-2">{`Bolas Extraídas: ${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">
            {`${pld.name}: ${(pld.value * 100).toFixed(4)}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 30,
          bottom: 20,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
        <XAxis 
            dataKey="name" 
            stroke="#a0aec0"
            label={{ value: 'Bolas Extraídas', position: 'insideBottom', offset: -15, fill: '#a0aec0' }}
        />
        <YAxis 
            stroke="#a0aec0" 
            tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`}
            label={{ value: 'Probabilidad', angle: -90, position: 'insideLeft', offset: -20, fill: '#a0aec0' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#d1d5db', paddingBottom: '10px' }} />
        <Line 
            type="monotone" 
            dataKey="Linea" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 6 }} 
        />
        <Line 
            type="monotone" 
            dataKey="Bingo" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 6 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
