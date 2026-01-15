
import React from 'react';
import { GameMode } from '../types';

interface GameModeSelectorProps {
  currentMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-2xl border-2 border-slate-200 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-700 uppercase mb-1">遊戲模式</h3>
          <p className="text-xs text-slate-500">
            {currentMode === GameMode.REAL 
              ? '使用真實台股數據進行交易' 
              : '使用模擬數據學習股票交易'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange(GameMode.REAL)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
              currentMode === GameMode.REAL
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
            }`}
          >
            真實模式
          </button>
          <button
            onClick={() => onModeChange(GameMode.SIMULATION)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
              currentMode === GameMode.SIMULATION
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
            }`}
          >
            模擬模式
          </button>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          ⚠️ 兩種模式的資金和交易記錄完全獨立，無法互相流通
        </p>
      </div>
    </div>
  );
};

export default GameModeSelector;
