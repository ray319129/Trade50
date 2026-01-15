
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TradingMode {
  WHOLE = 'WHOLE', // 整股
  ODD = 'ODD'     // 零股
}

export enum GameMode {
  REAL = 'REAL',     // 真實模式：完全按照真實台股資訊
  SIMULATION = 'SIMULATION' // 模擬模式：教學用模擬股市
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
  // 真實模式數據
  realMode: {
    balance: number;
    pendingSettlementCash: number;
    holdings: Holding[];
    history: Transaction[];
    isBankrupt: boolean;
  };
  // 模擬模式數據
  simulationMode: {
    balance: number;
    pendingSettlementCash: number;
    holdings: Holding[];
    history: Transaction[];
    isBankrupt: boolean;
  };
  lastUpdate: number;
  // 向後兼容：如果沒有模式數據，使用這些字段
  balance?: number;
  pendingSettlementCash?: number;
  holdings?: Holding[];
  history?: Transaction[];
  isBankrupt?: boolean;
}

export interface AuthState {
  currentUser: string | null;
  users: Record<string, string>; // username: password
}
