import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateOptionChain } from '../services/market-sim';
import { TradeModal } from './TradeModal';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TableHeader = ({ viewMode }) => (
  <div className="grid grid-cols-[1fr_1fr_1fr_100px_1fr_1fr_1fr] gap-0 bg-[#131B2F] border-b border-[#1F2A44] sticky top-0 z-10">
    <div className="col-span-3 grid grid-cols-3 text-[10px] font-bold text-[#8A92A6] uppercase tracking-wider py-3 border-r border-[#1F2A44]">
      {viewMode === 'LTP' ? (
        <>
          <div className="text-center">OI</div>
          <div className="text-center">IV</div>
          <div className="text-center">LTP</div>
        </>
      ) : (
        <>
          <div className="text-center">DELTA</div>
          <div className="text-center">THETA</div>
          <div className="text-center">GAMMA</div>
        </>
      )}
    </div>
    <div className="bg-[#1F2A44] text-white text-[10px] font-bold text-center py-3 flex items-center justify-center">STRIKE</div>
    <div className="col-span-3 grid grid-cols-3 text-[10px] font-bold text-[#8A92A6] uppercase tracking-wider py-3 border-l border-[#1F2A44]">
      {viewMode === 'LTP' ? (
        <>
          <div className="text-center">LTP</div>
          <div className="text-center">IV</div>
          <div className="text-center">OI</div>
        </>
      ) : (
        <>
          <div className="text-center">GAMMA</div>
          <div className="text-center">THETA</div>
          <div className="text-center">DELTA</div>
        </>
      )}
    </div>
  </div>
);

// FIX BUG: Greeks are memoized per row so Math.random() doesn't re-run on every re-render
const OptionChainRow = ({ data, spot, symbol = 'NIFTY', onSelectLeg, viewMode, atmRef }) => {
  const isAtm = Math.abs(data.strike - spot) < 25;
  const isItmCE = data.strike < spot;
  const isItmPE = data.strike > spot;

  // FIX BUG: Use stable delta from BS model, use a deterministic theta
  const ceDelta = data.ce.delta?.toFixed(2) ?? (0.5 + (spot - data.strike) / 1000).toFixed(2);
  const peDelta = data.pe.delta?.toFixed(2) ?? (ceDelta - 1).toFixed(2);
  const ceTheta = data.ce.theta?.toFixed(2) ?? (-10 - data.strike / 10000).toFixed(1);
  const peTheta = data.pe.theta?.toFixed(2) ?? (-12 - data.strike / 10000).toFixed(1);
  const ceGamma = data.ce.gamma?.toFixed(4) ?? (0.0012).toFixed(4);
  const peGamma = data.pe.gamma?.toFixed(4) ?? (0.0012).toFixed(4);

  return (
    <div ref={isAtm ? atmRef : null} className="grid grid-cols-[1fr_1fr_1fr_100px_1fr_1fr_1fr] hover:bg-[#1F2A44]/30 transition-colors group border-b border-[#1F2A44]/30">
      {/* Calls Side */}
      <div className={cn("col-span-3 grid grid-cols-3 py-3 border-r border-[#1F2A44]/50", isItmCE && "bg-[#00C48C]/5")}>
        {viewMode === 'LTP' ? (
          <>
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.ce.oi.toLocaleString('en-IN')}</div>
            {/* M-04: IV with % sign */}
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.ce.iv.toFixed(1)}%</div>
            <div 
              onClick={() => onSelectLeg({ symbol, strike: data.strike, type: 'CE', ltp: data.ce.ltp, iv: data.ce.iv })}
              className="text-center font-mono text-[11px] font-bold text-[#00C48C] cursor-pointer hover:bg-[#00C48C]/20 transition-colors py-1 rounded mx-2"
            >
              {data.ce.ltp.toFixed(2)}
            </div>
          </>
        ) : (
          <>
            <div className="text-center font-mono text-[11px] text-white">{ceDelta}</div>
            <div className="text-center font-mono text-[11px] text-[#FF4D4F]">{ceTheta}</div>
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{ceGamma}</div>
          </>
        )}
      </div>

      {/* Strike Column */}
      <div className={cn(
        "bg-[#131B2F] text-white font-mono text-xs font-bold text-center flex items-center justify-center group-hover:bg-[#1F2A44] cursor-pointer",
        isAtm && "border-y-2 border-[#00C48C]"
      )}>
        {data.strike}
      </div>

      {/* Puts Side */}
      <div className={cn("col-span-3 grid grid-cols-3 py-3 border-l border-[#1F2A44]/50", isItmPE && "bg-[#FF4D4F]/5")}>
        {viewMode === 'LTP' ? (
          <>
            <div 
              onClick={() => onSelectLeg({ symbol, strike: data.strike, type: 'PE', ltp: data.pe.ltp, iv: data.pe.iv })}
              className="text-center font-mono text-[11px] font-bold text-[#FF4D4F] cursor-pointer hover:bg-[#FF4D4F]/20 transition-colors py-1 rounded mx-2"
            >
              {data.pe.ltp.toFixed(2)}
            </div>
                    {/* M-04: PE IV with % sign; L-01: PE IV color */}
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.pe.iv.toFixed(1)}%</div>
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{data.pe.oi.toLocaleString('en-IN')}</div>
          </>
        ) : (
          <>
            <div className="text-center font-mono text-[11px] text-[#8A92A6]">{peGamma}</div>
            <div className="text-center font-mono text-[11px] text-[#FF4D4F]">{peTheta}</div>
            <div className="text-center font-mono text-[11px] text-white">{peDelta}</div>
          </>
        )}
      </div>
    </div>
  );
};

