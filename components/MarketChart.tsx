
import React, { useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis, CartesianGrid } from 'recharts';

export type ChartTimeframe = '1D' | '5D' | '1M' | '6M';

interface MarketChartProps {
  symbol: string;
  name?: string;
  color?: string;
  showDetails?: boolean;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  data?: { time: string; price: number }[];
}

const MarketChart: React.FC<MarketChartProps> = ({ 
  symbol,
  name,
  color = '#3b82f6',
  showDetails = false, 
  timeframe = '1D',
  onTimeframeChange,
  data = []
}) => {
  // 根据时间框架过滤和采样数据
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 解析时间字符串并转换为时间戳用于排序和过滤
    const parseTime = (timeStr: string): number => {
      // 格式可能是 "MM/DD HH:mm" 或 "HH:mm"
      const parts = timeStr.split(' ');
      if (parts.length === 2) {
        const [datePart, timePart] = parts;
        const [month, day] = datePart.split('/').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const now = new Date();
        const year = now.getFullYear();
        return new Date(year, month - 1, day, hour, minute).getTime();
      }
      // 如果只有时间，假设是今天
      const [hour, minute] = timeStr.split(':').map(Number);
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime();
    };

    const now = Date.now();
    let cutoffTime = now;

    // 根据时间框架计算截止时间
    switch (timeframe) {
      case '1D':
        cutoffTime = now - 24 * 60 * 60 * 1000; // 1天前
        break;
      case '5D':
        cutoffTime = now - 5 * 24 * 60 * 60 * 1000; // 5天前
        break;
      case '1M':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 30天前
        break;
      case '6M':
        cutoffTime = now - 180 * 24 * 60 * 60 * 1000; // 180天前
        break;
    }

    // 过滤数据并转换为图表格式
    const chartData = data
      .map(point => ({
        ...point,
        timestamp: parseTime(point.time),
        value: point.price
      }))
      .filter(point => point.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    // 根据时间框架采样数据（避免数据点过多）
    let sampleInterval = 1;
    let maxPoints = 200;

    switch (timeframe) {
      case '1D':
        sampleInterval = 1;
        maxPoints = 200;
        break;
      case '5D':
        sampleInterval = Math.max(1, Math.floor(chartData.length / 100));
        maxPoints = 100;
        break;
      case '1M':
        sampleInterval = Math.max(1, Math.floor(chartData.length / 60));
        maxPoints = 60;
        break;
      case '6M':
        sampleInterval = Math.max(1, Math.floor(chartData.length / 60));
        maxPoints = 60;
        break;
    }

    const sampled = [];
    for (let i = 0; i < chartData.length; i += sampleInterval) {
      if (sampled.length >= maxPoints) break;
      sampled.push(chartData[i]);
    }

    // 如果数据不足，补充一些历史数据点
    if (sampled.length < 10 && data.length > 0) {
      const lastPrice = data[data.length - 1]?.price || 0;
      const firstPrice = sampled[0]?.value || lastPrice;
      const priceRange = Math.abs(lastPrice - firstPrice) || lastPrice * 0.1;

      const needed = Math.min(10 - sampled.length, 20);
      for (let i = needed - 1; i >= 0; i--) {
        const timeOffset = (needed - i) * (cutoffTime - (cutoffTime - (now - cutoffTime))) / needed;
        const pointTime = new Date(cutoffTime - timeOffset);
        const progress = i / needed;
        const price = firstPrice - priceRange * progress * 0.3;

        sampled.unshift({
          time: pointTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
          price: Math.max(0.01, price),
          value: Math.max(0.01, price),
          timestamp: pointTime.getTime()
        });
      }
    }

    return sampled.length > 0 ? sampled : chartData;
  }, [data, timeframe]);

  // 格式化时间标签
  const formatTimeLabel = (timeStr: string) => {
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      const [date, time] = parts;
      if (timeframe === '1D') {
        return time; // 只显示时间
      } else if (timeframe === '5D') {
        const [month, day] = date.split('/');
        const hour = time.split(':')[0];
        return `${month}/${day} ${hour}`;
      } else {
        const [month, day] = date.split('/');
        return `${month}/${day}`;
      }
    }
    return timeStr;
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
          <p className="text-sm font-black text-slate-900">
            ${payload[0].value.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatTimeLabel(payload[0].payload.time)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (showDetails) {
    return (
      <div className="w-full space-y-6">
        {onTimeframeChange && (
          <div className="flex gap-3 flex-wrap">
            {(['1D', '5D', '1M', '6M'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                  timeframe === tf
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf === '1D' ? '1天' : tf === '5D' ? '5天' : tf === '1M' ? '1個月' : '6個月'}
              </button>
            ))}
          </div>
        )}
        <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-4">
          <ResponsiveContainer width="100%" height={600}>
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatTimeLabel}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={3}
                fill={`url(#gradient-${symbol})`}
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 6, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 小图表（用于列表显示）
  return (
    <div className="h-12 w-24 sm:w-28" style={{ minHeight: '48px', minWidth: '96px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData.slice(-20)} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketChart;
