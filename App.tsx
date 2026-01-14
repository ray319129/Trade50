
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import MarketChart, { ChartTimeframe } from './components/MarketChart';
import Auth from './components/Auth';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import TradeConfirmDialog from './components/TradeConfirmDialog';
import { INITIAL_BALANCE } from './constants';
import { UserState, Stock, Transaction, TransactionType, TradingMode } from './types';
import { fetchRealTimeStockData, isMarketOpen } from './services/stockService';
import { calculateFees, getSettlementDate, processSettlements } from './services/tradingService';
import { userDataService, authService, isCloudSyncEnabled } from './services/supabaseService';
import { recalculateBalance, recalculateHoldings, validateAndFixUserData } from './services/balanceCalculator';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('tw50_current_user'));
  const [activeTab, setActiveTab] = useState('market');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserState | null>(null);

  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number>(0);
  const [tradeMode, setTradeMode] = useState<TradingMode>(TradingMode.WHOLE);
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1D');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    type: TransactionType;
    fee: number;
    tax: number;
    totalAmount: number;
    totalCost: number;
    totalShares: number;
  } | null>(null);

  // Load user data on login (with cloud sync)
  useEffect(() => {
    if (currentUser) {
      const loadUserData = async () => {
        try {
          // 先從雲端載入（如果啟用）
          let userData = await userDataService.loadUserData(currentUser);
          
          if (!userData) {
            // 如果雲端沒有數據，創建新用戶
            userData = {
              username: currentUser,
              balance: INITIAL_BALANCE,
              pendingSettlementCash: 0,
              holdings: [],
              history: [],
              lastUpdate: Date.now(),
              isBankrupt: false
            };
            // 保存到雲端和本地
            await userDataService.saveUserData(userData);
          } else {
            // 如果雲端有數據，驗證並修復數據一致性（基於交易記錄重新計算）
            userData = validateAndFixUserData(userData);
            // 同步到本地
            localStorage.setItem(`tw50_user_${currentUser}`, JSON.stringify(userData));
          }
          
          setUser(userData);
        } catch (err) {
          console.error('載入用戶數據失敗:', err);
          // 降級到本地存儲
          const saved = localStorage.getItem(`tw50_user_${currentUser}`);
          if (saved) {
            let localUserData = JSON.parse(saved);
            // 驗證並修復本地數據
            localUserData = validateAndFixUserData(localUserData);
            setUser(localUserData);
          } else {
            const newUser: UserState = {
              username: currentUser,
              balance: INITIAL_BALANCE,
              pendingSettlementCash: 0,
              holdings: [],
              history: [],
              lastUpdate: Date.now(),
              isBankrupt: false
            };
            setUser(newUser);
            localStorage.setItem(`tw50_user_${currentUser}`, JSON.stringify(newUser));
          }
        }
      };
      
      loadUserData();
    }
  }, [currentUser]);

  // Update market data: 15s interval for real-time stock updates to avoid rate limits
  useEffect(() => {
    const update = async () => {
      try {
        setError(null);
        const data = await fetchRealTimeStockData();
        if (data.length > 0) {
          setStocks(data);
          setIsLoading(false);
        } else if (stocks.length === 0) {
          // Only show error if we have no cached data
          setError('無法取得股票數據，請稍後再試');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to update stock data:', err);
        if (stocks.length === 0) {
          setError('連線失敗，請檢查網路連線');
          setIsLoading(false);
        }
      }
    };
    update();
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sync selectedStock with updated stock data
  useEffect(() => {
    if (selectedStock) {
      const updated = stocks.find(s => s.symbol === selectedStock.symbol);
      if (updated) setSelectedStock(updated);
    }
  }, [stocks]);

  // Settlement Processor
  useEffect(() => {
    if (!user || user.isBankrupt) return;
    const checkSettlement = () => {
      setUser(prev => {
        if (!prev) return null;
        const { newHistory, newBalance, defaulted } = processSettlements(prev.history, prev.holdings, prev.balance);
        
        const historyChanged = JSON.stringify(newHistory) !== JSON.stringify(prev.history);
        if (defaulted || newBalance !== prev.balance || historyChanged) {
          return { ...prev, history: newHistory, balance: newBalance, isBankrupt: prev.isBankrupt || defaulted };
        }
        return prev;
      });
    };
    const timer = setInterval(checkSettlement, 10000);
    return () => clearInterval(timer);
  }, [user?.username, user?.isBankrupt]);

  // Persistence with cloud sync
  useEffect(() => {
    if (user) {
      // 更新 lastUpdate 时间戳
      const updatedUser = { ...user, lastUpdate: Date.now() };
      
      // 保存到本地（立即）
      localStorage.setItem(`tw50_user_${updatedUser.username}`, JSON.stringify(updatedUser));
      
      // 保存到雲端（異步，不阻塞）
      userDataService.saveUserData(updatedUser).catch(err => {
        console.error('雲端同步失敗:', err);
      });
    }
  }, [user]);

  // Periodic cloud sync (every 10 seconds for better real-time sync)
  useEffect(() => {
    if (!currentUser || !isCloudSyncEnabled() || !user) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const syncedData = await userDataService.syncUserData(currentUser);
        if (syncedData) {
          // 合并数据：比较历史记录ID，确保不丢失任何交易
          const localHistoryIds = new Set(user.history.map(t => t.id));
          const cloudHistoryIds = new Set(syncedData.history.map(t => t.id));
          
          // 合并历史记录：保留所有交易（本地和云端）
          const mergedHistory = [...user.history];
          syncedData.history.forEach(cloudTx => {
            if (!localHistoryIds.has(cloudTx.id)) {
              // 云端有本地没有的交易，添加进来
              mergedHistory.push(cloudTx);
            }
          });
          
          // 按时间戳倒序排序（最新的在前）
          mergedHistory.sort((a, b) => b.timestamp - a.timestamp);
          
          // 合并持仓：基于历史记录重新计算持仓（更准确）
          // 但为了简化，我们合并两边的持仓数据
          const mergedHoldingsMap = new Map<string, any>();
          
          // 先添加本地持仓
          user.holdings.forEach(h => {
            mergedHoldingsMap.set(h.symbol, h);
          });
          
          // 再添加云端持仓（如果本地没有或云端更新）
          syncedData.holdings.forEach(cloudHolding => {
            const localHolding = mergedHoldingsMap.get(cloudHolding.symbol);
            if (!localHolding || cloudHolding.shares !== localHolding.shares) {
              mergedHoldingsMap.set(cloudHolding.symbol, cloudHolding);
            }
          });
          
          const mergedHoldings = Array.from(mergedHoldingsMap.values());
          
          // 基于合并后的交易记录重新计算余额和持仓（确保数据一致性）
          const mergedBalance = recalculateBalance(mergedHistory);
          const recalculatedHoldings = recalculateHoldings(mergedHistory);
          
          // 使用重新计算的持仓（更准确）
          const finalHoldings = recalculatedHoldings.length > 0 ? recalculatedHoldings : mergedHoldings;
          
          // 检查数据是否有变化
          const historyChanged = mergedHistory.length !== user.history.length || 
            mergedHistory.some((tx, idx) => {
              const localTx = user.history[idx];
              return !localTx || tx.id !== localTx.id || tx.timestamp !== localTx.timestamp;
            });
          const holdingsChanged = finalHoldings.length !== user.holdings.length ||
            finalHoldings.some(h => {
              const localH = user.holdings.find(lh => lh.symbol === h.symbol);
              return !localH || localH.shares !== h.shares || Math.abs(localH.averagePrice - h.averagePrice) > 0.01;
            });
          const balanceChanged = Math.abs(mergedBalance - user.balance) > 0.01;
          
          if (historyChanged || holdingsChanged || balanceChanged) {
            console.log('检测到数据变化，合并云端数据', {
              historyChanged,
              holdingsChanged,
              balanceChanged,
              localHistoryCount: user.history.length,
              cloudHistoryCount: syncedData.history.length,
              mergedHistoryCount: mergedHistory.length,
              localBalance: user.balance,
              cloudBalance: syncedData.balance,
              calculatedBalance: mergedBalance
            });
            
            setUser({
              ...syncedData,
              history: mergedHistory,
              holdings: finalHoldings,
              balance: mergedBalance,
              lastUpdate: Date.now()
            });
          }
        }
      } catch (err) {
        console.error('定期同步失敗:', err);
      }
    }, 10000); // 每10秒同步一次，提高实时性
    
    return () => clearInterval(syncInterval);
  }, [currentUser, user]);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('tw50_current_user', username);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUser(null);
    localStorage.removeItem('tw50_current_user');
    localStorage.removeItem('tw50_current_user_email');
  };

  const handleTrade = (type: TransactionType) => {
    if (!selectedStock || tradeQuantity <= 0 || !user) return;
    if (user.isBankrupt) {
      alert("⚠️ 帳號已被凍結：因發生違約交割（T+2 結算時可用現金不足），您已失去交易資格。");
      return;
    }

    const totalShares = tradeMode === TradingMode.WHOLE ? tradeQuantity * 1000 : tradeQuantity;
    const { fee, tax, total } = calculateFees(selectedStock.price, totalShares, type);
    const cost = type === TransactionType.BUY ? (total + fee) : (total - fee - tax);

    // 检查余额（买入时）
    if (type === TransactionType.BUY && user.balance < cost) {
      alert("❌ 餘額不足以支付委託金額及手續費。");
      return;
    }

    // 检查库存（卖出时）
    const holding = user.holdings.find(h => h.symbol === selectedStock.symbol);
    if (type === TransactionType.SELL && (!holding || holding.shares < totalShares)) {
      alert("❌ 庫存股數不足。");
      return;
    }

    // 显示确认对话框
    setPendingTrade({
      type,
      fee,
      tax,
      totalAmount: total,
      totalCost: cost,
      totalShares
    });
    setShowConfirmDialog(true);
  };

  const confirmTrade = () => {
    if (!selectedStock || !user || !pendingTrade) return;

    const { type, fee, tax, totalAmount, totalCost, totalShares } = pendingTrade;

    // 再次检查余额和库存（防止在确认期间数据变化）
    if (type === TransactionType.BUY && user.balance < totalCost) {
      alert("❌ 餘額不足以支付委託金額及手續費。");
      setShowConfirmDialog(false);
      setPendingTrade(null);
      return;
    }

    const holding = user.holdings.find(h => h.symbol === selectedStock.symbol);
    if (type === TransactionType.SELL && (!holding || holding.shares < totalShares)) {
      alert("❌ 庫存股數不足。");
      setShowConfirmDialog(false);
      setPendingTrade(null);
      return;
    }

    const now = Date.now();
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      type,
      mode: tradeMode,
      shares: totalShares,
      price: selectedStock.price,
      fee,
      tax,
      totalAmount: totalAmount,
      timestamp: now,
      settlementDate: getSettlementDate(now),
      isSettled: false
    };

    setUser(prev => {
      if (!prev) return null;
      
      // 添加新交易到历史记录
      const updatedHistory = [newTransaction, ...prev.history];
      
      // 基于所有交易记录重新计算余额和持仓（确保数据一致性）
      const recalculatedBalance = recalculateBalance(updatedHistory);
      const recalculatedHoldings = recalculateHoldings(updatedHistory);
      
      const updatedUser = { 
        ...prev, 
        balance: recalculatedBalance, // 使用重新计算的余额
        holdings: recalculatedHoldings, // 使用重新计算的持仓
        history: updatedHistory,
        lastUpdate: Date.now() // 更新时间戳
      };
      
      // 立即保存到本地
      localStorage.setItem(`tw50_user_${updatedUser.username}`, JSON.stringify(updatedUser));
      
      return updatedUser;
    });

    alert(`✅ ${type === TransactionType.BUY ? '買入' : '賣出'}委託成功！\n數量：${totalShares.toLocaleString()} 股\n價格：$${selectedStock.price}\n將於 T+2 進行交割。`);
    setTradeQuantity(0);
    setShowConfirmDialog(false);
    setPendingTrade(null);
    
    // 立即同步到云端（交易后立即同步，确保多设备数据一致）
    if (isCloudSyncEnabled()) {
      setTimeout(async () => {
        try {
          // 等待状态更新完成后再同步
          const latestUser = JSON.parse(localStorage.getItem(`tw50_user_${user.username}`) || '{}');
          if (latestUser.username) {
            const updatedUser = { ...latestUser, lastUpdate: Date.now() };
            await userDataService.saveUserData(updatedUser);
            console.log('交易後立即同步成功');
          }
        } catch (err) {
          console.error('交易後立即同步失敗:', err);
        }
      }, 1000);
    }
    
    // 立即同步到云端（交易后立即同步，确保多设备数据一致）
    if (isCloudSyncEnabled()) {
      setTimeout(async () => {
        try {
          // 等待状态更新完成后再同步
          const latestUser = JSON.parse(localStorage.getItem(`tw50_user_${user.username}`) || '{}');
          if (latestUser.username) {
            const updatedUser = { ...latestUser, lastUpdate: Date.now() };
            await userDataService.saveUserData(updatedUser);
            console.log('交易後立即同步成功');
          }
        } catch (err) {
          console.error('交易後立即同步失敗:', err);
        }
      }, 1000);
    }
  };

  if (!currentUser || !user) return <Auth onLogin={handleLogin} />;

  const chartData = selectedStock ? selectedStock.history : [];

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} stocks={stocks}>
      <div className="flex justify-between items-center mb-6">
        <div className="bg-slate-200 px-4 py-1.5 rounded-full text-slate-600 text-[10px] font-black uppercase flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> {user.username}</span>
          <button onClick={handleLogout} className="text-blue-600 hover:text-blue-800 transition-colors">登出系統</button>
        </div>
      </div>

      {user.isBankrupt && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-[2rem] mb-8 shadow-xl shadow-red-200 animate-bounce">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🚫</span>
            <div>
              <h3 className="text-xl font-black">帳號已發生違約交割</h3>
              <p className="text-sm opacity-90 mt-1 font-medium">您的帳戶餘額不足以支付交割款項，交易功能已被停止。</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">串接證交所即時數據中...</p>
        </div>
      ) : error && stocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="bg-red-50 border-2 border-red-200 rounded-[2rem] p-8 max-w-md text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-red-600 font-bold mb-4">{error}</p>
            <button 
              onClick={() => { setIsLoading(true); setError(null); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'market' && (
            <div className="space-y-6">
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900">及時行情</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">同步臺灣證券交易所 (TWSE) 實時數據</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all ${isMarketOpen() ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {isMarketOpen() ? '● 集中市場交易中' : '○ 非交易時段 (使用最後收盤價)'}
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stocks.map(stock => (
                  <div 
                    key={stock.symbol}
                    onClick={() => { setSelectedStock(stock); setActiveTab('trade'); }}
                    className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-tighter">{stock.symbol}</span>
                        <h3 className="text-lg font-bold text-slate-800">{stock.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900">${stock.price.toFixed(2)}</p>
                        <p className={`text-xs font-black ${stock.change >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                       <MarketChart data={stock.history} color={stock.change >= 0 ? '#ef4444' : '#16a34a'} />
                       <div className="bg-blue-50 px-3 py-1 rounded-full group-hover:bg-blue-600 transition-colors">
                          <span className="text-[10px] text-blue-600 group-hover:text-white font-black uppercase">下單</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'trade' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <h2 className="text-3xl font-black text-slate-900">模擬交易下單</h2>
                <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">標的選擇</label>
                      <select 
                        value={selectedStock?.symbol || ''} 
                        onChange={(e) => setSelectedStock(stocks.find(s => s.symbol === e.target.value) || null)}
                        className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl focus:ring-4 ring-blue-500/10 outline-none font-bold text-lg appearance-none cursor-pointer"
                      >
                        <option value="">請選擇股票...</option>
                        {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} {s.name}</option>)}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      {[TradingMode.WHOLE, TradingMode.ODD].map(m => (
                        <button 
                          key={m}
                          onClick={() => { setTradeMode(m); setTradeQuantity(0); }}
                          className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all border-2 ${tradeMode === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                        >
                          {m === TradingMode.WHOLE ? '整股交易' : '零股交易'}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">委託數量</label>
                      <input 
                        type="number" 
                        value={tradeQuantity === 0 ? '' : tradeQuantity} 
                        onChange={(e) => setTradeQuantity(Math.max(0, Number(e.target.value)))}
                        placeholder={tradeMode === TradingMode.WHOLE ? "輸入張數" : "輸入股數"}
                        className="w-full bg-slate-50 border border-slate-200 p-5 rounded-3xl focus:ring-4 ring-blue-500/10 outline-none font-black text-2xl placeholder:font-medium placeholder:text-slate-300"
                      />
                      <div className="absolute right-6 bottom-5 flex items-center gap-1 text-slate-400 font-black">
                        {tradeMode === TradingMode.WHOLE ? '張' : '股'}
                      </div>
                    </div>
                  </div>

                  {selectedStock && (
                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                      <button 
                        disabled={user.isBankrupt}
                        onClick={() => handleTrade(TransactionType.BUY)} 
                        className="bg-red-500 hover:bg-red-600 disabled:opacity-20 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-red-200 transition-all active:scale-95"
                      >買進</button>
                      <button 
                        disabled={user.isBankrupt}
                        onClick={() => handleTrade(TransactionType.SELL)} 
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-20 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-green-200 transition-all active:scale-95"
                      >賣出</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                 {selectedStock ? (
                   <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8 sticky top-8">
                     <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900">{selectedStock.name}</h3>
                          <p className="text-xs font-bold text-slate-400">{selectedStock.symbol} • 即時行情</p>
                        </div>
                     </div>

                     <MarketChart 
                       data={chartData} 
                       color={selectedStock.change >= 0 ? '#ef4444' : '#16a34a'} 
                       showDetails 
                       timeframe={chartTimeframe}
                       onTimeframeChange={setChartTimeframe}
                     />

                     <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                           <p className="text-[10px] text-slate-400 font-black uppercase mb-1">及時價格</p>
                           <p className="text-xl font-black text-slate-900">${selectedStock.price.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                           <p className="text-[10px] text-slate-400 font-black uppercase mb-1">今日變動</p>
                           <p className={`text-xl font-black ${selectedStock.change >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {selectedStock.changePercent.toFixed(2)}%
                           </p>
                        </div>
                     </div>
                   </div>
                 ) : (
                   <div className="bg-slate-100 h-96 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center px-10">
                      <p className="font-black text-sm uppercase tracking-widest">請先選擇標的</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <h2 className="text-3xl font-black text-slate-900">我的庫存</h2>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                   <p className="text-[10px] text-slate-400 font-black uppercase mb-1">可用現金 (T+2)</p>
                   <p className="text-2xl font-black text-blue-600">${user.balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-lg">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                        <tr><th className="p-8">股票</th><th className="p-8">數量</th><th className="p-8">均價</th><th className="p-8">現價</th><th className="p-8">損益</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {user.holdings.map(h => {
                           const stock = stocks.find(s => s.symbol === h.symbol);
                           const currentPrice = stock?.price || h.averagePrice;
                           const profit = (currentPrice - h.averagePrice) * h.shares;
                           const profitPct = ((currentPrice - h.averagePrice) / h.averagePrice) * 100;
                           return (
                            <tr key={h.symbol}>
                              <td className="p-8 font-black">{h.name} ({h.symbol})</td>
                              <td className="p-8 font-black">{h.shares.toLocaleString()} 股</td>
                              <td className="p-8 font-bold text-slate-500">${h.averagePrice.toFixed(2)}</td>
                              <td className="p-8 font-black text-slate-900">${currentPrice.toFixed(2)}</td>
                              <td className={`p-8 font-black ${profit >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({profitPct.toFixed(2)}%)
                              </td>
                            </tr>
                           );
                        })}
                      </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-slate-900">歷史紀錄</h2>
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-lg">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                        <tr><th className="p-8">時間</th><th className="p-8">類型</th><th className="p-8">標的</th><th className="p-8">成交資訊</th><th className="p-8">狀態</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {user.history.map(tx => (
                           <tr key={tx.id}>
                              <td className="p-8 text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</td>
                              <td className="p-8 font-black uppercase tracking-wider text-[10px]">{tx.type} ({tx.mode})</td>
                              <td className="p-8 font-black">{tx.name}</td>
                              <td className="p-8 font-black text-slate-700">{tx.shares.toLocaleString()} 股 @ ${tx.price.toFixed(2)}</td>
                              <td className="p-8 font-black text-xs">{tx.isSettled ? '✅ 已交割' : '🕒 結算中'}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard 
              currentUser={currentUser} 
              userData={user} 
              stocks={stocks}
            />
          )}

          {activeTab === 'profile' && (
            <Profile 
              user={user} 
              stocks={stocks}
              onLogout={handleLogout}
            />
          )}
        </>
      )}

      {/* Trade Confirmation Dialog */}
      {showConfirmDialog && selectedStock && user && pendingTrade && (
        <TradeConfirmDialog
          isOpen={showConfirmDialog}
          onConfirm={confirmTrade}
          onCancel={() => {
            setShowConfirmDialog(false);
            setPendingTrade(null);
          }}
          type={pendingTrade.type}
          stockName={selectedStock.name}
          stockSymbol={selectedStock.symbol}
          price={selectedStock.price}
          quantity={tradeQuantity}
          mode={tradeMode}
          totalShares={pendingTrade.totalShares}
          fee={pendingTrade.fee}
          tax={pendingTrade.tax}
          totalAmount={pendingTrade.totalAmount}
          totalCost={pendingTrade.totalCost}
          currentBalance={user.balance}
          remainingBalance={pendingTrade.type === TransactionType.BUY 
            ? user.balance - pendingTrade.totalCost 
            : undefined}
        />
      )}
    </Layout>
  );
};

export default App;
