import { UserState, Transaction, TransactionType } from '../types';
import { INITIAL_BALANCE } from '../constants';

/**
 * 基于交易记录重新计算用户余额
 * 这是唯一可信的余额计算方式，确保数据一致性
 */
export const recalculateBalance = (history: Transaction[], initialBalance: number = INITIAL_BALANCE): number => {
  let balance = initialBalance;
  
  // 按时间顺序处理所有交易
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const tx of sortedHistory) {
    if (tx.type === TransactionType.BUY) {
      // 买入：扣除成交金额和手续费
      const totalCost = tx.totalAmount + tx.fee;
      balance -= totalCost;
    } else {
      // 卖出：增加成交金额，扣除手续费和税
      const proceeds = tx.totalAmount - tx.fee - tx.tax;
      balance += proceeds;
    }
  }
  
  return Math.max(0, balance); // 余额不能为负
};

/**
 * 基于交易记录重新计算持仓
 */
export const recalculateHoldings = (history: Transaction[]): any[] => {
  const holdingsMap = new Map<string, {
    symbol: string;
    name: string;
    shares: number;
    totalCost: number; // 总成本，用于计算平均价格
  }>();
  
  // 按时间顺序处理所有交易
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const tx of sortedHistory) {
    const existing = holdingsMap.get(tx.symbol);
    
    if (tx.type === TransactionType.BUY) {
      // 买入：增加持仓
      if (existing) {
        const newShares = existing.shares + tx.shares;
        const newTotalCost = existing.totalCost + tx.totalAmount;
        holdingsMap.set(tx.symbol, {
          ...existing,
          shares: newShares,
          totalCost: newTotalCost
        });
      } else {
        holdingsMap.set(tx.symbol, {
          symbol: tx.symbol,
          name: tx.name,
          shares: tx.shares,
          totalCost: tx.totalAmount
        });
      }
    } else {
      // 卖出：减少持仓
      if (existing) {
        const remainingShares = existing.shares - tx.shares;
        if (remainingShares > 0) {
          // 按比例减少成本
          const costRatio = remainingShares / existing.shares;
          holdingsMap.set(tx.symbol, {
            ...existing,
            shares: remainingShares,
            totalCost: existing.totalCost * costRatio
          });
        } else {
          // 全部卖出，移除持仓
          holdingsMap.delete(tx.symbol);
        }
      }
    }
  }
  
  // 转换为 Holding 格式
  return Array.from(holdingsMap.values()).map(h => ({
    symbol: h.symbol,
    name: h.name,
    shares: h.shares,
    averagePrice: h.shares > 0 ? h.totalCost / h.shares : 0,
    currentPrice: 0 // 会在显示时更新
  }));
};

/**
 * 验证并修复用户数据的一致性
 */
export const validateAndFixUserData = (userData: UserState): UserState => {
  // 基于交易记录重新计算余额和持仓
  const correctBalance = recalculateBalance(userData.history);
  const correctHoldings = recalculateHoldings(userData.history);
  
  // 如果计算出的余额与存储的余额不一致，使用计算出的余额
  if (Math.abs(correctBalance - userData.balance) > 0.01) {
    console.warn('余额不一致，已修复', {
      stored: userData.balance,
      calculated: correctBalance,
      difference: correctBalance - userData.balance
    });
  }
  
  return {
    ...userData,
    balance: correctBalance,
    holdings: correctHoldings
  };
};
