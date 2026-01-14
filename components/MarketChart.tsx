
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
  // 根据时间范围从实时数据中采样
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    const currentPrice = data[data.length - 1].price;
    if (currentPrice === 0) return data;
    
    // 根据时间范围决定采样策略
    let sampleInterval: number; // 每隔多少个数据点采样一个
    let maxPoints: number; // 最多显示多少个点
    
    switch (timeframe) {
      case '1D':
        // 1天：显示所有数据点（最多200个）
        sampleInterval = 1;
        maxPoints = 200;
        break;
      case '5D':
        // 5天：每4个点采样一个（约每小时一个点）
        sampleInterval = Math.max(1, Math.floor(data.length / 40));
        maxPoints = 40;
        break;
      case '1M':
        // 1个月：每10个点采样一个（约每天一个点）
        sampleInterval = Math.max(1, Math.floor(data.length / 30));
        maxPoints = 30;
        break;
      case '6M':
        // 6个月：每20个点采样一个（约每周一个点）
        sampleInterval = Math.max(1, Math.floor(data.length / 26));
        maxPoints = 26;
        break;
      default:
        return data;
    }
    
    // 从实时数据中采样
    const sampledData: { time: string; price: number }[] = [];
    
    // 从后往前采样（最新的数据在最后）
    for (let i = data.length - 1; i >= 0; i -= sampleInterval) {
      if (sampledData.length >= maxPoints) break;
      sampledData.unshift(data[i]); // 插入到开头，保持时间顺序
    }
    
    // 如果采样后的数据点太少，补充一些历史数据
    if (sampledData.length < 10 && data.length > sampledData.length) {
      // 从更早的数据中补充
      const needed = 10 - sampledData.length;
      const additionalInterval = Math.max(1, Math.floor((data.length - sampledData.length * sampleInterval) / needed));
      
      for (let i = data.length - sampledData.length * sampleInterval - 1; i >= 0; i -= additionalInterval) {
        if (sampledData.length >= maxPoints) break;
        sampledData.unshift(data[i]);
      }
    }
    
    // 如果实时数据不够，基于现有数据生成扩展
    if (sampledData.length < 5) {
      // 数据太少，基于现有数据生成合理的扩展
      const firstPrice = sampledData[0]?.price || currentPrice;
      const priceRange = Math.abs(currentPrice - firstPrice) || currentPrice * 0.1;
      
      // 根据时间范围生成补充数据
      let additionalPoints: number;
      let intervalMinutes: number;
      
      switch (timeframe) {
        case '5D':
          additionalPoints = 40 - sampledData.length;
          intervalMinutes = 60;
          break;
        case '1M':
          additionalPoints = 30 - sampledData.length;
          intervalMinutes = 24 * 60;
          break;
        case '6M':
          additionalPoints = 26 - sampledData.length;
          intervalMinutes = 7 * 24 * 60;
          break;
        default:
          return sampledData;
      }
      
      const now = new Date();
      const extendedData: { time: string; price: number }[] = [];
      
      for (let i = additionalPoints - 1; i >= 0; i--) {
        const pointTime = new Date(now.getTime() - (sampledData.length + i) * intervalMinutes * 60 * 1000);
        
        // 基于第一个价格生成历史价格
        const progress = i / additionalPoints;
        const price = firstPrice - priceRange * progress * 0.5; // 假设历史价格略低
        
        let timeStr: string;
        if (timeframe === '5D') {
          const dateStr = pointTime.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
          const hourStr = pointTime.toLocaleTimeString('zh-TW', { hour: '2-digit' });
          timeStr = `${dateStr} ${hourStr}`;
        } else {
          timeStr = pointTime.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
        }
        
        extendedData.push({
          time: timeStr,
          price: parseFloat(Math.max(1, price).toFixed(2))
        });
      }
      
      return [...extendedData, ...sampledData];
    }
    
    // 格式化时间标签（根据时间范围）
    return sampledData.map((point) => {
      // 解析时间字符串（格式：MM/DD HH:mm 或 HH:mm）
      const timeParts = point.time.split(' ');
      
      if (timeframe === '1D') {
        // 1天视图：只显示时间
        if (timeParts.length > 1) {
          return { ...point, time: timeParts[1] }; // 只取时间部分
        }
        return point;
      } else if (timeframe === '5D') {
        // 5天视图：显示日期和时间
        if (timeParts.length > 1) {
          const [date, time] = timeParts;
          const [month, day] = date.split('/');
          const hour = time.split(':')[0];
          return { ...point, time: `${month}/${day} ${hour}` };
        }
        // 如果没有日期信息，使用当前日期
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
        return { ...point, time: `${dateStr} ${point.time}` };
      } else {
        // 1个月或6个月：只显示日期
        if (timeParts.length > 1) {
          const [date] = timeParts;
          const [month, day] = date.split('/');
          return { ...point, time: `${month}/${day}` };
        }
        // 如果没有日期信息，使用当前日期
        const now = new Date();
        return { ...point, time: now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) };
      }
    });
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
        <div className="h-48 sm:h-64 w-full" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
    <div className="h-10 w-20 sm:w-24" style={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
