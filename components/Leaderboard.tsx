import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../services/supabaseService';
import { UserState } from '../types';

interface LeaderboardEntry {
  username: string;
  totalAssets: number;
  profit: number;
  profitPercent: number;
  rank: number;
}

interface LeaderboardProps {
  currentUser: string | null;
  userData: UserState | null;
  stocks: any[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser, userData, stocks }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'assets' | 'profit'>('assets');

  useEffect(() => {
    loadLeaderboard();
    
    // 定期更新排行榜（每 30 秒）
    const interval = setInterval(() => {
      loadLeaderboard();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userData, stocks, sortBy]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const client = getSupabaseClient();
      
      if (!client) {
        // 降级到本地：只显示当前用户
        if (userData) {
          const totalAssets = calculateTotalAssets(userData);
          const profit = totalAssets - 1000000; // INITIAL_BALANCE
          const profitPercent = (profit / 1000000) * 100;
          
          setLeaderboard([{
            username: userData.username,
            totalAssets,
            profit,
            profitPercent,
            rank: 1
          }]);
        }
        setIsLoading(false);
        return;
      }

      // 从 Supabase 获取所有用户数据
      const { data, error } = await client
        .from('user_data')
        .select('data, username');

      if (error) {
        console.error('加载排行榜失败:', error);
        // 降级到本地
        if (userData) {
          const totalAssets = calculateTotalAssets(userData);
          const profit = totalAssets - 1000000;
          const profitPercent = (profit / 1000000) * 100;
          
          setLeaderboard([{
            username: userData.username,
            totalAssets,
            profit,
            profitPercent,
            rank: 1
          }]);
        }
        setIsLoading(false);
        return;
      }

      // 计算每个用户的总资产和盈亏
      const entries: LeaderboardEntry[] = (data || []).map((item: any) => {
        const userState = item.data as UserState;
        const totalAssets = calculateTotalAssets(userState);
        const profit = totalAssets - 1000000; // INITIAL_BALANCE
        const profitPercent = (profit / 1000000) * 100;

        return {
          username: userState.username || item.username,
          totalAssets,
          profit,
          profitPercent,
          rank: 0 // 稍后排序
        };
      });

      // 排序
      entries.sort((a, b) => {
        if (sortBy === 'assets') {
          return b.totalAssets - a.totalAssets;
        } else {
          return b.profit - a.profit;
        }
      });

      // 分配排名
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(entries);
    } catch (err) {
      console.error('加载排行榜错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalAssets = (user: UserState): number => {
    let holdingsValue = 0;
    
    // 计算持仓价值
    user.holdings.forEach(holding => {
      const stock = stocks.find(s => s.symbol === holding.symbol);
      const currentPrice = stock?.price || holding.currentPrice;
      holdingsValue += currentPrice * holding.shares;
    });

    return user.balance + holdingsValue;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">載入排行榜中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">排行榜</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">查看所有交易者的表現</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSortBy('assets'); loadLeaderboard(); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              sortBy === 'assets'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            總資產
          </button>
          <button
            onClick={() => { setSortBy('profit'); loadLeaderboard(); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              sortBy === 'profit'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            盈虧
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="p-6">排名</th>
                <th className="p-6">使用者</th>
                <th className="p-6">總資產</th>
                <th className="p-6">盈虧</th>
                <th className="p-6">報酬率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <p className="font-bold">尚無排行榜數據</p>
                    <p className="text-xs mt-2">開始交易後即可看到排名</p>
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry) => (
                  <tr
                    key={entry.username}
                    className={`transition-colors ${
                      entry.username === currentUser
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-6">
                      <span className="text-xl font-black">
                        {entry.rank <= 3 ? getRankIcon(entry.rank) : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-sm">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{entry.username}</p>
                          {entry.username === currentUser && (
                            <p className="text-[10px] text-blue-600 font-bold">（您）</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-black text-slate-900">
                      ${entry.totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`p-6 font-black ${
                      entry.profit >= 0 ? 'text-red-500' : 'text-green-600'
                    }`}>
                      {entry.profit >= 0 ? '+' : ''}
                      ${entry.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`p-6 font-black ${
                      entry.profitPercent >= 0 ? 'text-red-500' : 'text-green-600'
                    }`}>
                      {entry.profitPercent >= 0 ? '+' : ''}
                      {entry.profitPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
