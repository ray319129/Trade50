
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TradingMode {
  WHOLE = 'WHOLE', // 整股
  ODD = 'ODD'     // 零股
}

export interface StockHistoryPoint {
  time: string;
  price: number;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  history: StockHistoryPoint[];
  weeklyHistory: StockHistoryPoint[];
  monthlyHistory: StockHistoryPoint[];
}

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: TransactionType;
  mode: TradingMode;
  shares: number;
  price: number;
  fee: number;
  tax: number;
  totalAmount: number;
  timestamp: number;
  settlementDate: number; // T+2 timestamp
  isSettled: boolean;
}

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
}

export interface UserState {
  username: string;
  balance: number;
  pendingSettlementCash: number;
  holdings: Holding[];
  history: Transaction[];
  lastUpdate: number;
  isBankrupt: boolean;
}

export interface AuthState {
  currentUser: string | null;
  users: Record<string, string>; // username: password
}
