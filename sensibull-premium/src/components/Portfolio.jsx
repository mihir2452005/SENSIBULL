import React from 'react';
import { 
  Briefcase, 
  ArrowUpRight, 
  Filter,
  Download
} from 'lucide-react';

const PositionRow = ({ symbol, strike, type, qty, avgPrice, ltp, pnl, onExit }) => {
  // FIX BUG: Guard against divide-by-zero when qty is 0 or avgPrice is 0
  const pctPnl = avgPrice > 0 && Math.abs(qty) > 0
    ? ((pnl / (avgPrice * Math.abs(qty) * 50)) * 100).toFixed(2)
    : '0.00';

  return (
  <tr className="border-b border-[#1F2A44]/30 hover:bg-[#1F2A44]/20 transition-colors group">
    <td className="py-4 pl-4">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white">{symbol}</span>
        <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-wider">27 MAR EXP</span>
      </div>
    </td>
    <td className="py-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold font-mono text-white">{strike}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${type === 'CE' ? 'bg-[#00C48C]/10 text-[#00C48C]' : 'bg-[#FF4D4F]/10 text-[#FF4D4F]'}`}>
          {type}
        </span>
      </div>
    </td>
    <td className="py-4 text-center font-mono text-xs">
      <span>{Math.abs(qty) * 50}</span>
      {qty < 0 && <span className="ml-1 text-[#FF4D4F] text-[9px] font-bold">(Short)</span>}
    </td>
    <td className="py-4 text-center font-mono text-xs text-[#8A92A6]">₹{avgPrice.toFixed(2)}</td>
    <td className="py-4 text-center font-mono text-xs">₹{ltp.toFixed(2)}</td>
    <td className="py-4 text-right">
      <div className={`flex flex-col items-end ${pnl >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
        <span className="text-xs font-bold font-mono">₹{pnl.toLocaleString('en-IN')}</span>
        <span className="text-[9px] font-bold">
          {pnl >= 0 ? '+' : ''}{pctPnl}%
        </span>
      </div>
    </td>
    <td className="py-4 text-right pr-4">
       <button 
        onClick={onExit}
        className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-[#FF4D4F]/10 text-[#FF4D4F] text-[10px] font-bold rounded hover:bg-[#FF4D4F] hover:text-white transition-all uppercase tracking-widest"
       >
         Exit
       </button>
    </td>
  </tr>
  );
};

export const Portfolio = ({ positions = [], onExitPosition, realizedPnl = 0 }) => {
  const totalPnl = positions.reduce((acc, pos) => acc + pos.pnl, 0);

  // Calculate margin utilized by active positions
  const marginUsed = positions.reduce((acc, pos) => {
    if (pos.qty > 0) return acc + (pos.avgPrice * pos.qty * 50); // Premium paid
    if (pos.qty < 0) return acc + (pos.avgPrice * Math.abs(pos.qty) * 50 * 5.5); // Approx Margin for Short
    return acc;
  }, 0);

  const initialFunds = 600000;
  const availableFunds = initialFunds - marginUsed + realizedPnl;
  const totalNetPnl = totalPnl + realizedPnl;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#131B2F] border border-[#1F2A44] p-6 rounded-2xl flex flex-col justify-between">
           <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">Available Funds</span>
           <div className="flex items-baseline gap-2 mt-2">
             <span className="text-2xl font-bold font-mono">₹{availableFunds.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
             <span className={`text-xs font-bold flex items-center gap-1 ${totalNetPnl >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
               {totalNetPnl >= 0 ? <ArrowUpRight size={12} /> : null} 
               {totalNetPnl >= 0 ? '+' : ''}₹{totalNetPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (Today)
             </span>
           </div>
        </div>
        
        <div className="bg-[#131B2F] border border-[#1F2A44] p-6 rounded-2xl flex flex-col justify-between">
           <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">Total Active P&L</span>
           <div className="flex items-baseline gap-2 mt-2">
             <span className={`text-2xl font-bold font-mono ${totalPnl >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
               {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN')}
             </span>
             <span className="text-xs text-[#8A92A6] font-mono">Realized: ₹{realizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
           </div>
        </div>

        <div className="bg-[#131B2F] border border-[#1F2A44] p-6 rounded-2xl flex flex-col justify-between">
           <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">Margin Used</span>
           <div className="flex flex-col mt-2">
             <span className="text-2xl font-bold font-mono">₹{marginUsed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
             <div className="w-full h-1.5 bg-[#1F2A44] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#00C48C]/50 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (marginUsed / initialFunds) * 100))}%` }} />
             </div>
           </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#131B2F] border border-[#1F2A44] rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#1F2A44] flex items-center justify-between bg-[#131B2F]/50">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-sm">Active Positions</h3>
            <div className="h-4 w-px bg-[#1F2A44]" />
            <div className="flex gap-2">
               <button className="px-3 py-1 bg-[#00C48C]/10 text-[#00C48C] text-[10px] font-bold rounded-lg border border-[#00C48C]/20">CURRENT ({positions.length})</button>
               <button className="px-3 py-1 text-[#8A92A6] text-[10px] font-bold rounded-lg hover:text-white">HISTORY</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="p-2 text-[#8A92A6] hover:text-white transition-colors bg-[#1F2A44]/50 rounded-lg"><Filter size={14} /></button>
             <button className="p-2 text-[#8A92A6] hover:text-white transition-colors bg-[#1F2A44]/50 rounded-lg"><Download size={14} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0B1426]/50 text-[10px] font-bold text-[#8A92A6] uppercase tracking-widest text-left">
                <th className="py-3 pl-4">Instrument</th>
                <th className="py-3">Option</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-center">Avg. Price</th>
                <th className="py-3 text-center">LTP</th>
                <th className="py-3 text-right">Unrealized P&L</th>
                <th className="py-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                   <td colSpan={7} className="py-24 text-center">
                      <Briefcase size={48} className="text-[#1F2A44] mx-auto mb-4" />
                      <p className="text-[#8A92A6] text-sm font-medium">No active positions found.</p>
                      <p className="text-[10px] text-[#2d4a66] mt-1">Start trading from the Option Chain to see positions here.</p>
                   </td>
                </tr>
              ) : (
                positions.map((pos, idx) => (
                  <PositionRow 
                    key={idx} 
                    {...pos} 
                    onExit={() => onExitPosition(idx)} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
