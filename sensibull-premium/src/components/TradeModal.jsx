import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

export const TradeModal = ({ isOpen, onClose, data, onConfirm }) => {
  // FIX BUG: Reset action/qty when modal opens for a NEW option (data changes)
  const [action, setAction] = useState('BUY');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setAction('BUY');
      setQty(1);
    }
  }, [isOpen, data?.strike, data?.type]); // reset when option changes

  if (!isOpen || !data) return null;

  const lotSize = 50;
  const totalQty = qty * lotSize;
  const marginRequired = (data.ltp * totalQty * (action === 'SELL' ? 5.5 : 1)).toFixed(2);
  const availableFunds = Math.max(0, 600000 - parseFloat(marginRequired));

  // FIX BUG: Enforce qty >= 1, also handle NaN from cleared input
  const handleQtyChange = (e) => {
    const val = parseInt(e.target.value);
    setQty(isNaN(val) || val < 1 ? 1 : val);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#0B1426]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-md bg-[#131B2F] border border-[#1F2A44] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1F2A44] flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {data.symbol} {data.strike} {data.type}
            </h3>
            <span className="text-[10px] text-[#8A92A6] font-bold uppercase tracking-widest">27 MAR 2026 EXPIRY</span>
          </div>
          <button onClick={onClose} className="p-2 text-[#8A92A6] hover:text-white transition-colors rounded-lg hover:bg-[#1F2A44]">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Buy/Sell Selector */}
          <div className="flex p-1 bg-[#0B1426] rounded-xl border border-[#1F2A44]">
             <button 
              onClick={() => setAction('BUY')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${action === 'BUY' ? 'bg-[#00C48C] text-[#0B1426] shadow-lg shadow-[#00C48C]/20' : 'text-[#8A92A6] hover:text-white'}`}
             >
               BUY
             </button>
             <button 
              onClick={() => setAction('SELL')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${action === 'SELL' ? 'bg-[#FF4D4F] text-white shadow-lg shadow-[#FF4D4F]/20' : 'text-[#8A92A6] hover:text-white'}`}
             >
               SELL
             </button>
          </div>

          {/* Pricing Info */}
          <div className="grid grid-cols-2 gap-8 text-center pt-2">
             <div className="flex flex-col">
                <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest mb-1">LTP</span>
                <span className="text-xl font-bold font-mono text-white">₹{data.ltp.toFixed(2)}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest mb-1">IV</span>
                {/* FIX BUG: iv may be a number or string — render safely */}
                <span className="text-xl font-bold font-mono text-[#00C48C]">{parseFloat(data.iv).toFixed(1)}%</span>
             </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-[#8A92A6] uppercase tracking-widest">Lots (Qty)</label>
                <span className="text-[10px] text-[#8A92A6] font-bold uppercase tracking-widest">Total: {totalQty} shares</span>
             </div>
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-12 h-12 bg-[#1F2A44] text-white rounded-xl flex items-center justify-center font-bold text-xl hover:bg-[#2d4a66] transition-colors"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min={1}
                  value={qty}
                  onChange={handleQtyChange}
                  className="flex-1 bg-[#0B1426] border border-[#1F2A44] rounded-xl py-3 text-center text-xl font-bold text-white outline-none focus:border-[#00C48C]"
                />
                <button 
                  onClick={() => setQty(q => q + 1)}
                  className="w-12 h-12 bg-[#1F2A44] text-white rounded-xl flex items-center justify-center font-bold text-xl hover:bg-[#2d4a66] transition-colors"
                >
                  +
                </button>
             </div>
          </div>

          {/* Margin Banner */}
          <div className="bg-[#1F2A44]/30 border border-[#1F2A44]/50 rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#131B2F] flex items-center justify-center">
                   <Zap size={16} className="text-[#00C48C]" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[9px] text-[#8A92A6] uppercase font-bold tracking-widest">Approx Margin</span>
                   <span className="text-sm font-bold font-mono text-white">₹{parseFloat(marginRequired).toLocaleString('en-IN')}</span>
                </div>
             </div>
             <div className="text-right">
                <div className="text-[9px] text-[#8A92A6] uppercase font-bold tracking-widest mb-0.5">Available</div>
                <div className="text-[10px] font-bold text-[#00C48C]">₹4,52,380</div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#0B1426]/50 border-t border-[#1F2A44] flex gap-4">
          <button 
            onClick={() => onConfirm({ ...data, action, qty })}
            className={`flex-1 py-4 rounded-xl font-bold text-sm shadow-xl transition-all ${
              action === 'BUY' ? 'bg-[#00C48C] text-[#0B1426] shadow-[#00C48C]/10 hover:bg-[#00ebd0]' : 'bg-[#FF4D4F] text-white shadow-[#FF4D4F]/10 hover:bg-[#ff6b6d]'
            }`}
          >
            {action === 'BUY' ? 'ADD TO STRATEGY' : 'ADD SELL LEG'}
          </button>
        </div>
      </div>
    </div>
  );
};
