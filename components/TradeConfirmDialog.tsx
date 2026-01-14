import React from 'react';
import { TransactionType, TradingMode } from '../types';

interface TradeConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  type: TransactionType;
  stockName: string;
  stockSymbol: string;
  price: number;
  quantity: number;
  mode: TradingMode;
  totalShares: number;
  fee: number;
  tax: number;
  totalAmount: number;
  totalCost: number;
  currentBalance: number;
  remainingBalance?: number;
}

const TradeConfirmDialog: React.FC<TradeConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  type,
  stockName,
  stockSymbol,
  price,
  quantity,
  mode,
  totalShares,
  fee,
  tax,
  totalAmount,
  totalCost,
  currentBalance,
  remainingBalance
}) => {
  if (!isOpen) return null;

  const isBuy = type === TransactionType.BUY;
  const canAfford = isBuy ? currentBalance >= totalCost : true;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 my-auto animate-in fade-in zoom-in duration-200">
        <div className="space-y-6 pb-4">
          {/* Header */}
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isBuy ? 'bg-red-100' : 'bg-green-100'
            }`}>
              <span className="text-3xl">{isBuy ? '📈' : '📉'}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {isBuy ? '確認買入' : '確認賣出'}
            </h3>
            <p className="text-slate-500 text-sm font-medium">
              {stockName} ({stockSymbol})
            </p>
          </div>

          {/* Trade Details */}
          <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 font-bold">交易類型</span>
              <span className="text-sm font-black text-slate-900">
                {isBuy ? '買入' : '賣出'} • {mode === TradingMode.WHOLE ? '整股' : '零股'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 font-bold">委託數量</span>
              <span className="text-sm font-black text-slate-900">
                {quantity.toLocaleString()} {mode === TradingMode.WHOLE ? '張' : '股'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 font-bold">總股數</span>
              <span className="text-sm font-black text-slate-900">
                {totalShares.toLocaleString()} 股
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 font-bold">委託價格</span>
              <span className="text-sm font-black text-slate-900">
                ${price.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 font-bold">成交金額</span>
                <span className="text-sm font-black text-slate-900">
                  ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600 font-bold">手續費</span>
                <span className="text-sm font-black text-slate-900">
                  ${fee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              {!isBuy && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 font-bold">證券交易稅</span>
                  <span className="text-sm font-black text-slate-900">
                    ${tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-base font-black text-slate-900">
                  {isBuy ? '預計支出' : '預計收入'}
                </span>
                <span className={`text-lg font-black ${
                  isBuy ? 'text-red-500' : 'text-green-600'
                }`}>
                  {isBuy ? '-' : '+'}${Math.abs(totalCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Account Balance */}
          <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600 font-bold">目前可用資產</span>
              <span className="text-lg font-black text-blue-600">
                ${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            {isBuy && remainingBalance !== undefined && (
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-sm text-slate-600 font-bold">交易後餘額</span>
                <span className={`text-base font-black ${
                  remainingBalance >= 0 ? 'text-blue-600' : 'text-red-500'
                }`}>
                  ${remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>

          {/* Warning if insufficient balance */}
          {isBuy && !canAfford && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-600 font-bold text-center">
                ⚠️ 餘額不足，無法完成交易
              </p>
            </div>
          )}

          {/* Settlement Info */}
          <div className="bg-slate-100 rounded-xl p-3">
            <p className="text-xs text-slate-500 text-center font-medium">
              💡 此委託將於 T+2 進行交割
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 pb-2 -mx-6 sm:-mx-8 px-6 sm:px-8">
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={!canAfford}
              className={`flex-1 py-4 rounded-2xl font-black transition-all ${
                canAfford
                  ? isBuy
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-200'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-200'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isBuy ? '確認買入' : '確認賣出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeConfirmDialog;
