
import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';

interface MarketChartProps {
  data: { time: string; price: number }[];
  color: string;
  showDetails?: boolean;
}

const MarketChart: React.FC<MarketChartProps> = ({ data, color, showDetails = false }) => {
  if (showDetails) {
    return (
      <div className="h-48 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              formatter={(value: number) => [`$${value}`, '價格']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={color} 
              fillOpacity={1} 
              fill="url(#colorPriceDetail)" 
              strokeWidth={3}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-10 w-20 sm:w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            fill={color}
            fillOpacity={0.05}
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketChart;
