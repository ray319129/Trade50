
import { FEE_RATE, TAX_RATE, INITIAL_BALANCE } from '../constants';
import { TransactionType, Transaction, TradingMode } from '../types';

export const calculateFees = (price: number, shares: number, type: TransactionType) => {
  const amount = price * shares;
  const fee = Math.floor(amount * FEE_RATE);
  const tax = type === TransactionType.SELL ? Math.floor(amount * TAX_RATE) : 0;
  return { fee, tax, total: amount };
};

export const getSettlementDate = (timestamp: number): number => {
  const date = new Date(timestamp);
  let daysToAdd = 0;
  let added = 0;

  // Simulate T+2 logic (excluding weekends)
  while (added < 2) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  
  // Set to 10:00 AM of that day
  date.setHours(10, 0, 0, 0);
  return date.getTime();
};

export const processSettlements = (
  history: Transaction[], 
  holdings: any[], 
  balance: number
): { newHistory: Transaction[]; newHoldings: any[]; newBalance: number; defaulted: boolean } => {
  const now = Date.now();
  let currentBalance = balance;
  let defaulted = false;
  
  const updatedHistory = history.map(tx => {
    if (!tx.isSettled && now >= tx.settlementDate) {
      // T+2 结算逻辑
      if (tx.type === TransactionType.BUY) {
        // 买入：资金在委托时已经扣除，这里只需要检查是否有足够资金
        // 如果余额不足，说明发生了违约交割
        const totalCost = tx.totalAmount + tx.fee;
        // 检查当前余额是否足够（考虑可能已经被扣除的情况）
        // 如果余额已经扣除，这里只需要标记为已结算
        // 如果余额未扣除（旧数据），则扣除
        if (currentBalance >= totalCost) {
          // 检查是否已经扣除（通过比较余额和初始余额+所有已结算交易）
          // 简化处理：如果余额足够，标记为已结算
          tx.isSettled = true;
        } else {
          // 余额不足，发生违约
          defaulted = true;
          // 仍然标记为已结算，但账户会被冻结
          tx.isSettled = true;
        }
      } else {
        // 卖出：资金在委托时未收到，T+2结算时收到
        // 检查是否已经收到（可能已经在同步时处理）
        const proceeds = tx.totalAmount - tx.fee - tx.tax;
        // 如果余额还没有增加这笔收入，则增加
        // 简化处理：直接增加（如果已经增加，重复增加也不会有大问题，因为会通过重新计算修正）
        currentBalance += proceeds;
        tx.isSettled = true;
      }
    }
    return tx;
  });

  // 基于所有交易记录重新计算余额（确保一致性）
  // 这样可以修复任何不一致的问题
  let calculatedBalance = INITIAL_BALANCE;
  const sortedHistory = [...updatedHistory].sort((a, b) => a.timestamp - b.timestamp);
  for (const tx of sortedHistory) {
    if (tx.type === TransactionType.BUY) {
      calculatedBalance -= (tx.totalAmount + tx.fee);
    } else {
      calculatedBalance += (tx.totalAmount - tx.fee - tx.tax);
    }
  }
  
  // 使用计算出的余额（更准确）
  currentBalance = calculatedBalance;
  
  return { newHistory: updatedHistory, newHoldings: holdings, newBalance: currentBalance, defaulted };
};
