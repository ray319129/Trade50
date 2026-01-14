
import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';

export type ChartTimeframe = '1D' | '5D' | '1M' | '6M';

interface MarketChartProps {
  data: { time: string; price: number }[];
  color: string;
  showDetails?: boolean;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
}

const MarketChart: React.FC<MarketChartProps> = ({ 
  data, 
  color, 
  showDetails = false, 
  timeframe = '1D',
  onTimeframeChange 
}) => {
  // 根据时间范围过滤数据
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    const now = Date.now();
    let cutoffTime: number;
    
    switch (timeframe) {
      case '1D':
        cutoffTime = now - 24 * 60 * 60 * 1000; // 1天
        break;
      case '5D':
        cutoffTime = now - 5 * 24 * 60 * 60 * 1000; // 5天
        break;
      case '1M':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 1个月
        break;
      case '6M':
        cutoffTime = now - 180 * 24 * 60 * 60 * 1000; // 6个月
        break;
      default:
        return data;
    }
    
    // 如果数据中没有时间戳，返回所有数据（用于实时数据）
    return data;
  };

  const filteredData = getFilteredData();

  if (showDetails) {
    return (
      <div className="w-full space-y-4">
        {onTimeframeChange && (
          <div className="flex gap-2">
            {(['1D', '5D', '1M', '6M'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  timeframe === tf
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf === '1D' ? '1天' : tf === '5D' ? '5天' : tf === '1M' ? '1個月' : '6個月'}
              </button>
            ))}
          </div>
        )}
        <div className="h-48 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                hide={filteredData.length > 20}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, '價格']}
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
