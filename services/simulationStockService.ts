
import { TAIWAN_50_STOCKS } from '../constants';
import { Stock, StockHistoryPoint } from '../types';

// 模擬股票數據生成器
class SimulationStockService {
  private stockData: Map<string, Stock> = new Map();
  private basePrices: Map<string, number> = new Map();
  private lastUpdateTime: number = Date.now();

  // 初始化模擬股票數據
  initializeStocks(): Stock[] {
    const now = Date.now();
    const stocks: Stock[] = TAIWAN_50_STOCKS.map((stock, index) => {
      // 生成基礎價格（基於真實價格範圍的模擬值）
      const basePrice = 50 + (index % 20) * 50 + Math.random() * 100;
      this.basePrices.set(stock.symbol, basePrice);

      // 生成初始價格（在基礎價格上下波動）
      const initialPrice = basePrice * (0.8 + Math.random() * 0.4);
      const change = (Math.random() - 0.5) * initialPrice * 0.05;
      const changePercent = (change / initialPrice) * 100;

      // 生成歷史數據
      const history: StockHistoryPoint[] = this.generateHistory(initialPrice, 200);

      const stockData: Stock = {
        symbol: stock.symbol,
        name: stock.name,
        price: initialPrice,
        change: change,
        changePercent: changePercent,
        high: initialPrice * 1.05,
        low: initialPrice * 0.95,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        history: history,
        weeklyHistory: [],
        monthlyHistory: []
      };

      this.stockData.set(stock.symbol, stockData);
      return stockData;
    });

    this.lastUpdateTime = now;
    return stocks;
  }

  // 生成歷史數據
  private generateHistory(initialPrice: number, count: number): StockHistoryPoint[] {
    const history: StockHistoryPoint[] = [];
    const now = new Date();
    
    let currentPrice = initialPrice;
    const volatility = 0.02; // 2% 波動率

    for (let i = count - 1; i >= 0; i--) {
      // 隨機走動模型生成價格
      const change = (Math.random() - 0.5) * volatility * currentPrice;
      currentPrice = Math.max(0.01, currentPrice + change);

      // 生成時間戳（每2分鐘一個點）
      const time = new Date(now.getTime() - i * 2 * 60 * 1000);
      const dateStr = time.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
      const timeStr = time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      const fullTimeStr = `${dateStr} ${timeStr}`;

      history.push({
        time: fullTimeStr,
        price: parseFloat(currentPrice.toFixed(2))
      });
    }

    return history;
  }

  // 更新模擬股票價格
  updateStocks(): Stock[] {
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000; // 秒
    const updatedStocks: Stock[] = [];

    this.stockData.forEach((stock, symbol) => {
      const basePrice = this.basePrices.get(symbol) || stock.price;
      
      // 使用隨機走動模型更新價格
      const volatility = 0.01; // 1% 波動率
      const drift = 0.0001; // 輕微向上趨勢
      const randomChange = (Math.random() - 0.5) * volatility;
      const priceChange = stock.price * (drift + randomChange);
      
      const newPrice = Math.max(0.01, stock.price + priceChange);
      const change = newPrice - stock.price;
      const changePercent = (change / stock.price) * 100;

      // 更新歷史數據
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
      const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      const fullTimeStr = `${dateStr} ${timeStr}`;

      // 檢查是否需要添加新數據點（每2分鐘或價格變化超過0.5%）
      const lastHistory = stock.history[stock.history.length - 1];
      const priceChanged = !lastHistory || 
        Math.abs((newPrice - lastHistory.price) / lastHistory.price) > 0.005;
      const timeChanged = !lastHistory || lastHistory.time !== fullTimeStr;

      if (priceChanged || timeChanged) {
        stock.history.push({ time: fullTimeStr, price: newPrice });
        // 保留最多2000個數據點
        if (stock.history.length > 2000) {
          stock.history.shift();
        }
      } else {
        // 更新最後一個點的價格
        if (stock.history.length > 0) {
          stock.history[stock.history.length - 1] = { time: fullTimeStr, price: newPrice };
        }
      }

      // 更新股票數據
      const updatedStock: Stock = {
        ...stock,
        price: parseFloat(newPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high: Math.max(stock.high, newPrice),
        low: Math.min(stock.low, newPrice),
        volume: stock.volume + Math.floor(Math.random() * 100000)
      };

      this.stockData.set(symbol, updatedStock);
      updatedStocks.push(updatedStock);
    });

    this.lastUpdateTime = now;
    return updatedStocks;
  }

  // 獲取單個股票數據
  getStock(symbol: string): Stock | undefined {
    return this.stockData.get(symbol);
  }

  // 重置所有股票數據
  reset(): void {
    this.stockData.clear();
    this.basePrices.clear();
    this.lastUpdateTime = Date.now();
  }
}

// 單例實例
export const simulationStockService = new SimulationStockService();
