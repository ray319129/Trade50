
import React, { useEffect, useRef } from 'react';

export type ChartTimeframe = '1D' | '5D' | '1M' | '6M';

interface MarketChartProps {
  symbol: string; // 股票代码，例如 '2330'
  name?: string; // 股票名称
  color?: string; // 保留用于兼容性，但 TradingView 有自己的颜色
  showDetails?: boolean;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  // 保留 data 用于兼容性，但 TradingView 会自己获取数据
  data?: { time: string; price: number }[];
}

// TradingView 时间框架映射
const timeframeMap: Record<ChartTimeframe, string> = {
  '1D': '1D',
  '5D': '5D',
  '1M': '1M',
  '6M': '6M'
};

const MarketChart: React.FC<MarketChartProps> = ({ 
  symbol,
  name,
  color,
  showDetails = false, 
  timeframe = '1D',
  onTimeframeChange,
  data // 保留但不使用
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const widgetRef = useRef<any>(null);

  // 将台湾股票代码转换为 TradingView 格式 (TWSE:股票代码)
  const tradingViewSymbol = `TWSE:${symbol}`;

  useEffect(() => {
    if (!containerRef.current) return;

    // 为容器创建唯一 ID
    const containerId = `tradingview_${symbol}_${Date.now()}`;
    if (containerRef.current) {
      containerRef.current.id = containerId;
    }

    // 加载 TradingView 脚本
    const loadScript = () => {
      if (scriptRef.current) {
        // 脚本已加载，直接创建 widget
        if ((window as any).TradingView) {
          createWidget(containerId);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).TradingView && containerRef.current) {
          createWidget(containerId);
        }
      };
      script.onerror = () => {
        console.error('Failed to load TradingView script');
      };
      document.head.appendChild(script);
      scriptRef.current = script;
    };

    function createWidget(id: string) {
      if (!containerRef.current || !(window as any).TradingView) return;

      // 清理旧的 widget
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.warn('Error removing old widget:', e);
        }
        widgetRef.current = null;
      }

      // 确保容器存在且为空
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      try {
        // 创建新的 widget
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: tradingViewSymbol,
          interval: timeframeMap[timeframe],
          timezone: 'Asia/Taipei',
          theme: 'light',
          style: '1',
          locale: 'zh_TW',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: !showDetails,
          container_id: id,
          height: showDetails ? 500 : 100,
          width: '100%',
          hide_volume: !showDetails,
          studies_overrides: {},
          overrides: {
            'paneProperties.background': '#ffffff',
            'paneProperties.backgroundType': 'solid',
          }
        });
      } catch (error) {
        console.error('Error creating TradingView widget:', error);
      }
    }

    loadScript();

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.warn('Error removing widget on cleanup:', e);
        }
        widgetRef.current = null;
      }
    };
  }, [tradingViewSymbol, timeframe, showDetails, symbol]);

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
        <div 
          ref={containerRef} 
          className="w-full rounded-2xl overflow-hidden border border-slate-200"
          style={{ minHeight: '500px' }}
        />
      </div>
    );
  }

  // 小图表（用于列表显示）
  return (
    <div 
      ref={containerRef} 
      className="h-10 w-20 sm:w-24 rounded overflow-hidden"
      style={{ minHeight: '40px' }}
    />
  );
};

export default MarketChart;
