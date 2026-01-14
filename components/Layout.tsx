
import React from 'react';
import { UserState, Stock } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserState;
  stocks: Stock[];
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, stocks }) => {
  // 计算总资产（余额 + 持仓价值）
  const calculateTotalAssets = (): number => {
    let holdingsValue = 0;
    user.holdings.forEach(holding => {
      const stock = stocks.find(s => s.symbol === holding.symbol);
      const currentPrice = stock?.price || holding.currentPrice;
      holdingsValue += currentPrice * holding.shares;
    });
    return user.balance + holdingsValue;
  };

  const totalAssets = calculateTotalAssets();
  const navItems = [
    { id: 'market', label: '行情', icon: '📈' },
    { id: 'trade', label: '下單', icon: '💸' },
    { id: 'portfolio', label: '庫存', icon: '💼' },
    { id: 'history', label: '紀錄', icon: '📋' },
    { id: 'leaderboard', label: '排行榜', icon: '🏆' },
    { id: 'profile', label: '個人', icon: '👤' },
  ];

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 flex flex-col">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-xl font-bold">台</div>
          <h1 className="text-xl font-bold tracking-tight">TW50 Simulator</h1>
        </div>
        
        <div className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">總資產 (T+2)</p>
          <p className="text-lg font-bold text-white">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="lg:hidden glass sticky top-0 px-6 py-4 border-b border-slate-200 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">台</div>
          <span className="font-bold">TW50 模擬</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">總資產</p>
          <p className="font-bold text-slate-900">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === item.id ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
