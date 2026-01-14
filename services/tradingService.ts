
import { FEE_RATE, TAX_RATE } from '../constants';
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
      // Logic for settlement execution
      if (tx.type === TransactionType.BUY) {
        // Cash already deducted from 'balance' during order? 
        // No, rule says ensure sufficient funds in settlement account by T+2.
        // We'll simulate deducting it now.
        const totalCost = tx.totalAmount + tx.fee;
        if (currentBalance >= totalCost) {
          currentBalance -= totalCost;
          tx.isSettled = true;
        } else {
          defaulted = true;
        }
      } else {
        // Sell settlement: Receive cash
        const proceeds = tx.totalAmount - tx.fee - tx.tax;
        currentBalance += proceeds;
        tx.isSettled = true;
      }
    }
    return tx;
  });

  // Re-calculate holdings based on settled BUY transactions and pending/settled SELLs
  // For simplicity, we show holdings immediately but they are only "official" after settlement
  // Realistically, stock is accessible on T+2, but we'll show them as "Pending" or just in portfolio for UX.
  
  return { newHistory: updatedHistory, newHoldings: holdings, newBalance: currentBalance, defaulted };
};
