import { INITIAL_BALANCE } from '../constants';
import { UserState, Transaction, TransactionType } from '../types';
import { calculateFees } from './tradingService';

/**
 * 基于交易记录重新计算余额
 * 确保余额与交易记录一致
 */
export const recalculateBalance = (history: Transaction[]): number => {
  let balance = INITIAL_BALANCE;
  
  // 按时间顺序处理所有交易
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const tx of sortedHistory) {
    if (tx.type === TransactionType.BUY) {
      // 买入：立即扣除资金（包括手续费）
      const totalCost = tx.totalAmount + tx.fee;
      balance -= totalCost;
    } else {
      // 卖出：立即收到资金（扣除手续费和税）
      const proceeds = tx.totalAmount - tx.fee - tx.tax;
      balance += proceeds;
    }
  }
  
  return balance;
};

/**
 * 基于交易记录重新计算持仓
 */
export const recalculateHoldings = (history: Transaction[]): any[] => {
  const holdingsMap = new Map<string, {
    symbol: string;
    name: string;
    shares: number;
    totalCost: number; // 总成本（用于计算平均价格）
  }>();
  
  // 按时间顺序处理所有交易
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const tx of sortedHistory) {
    if (tx.type === TransactionType.BUY) {
      // 买入：增加持仓
      const existing = holdingsMap.get(tx.symbol);
      if (existing) {
        existing.shares += tx.shares;
        existing.totalCost += tx.totalAmount; // 只计算股票金额，不包括手续费
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
      const existing = holdingsMap.get(tx.symbol);
      if (existing) {
        existing.shares -= tx.shares;
        if (existing.shares <= 0) {
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
    averagePrice: h.totalCost / h.shares,
    currentPrice: 0 // 会在显示时更新
  }));
};

/**
 * 验证并修复用户数据的一致性
 */
export const validateAndFixUserData = (userData: UserState): UserState => {
  // 基于交易记录重新计算余额和持仓
  const calculatedBalance = recalculateBalance(userData.history);
  const calculatedHoldings = recalculateHoldings(userData.history);
  
  // 如果计算出的余额与存储的余额差异较大，使用计算出的余额
  const balanceDiff = Math.abs(calculatedBalance - userData.balance);
  if (balanceDiff > 1) { // 允许1元的误差（由于舍入）
    console.warn(`余额不一致，修复中。存储余额: ${userData.balance}, 计算余额: ${calculatedBalance}`);
  }
  
  return {
    ...userData,
    balance: calculatedBalance,
    holdings: calculatedHoldings,
    lastUpdate: Date.now()
  };
};
