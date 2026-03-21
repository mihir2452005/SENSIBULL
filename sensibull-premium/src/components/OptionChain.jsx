import React from 'react';
import { calculateGreeks, generateOptionChain } from '../services/market-sim';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TableHeader = () => (
  <div className="grid grid-cols-[1fr_1fr_1fr_100px_1fr_1fr_1fr] gap-0 bg-[#131B2F] border-b border-[#1F2A44] sticky top-0 z-10">
    <div className="col-span-3 grid grid-cols-3 text-[10px] font-bold text-[#8A92A6] uppercase tracking-wider py-3 border-r border-[#1F2A44]">
      <div className="text-center">OI</div>
      <div className="text-center">IV</div>
      <div className="text-center">LTP</div>
    </div>
    <div className="bg-[#1F2A44] text-white text-[10px] font-bold text-center py-3 flex items-center justify-center">STRIKE</div>
    <div className="col-span-3 grid grid-cols-3 text-[10px] font-bold text-[#8A92A6] uppercase tracking-wider py-3 border-l border-[#1F2A44]">
      <div className="text-center">LTP</div>
      <div className="text-center">IV</div>
      <div className="text-center">OI</div>
    </div>
  </div>
);

const OptionChainRow = ({ data, spot, onAddLeg }) => {
  const isAtm = Math.abs(data.strike - spot) < 25;
  const isItmCE = data.strike < spot;
  const isItmPE = data.strike > spot;

  const handleAdd = (type, action, ltp) => {
    onAddLeg({
      strike: data.strike,
      type,
      action,
      qty: 1,
      ltp
    });
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_100px_1fr_1fr_1fr] hover:bg-[#1F2A44]/30 transition-colors group border-b border-[#1F2A44]/30">
      {/* Calls Side */}
      <div className={cn("col-span-3 grid grid-cols-3 py-3 border-r border-[#1F2A44]/50", isItmCE && "bg-[#00C48C]/5")}>
        <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.ce.oi.toLocaleString('en-IN')}</div>
        <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.ce.iv.toFixed(1)}</div>
        <div 
          onClick={() => handleAdd('CE', 'BUY', data.ce.ltp)}
          className="text-center font-mono text-[11px] font-bold text-[#00C48C] cursor-pointer hover:bg-[#00C48C]/10 transition-colors"
        >
          {data.ce.ltp.toFixed(2)}
        </div>
      </div>

      {/* Strike Column */}
      <div className={cn(
        "bg-[#131B2F] text-white font-mono text-xs font-bold text-center flex items-center justify-center group-hover:bg-[#1F2A44]",
        isAtm && "border-y-2 border-[#00C48C]"
      )}>
        {data.strike}
      </div>

      {/* Puts Side */}
      <div className={cn("col-span-3 grid grid-cols-3 py-3 border-l border-[#1F2A44]/50", isItmPE && "bg-[#FF4D4F]/5")}>
        <div 
          onClick={() => handleAdd('PE', 'BUY', data.pe.ltp)}
          className="text-center font-mono text-[11px] font-bold text-[#FF4D4F] cursor-pointer hover:bg-[#FF4D4F]/10 transition-colors"
        >
          {data.pe.ltp.toFixed(2)}
        </div>
        <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.pe.iv.toFixed(1)}</div>
        <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.pe.oi.toLocaleString('en-IN')}</div>
      </div>
    </div>
  );
};

export const OptionChain = ({ symbol = 'NIFTY', spot = 23450, onAddLeg }) => {
  const chain = generateOptionChain(spot);

  return (
    <div className="bg-[#131B2F]/30 rounded-2xl border border-[#1F2A44] overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-4 border-b border-[#1F2A44]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">Expiry Date</span>
            <div className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer hover:text-[#00C48C]">
              27 MAR 2026
              <div className="w-4 h-4 rounded bg-[#1F2A44] flex items-center justify-center text-[8px]">▼</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button className="text-[10px] font-bold px-3 py-1.5 rounded bg-[#1F2A44] text-[#8A92A6] hover:text-white uppercase tracking-wider transition-all">Greeks View</button>
           <button className="text-[10px] font-bold px-3 py-1.5 rounded bg-[#00C48C]/10 text-[#00C48C] uppercase tracking-wider transition-all">LTP View</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-hidden">
        <TableHeader />
        {chain.map((row) => (
          <OptionChainRow key={row.strike} data={row} spot={spot} onAddLeg={onAddLeg} />
        ))}
      </div>
      
      <div className="p-3 bg-[#131B2F]/80 border-t border-[#1F2A44] flex items-center justify-center gap-8">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#00C48C]/10 border border-[#00C48C]/30 rounded" />
            <span className="text-[10px] text-[#8A92A6]">In the Money (Calls)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF4D4F]/10 border border-[#FF4D4F]/30 rounded" />
            <span className="text-[10px] text-[#8A92A6]">In the Money (Puts)</span>
         </div>
      </div>
    </div>
  );
};
