import React, { useState } from 'react';
import { UserState, GameMode } from '../types';
import { authService } from '../services/supabaseService';
import { INITIAL_BALANCE } from '../constants';
import { getModeData } from '../services/userDataHelper';

interface ProfileProps {
  user: UserState;
  stocks: any[];
  gameMode: GameMode;
  onLogout: () => void;
  onReset: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, stocks, gameMode, onLogout, onReset }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  
  // 获取当前模式的用户数据
  const modeData = getModeData(user, gameMode);

  React.useEffect(() => {
    const loadEmail = async () => {
      try {
        const email = await authService.getCurrentUserEmail();
        setUserEmail(email);
      } catch (err) {
        console.error('加载邮箱失败:', err);
      } finally {
        setIsLoadingEmail(false);
      }
    };
    loadEmail();
  }, []);

  // 计算总资产
  const calculateTotalAssets = (): number => {
    let holdingsValue = 0;
    modeData.holdings.forEach(holding => {
      const stock = stocks.find(s => s.symbol === holding.symbol);
      const currentPrice = stock?.price || holding.currentPrice;
      holdingsValue += currentPrice * holding.shares;
    });
    return modeData.balance + holdingsValue;
  };

  // 计算盈亏
  const totalAssets = calculateTotalAssets();
  const profit = totalAssets - INITIAL_BALANCE;
  const profitPercent = (profit / INITIAL_BALANCE) * 100;

  // 统计信息
  const totalTransactions = modeData.history.length;
  const buyTransactions = modeData.history.filter(t => t.type === 'BUY').length;
  const sellTransactions = modeData.history.filter(t => t.type === 'SELL').length;
  const totalHoldings = modeData.holdings.length;

  // 计算交易总额
  const totalTradeVolume = modeData.history.reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <h2 className="text-3xl font-black text-slate-900">個人資訊</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息卡片 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 mb-6">基本資訊</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-black uppercase">使用者名稱</p>
                  <p className="text-xl font-black text-slate-900">{user.username}</p>
                </div>
              </div>
              
              {!isLoadingEmail && userEmail && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-400 font-black uppercase mb-1">電子郵件</p>
                  <p className="text-lg font-bold text-slate-700">{userEmail}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-400 font-black uppercase mb-1">註冊時間</p>
                <p className="text-lg font-bold text-slate-700">
                  {new Date(user.lastUpdate).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {user.isBankrupt && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                    <p className="text-sm text-red-600 font-black">⚠️ 帳號狀態：違約交割</p>
                    <p className="text-xs text-red-500 mt-1">您的帳戶因違約交割已被凍結</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 交易統計 */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 mb-6">交易統計</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">總交易次數</p>
                <p className="text-2xl font-black text-slate-900">{totalTransactions}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">買入次數</p>
                <p className="text-2xl font-black text-blue-600">{buyTransactions}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">賣出次數</p>
                <p className="text-2xl font-black text-green-600">{sellTransactions}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">交易總額</p>
                <p className="text-2xl font-black text-slate-900">
                  ${totalTradeVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 資產概覽 */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl">
            <p className="text-sm font-black uppercase opacity-80 mb-2">總資產</p>
            <p className="text-3xl font-black mb-4">
              ${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <div className="pt-4 border-t border-white/20">
              <p className="text-xs font-black uppercase opacity-80 mb-1">初始資金</p>
              <p className="text-lg font-bold">${INITIAL_BALANCE.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 mb-4">投資表現</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">總盈虧</p>
                <p className={`text-2xl font-black ${
                  profit >= 0 ? 'text-red-500' : 'text-green-600'
                }`}>
                  {profit >= 0 ? '+' : ''}
                  ${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">報酬率</p>
                <p className={`text-2xl font-black ${
                  profitPercent >= 0 ? 'text-red-500' : 'text-green-600'
                }`}>
                  {profitPercent >= 0 ? '+' : ''}
                  {profitPercent.toFixed(2)}%
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">持有標的</p>
                <p className="text-xl font-black text-slate-900">{totalHoldings} 檔</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">可用現金</p>
                <p className="text-xl font-black text-slate-900">
                  ${modeData.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black transition-colors"
            >
              登出系統
            </button>
            <button
              onClick={() => {
                if (confirm('⚠️ 確定要重置帳號嗎？\n\n此操作將：\n- 清除所有交易記錄\n- 清除所有持倉\n- 重置餘額為初始金額\n- 清除所有歷史數據\n\n此操作無法復原！')) {
                  onReset();
                }
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black transition-colors"
            >
              🔄 重置帳號
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
