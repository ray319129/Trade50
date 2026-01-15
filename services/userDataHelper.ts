
import { UserState, GameMode, Transaction } from '../types';
import { INITIAL_BALANCE } from '../constants';
import { recalculateBalance, recalculateHoldings, validateAndFixUserData } from './balanceCalculator';

/**
 * 获取指定模式的用户数据
 */
export const getModeData = (user: UserState, mode: GameMode) => {
  // 如果用户数据是旧格式（向后兼容）
  if (user.balance !== undefined) {
    const oldData = {
      balance: user.balance || INITIAL_BALANCE,
      pendingSettlementCash: user.pendingSettlementCash || 0,
      holdings: user.holdings || [],
      history: user.history || [],
      isBankrupt: user.isBankrupt || false
    };

    // 如果是真实模式，返回旧数据；如果是模拟模式，返回新初始数据
    if (mode === GameMode.REAL) {
      return oldData;
    } else {
      return {
        balance: INITIAL_BALANCE,
        pendingSettlementCash: 0,
        holdings: [],
        history: [],
        isBankrupt: false
      };
    }
  }

  // 新格式：根据模式返回对应数据
  if (mode === GameMode.REAL) {
    return user.realMode || {
      balance: INITIAL_BALANCE,
      pendingSettlementCash: 0,
      holdings: [],
      history: [],
      isBankrupt: false
    };
  } else {
    return user.simulationMode || {
      balance: INITIAL_BALANCE,
      pendingSettlementCash: 0,
      holdings: [],
      history: [],
      isBankrupt: false
    };
  }
};

/**
 * 更新指定模式的用户数据
 */
export const updateModeData = (user: UserState, mode: GameMode, modeData: any): UserState => {
  // 如果用户数据是旧格式，转换为新格式
  if (user.balance !== undefined) {
    const oldData = {
      balance: user.balance || INITIAL_BALANCE,
      pendingSettlementCash: user.pendingSettlementCash || 0,
      holdings: user.holdings || [],
      history: user.history || [],
      isBankrupt: user.isBankrupt || false
    };

    return {
      username: user.username,
      realMode: mode === GameMode.REAL ? modeData : oldData,
      simulationMode: mode === GameMode.SIMULATION ? modeData : {
        balance: INITIAL_BALANCE,
        pendingSettlementCash: 0,
        holdings: [],
        history: [],
        isBankrupt: false
      },
      lastUpdate: Date.now()
    };
  }

  // 新格式：更新对应模式的数据
  const updated = { ...user };
  if (mode === GameMode.REAL) {
    updated.realMode = modeData;
  } else {
    updated.simulationMode = modeData;
  }
  updated.lastUpdate = Date.now();
  return updated;
};

/**
 * 验证并修复用户数据（支持新模式结构）
 */
export const validateAndFixUserDataWithMode = (userData: UserState, mode: GameMode): UserState => {
  const modeData = getModeData(userData, mode);
  
  // 验证并修复模式数据
  const validatedModeData = {
    ...modeData,
    balance: recalculateBalance(modeData.history),
    holdings: recalculateHoldings(modeData.history),
    isBankrupt: modeData.isBankrupt || false
  };

  // 更新用户数据
  return updateModeData(userData, mode, validatedModeData);
};

/**
 * 创建新的用户数据（支持双模式）
 */
export const createNewUserData = (username: string): UserState => {
  return {
    username,
    realMode: {
      balance: INITIAL_BALANCE,
      pendingSettlementCash: 0,
      holdings: [],
      history: [],
      isBankrupt: false
    },
    simulationMode: {
      balance: INITIAL_BALANCE,
      pendingSettlementCash: 0,
      holdings: [],
      history: [],
      isBankrupt: false
    },
    lastUpdate: Date.now()
  };
};
