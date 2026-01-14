
import { TAIWAN_50_STOCKS } from '../constants';
import { Stock, StockHistoryPoint } from '../types';

/**
 * Checks if the Taiwan stock market is currently open.
 * Monday to Friday, 09:00 to 13:30.
 */
export const isMarketOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  const isWeekday = day >= 1 && day <= 5;
  const isTimeRange = totalMinutes >= 9 * 60 && totalMinutes <= 13 * 60 + 30;

  return isWeekday && isTimeRange;
};

// Internal cache to maintain history and handle closed market states
const stockCache: Map<string, Stock> = new Map();

/**
 * Fetches real-time stock data from the Taiwan Stock Exchange (TWSE) MIS API.
 * Uses allorigins.win as a CORS proxy for frontend-only environment.
 * Includes retry mechanism for better reliability.
 */
export const fetchRealTimeStockData = async (retries = 3): Promise<Stock[]> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const symbols = TAIWAN_50_STOCKS.map(s => `tse_${s.symbol}.tw`).join('|');
      const apiUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${symbols}&json=1&delay=0&_=${Date.now()}`;
      // 使用 allorigins.win 作为 CORS proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      if (!rawData.contents) {
        throw new Error('Invalid response format from proxy');
      }
      
      const data = JSON.parse(rawData.contents);

      if (!data.msgArray || !Array.isArray(data.msgArray)) {
        console.warn('TWSE API returned no data, using cache if available');
        return Array.from(stockCache.values());
      }

    const marketOpen = isMarketOpen();
    const updatedStocks: Stock[] = data.msgArray.map((msg: any) => {
      const symbol = msg.c;
      const name = msg.n;
      const yesterdayClose = parseFloat(msg.y);
      // 'z' is current price, 'b' is best bid, fallback to yesterday close if null
      const currentPrice = parseFloat(msg.z || msg.b?.split('_')[0] || msg.y);
      const high = parseFloat(msg.h || currentPrice);
      const low = parseFloat(msg.l || currentPrice);
      const volume = parseInt(msg.v || '0');
      
      const change = currentPrice - yesterdayClose;
      const changePercent = (change / yesterdayClose) * 100;

      const existing = stockCache.get(symbol);
      let history = existing ? [...existing.history] : [];

      // Update history if market is open or if it's the first time fetching
      if (marketOpen || history.length === 0) {
        const now = new Date();
        // 保存完整的时间信息：日期和时间
        const dateStr = now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
        const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const fullTimeStr = `${dateStr} ${timeStr}`;
        
        // 检查是否需要添加新数据点
        // 如果价格变化超过0.05%或者距离上次更新超过2分钟，则添加新点
        const priceChanged = history.length === 0 || 
          Math.abs((currentPrice - history[history.length - 1].price) / history[history.length - 1].price) > 0.0005;
        
        // 检查时间间隔（检查完整时间字符串）
        const timeChanged = history.length === 0 || history[history.length - 1].time !== fullTimeStr;
        
        if (priceChanged || (timeChanged && history.length < 2000)) {
          // 如果价格变化或时间变化且数据点未满，添加新点
          history.push({ time: fullTimeStr, price: currentPrice });
          // 保留最多2000个数据点（约6个月的交易日数据，每天约4-5个点）
          if (history.length > 2000) history.shift();
        } else if (history.length > 0) {
          // 如果价格和时间都没变，更新最后一个点的价格为当前价格（确保数据最新）
          history[history.length - 1] = { time: fullTimeStr, price: currentPrice };
        }
      } else if (history.length > 0) {
        // 市场关闭时，更新最后一个点的价格为当前价格（可能是收盘价）
        const lastPoint = history[history.length - 1];
        if (lastPoint.price !== currentPrice) {
          const now = new Date();
          const dateStr = now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
          const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
          history[history.length - 1] = { 
            time: `${dateStr} ${timeStr}`, 
            price: currentPrice 
          };
        }
      }

      const stock: Stock = {
        symbol,
        name,
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high,
        low,
        volume,
        history,
        weeklyHistory: existing?.weeklyHistory || [], // Note: Real historical data requires a separate API
        monthlyHistory: existing?.monthlyHistory || []
      };

      stockCache.set(symbol, stock);
      return stock;
    });

      return updatedStocks;
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      if (error.name === 'AbortError') {
        console.warn(`Request timeout (attempt ${attempt + 1}/${retries})`);
      } else {
        console.error(`Error fetching stock data (attempt ${attempt + 1}/${retries}):`, error);
      }
      
      if (isLastAttempt) {
        console.warn('All retry attempts failed, returning cached data');
        // Return cached data on final failure
        const cached = Array.from(stockCache.values());
        if (cached.length > 0) {
          return cached;
        }
        // If no cache, return empty array to prevent app crash
        return [];
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  // Fallback: return empty array if all retries fail and no cache
  return Array.from(stockCache.values());
};

/**
 * Historical data is typically not provided by the MIS API in one go.
 * In a production app, you would fetch this from a historical data provider.
 * For this simulator, we'll keep the existing history logic or initialize empty.
 */
export const getMockStockData = async (): Promise<Stock[]> => {
  return await fetchRealTimeStockData();
};