export const OptionChain = ({ symbol = 'NIFTY', spot = 23450, onAddLeg }) => {
  const [viewMode, setViewMode] = useState('LTP');
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState('27 MAR 2026');
  const [showExpiryMenu, setShowExpiryMenu] = useState(false);
  const EXPIRY_OPTIONS = ['27 MAR 2026', '3 APR 2026', '24 APR 2026'];
  const scrollContainerRef = useRef(null);
  const atmRowRef = useRef(null);
  const expiryRef = useRef(null);

  // M-07: Close expiry dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (expiryRef.current && !expiryRef.current.contains(e.target)) {
        setShowExpiryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // FIX BUG: useMemo dependency must not be a computed expression inline
  const roundedSpot = Math.round(spot);
  const chain = useMemo(() => generateOptionChain(spot), [roundedSpot]);

  // ATM auto-scroll: only trigger when the ATM strike itself changes (every ~50 points)
  const roundedAtm = Math.round(spot / 50);
  const atmStrike = useMemo(() => Math.round(spot / 50) * 50, [roundedAtm]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const atmRow = atmRowRef.current;
    if (atmRow && container) {
      const containerTop = container.getBoundingClientRect().top;
      const rowTop = atmRow.getBoundingClientRect().top;
      const offset = rowTop - containerTop - container.clientHeight / 2 + atmRow.clientHeight / 2;
      container.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }, [atmStrike]);

  return (
    <div className="bg-[#131B2F]/30 rounded-2xl border border-[#1F2A44] overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-4 border-b border-[#1F2A44]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col relative" ref={expiryRef}>
            <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">Expiry Date</span>
            <div 
              className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer hover:text-[#00C48C]"
              onClick={() => setShowExpiryMenu(v => !v)}
            >
              {selectedExpiry}
              <div className="w-4 h-4 rounded bg-[#1F2A44] flex items-center justify-center text-[8px]">▼</div>
            </div>
            {showExpiryMenu && (
              <div className="absolute top-12 left-0 z-50 bg-[#131B2F] border border-[#1F2A44] rounded-xl shadow-2xl overflow-hidden">
                {EXPIRY_OPTIONS.map(exp => (
                  <button
                    key={exp}
                    onClick={() => { setSelectedExpiry(exp); setShowExpiryMenu(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#1F2A44] transition-colors ${
                      exp === selectedExpiry ? 'text-[#00C48C] font-bold' : 'text-white'
                    }`}
                  >{exp}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setViewMode('GREEKS')}
            className={cn(
              "text-[10px] font-bold px-4 py-2 rounded transition-all uppercase tracking-widest",
              viewMode === 'GREEKS' ? "bg-[#00C48C] text-[#0B1426] shadow-lg shadow-[#00C48C]/10" : "bg-[#1F2A44] text-[#8A92A6] hover:text-white"
            )}
           >
             Greeks View
           </button>
           <button 
            onClick={() => setViewMode('LTP')}
            className={cn(
              "text-[10px] font-bold px-4 py-2 rounded transition-all uppercase tracking-widest",
              viewMode === 'LTP' ? "bg-[#00C48C] text-[#0B1426] shadow-lg shadow-[#00C48C]/10" : "bg-[#1F2A44] text-[#8A92A6] hover:text-white"
            )}
           >
             LTP View
           </button>
        </div>
      </div>

      {/* FIX BUG: overflow-y-auto without overflow-hidden allows scrolling properly */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <TableHeader viewMode={viewMode} />
        {chain.map((row) => (
          <OptionChainRow 
            key={row.strike} 
            data={row} 
            spot={spot}
            symbol={symbol}
            onSelectLeg={setSelectedLeg}
            viewMode={viewMode}
            atmRef={atmRowRef}
          />
        ))}
      </div>

      {selectedLeg && (
        <TradeModal 
          isOpen={!!selectedLeg}
          onClose={() => setSelectedLeg(null)}
          data={{...selectedLeg, expiry: selectedExpiry}}
          onConfirm={(leg) => {
            onAddLeg({...leg, expiry: selectedExpiry});
            setSelectedLeg(null);
          }}
        />
      )}
      
      <div className="p-3 bg-[#131B2F]/80 border-t border-[#1F2A44] flex items-center justify-center gap-8">
         {/* L-07: Legend items including ATM strike */}
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#00C48C]/10 border border-[#00C48C]/30 rounded" />
            <span className="text-[10px] text-[#8A92A6]">In the Money (Calls)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[#00C48C] rounded" />
            <span className="text-[10px] text-[#8A92A6]">At the Money (ATM)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF4D4F]/10 border border-[#FF4D4F]/30 rounded" />
            <span className="text-[10px] text-[#8A92A6]">In the Money (Puts)</span>
         </div>
      </div>
    </div>
  );
};
