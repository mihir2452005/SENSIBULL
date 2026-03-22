import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export const PayoffChart = ({ legs = [], spot = 23450, step = 50, viewMode = 'expiry' }) => {
  // FIX BUG: Memoize so P&L data only recalculates when legs or spot changes
  const data = useMemo(() => {
    const range = 500;
    const points = 50;
    return Array.from({ length: points * 2 + 1 }, (_, idx) => {
      const i = idx - points;
      const underlying = spot + (i * range) / points;
      let pnl = 0;
      legs.forEach(leg => {
        const intrinsic = leg.type === 'CE'
          ? Math.max(0, underlying - leg.strike)
          : Math.max(0, leg.strike - underlying);
        // M-05: For T+0 view, add a rough time-value approximation (min of 30% of premium stays as TV)
        const timeValue = viewMode === 't0' ? leg.ltp * 0.35 * Math.exp(-Math.abs(underlying - leg.strike) / (spot * 0.05)) : 0;
        const effectiveValue = intrinsic + timeValue;
        const unitPnl = leg.action === 'BUY'
          ? effectiveValue - leg.ltp
          : leg.ltp - effectiveValue;
        pnl += unitPnl * leg.qty * 50;
      });
      return { underlying, pnl: +pnl.toFixed(2) }; // L-01: 2dp precision
    });
  }, [legs, spot, viewMode]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-[#131B2F] border border-[#1F2A44] p-3 rounded-lg shadow-2xl">
          <div className="text-[10px] text-[#8A92A6] uppercase font-bold mb-1">
            {viewMode === 't0' ? 'P&L at T+0 (Today)' : 'P&L at Expiry'}
          </div>
          <div className={`text-sm font-mono font-bold ${val >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
            ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#8A92A6] mt-2">Spot: ₹{payload[0].payload.underlying.toFixed(0)}</div>
        </div>
      );
    }
    return null;
  };

  const hasProfit = data.some(d => d.pnl > 0);
  const hasLoss = data.some(d => d.pnl < 0);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C48C" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#00C48C" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4D4F" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#FF4D4F" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2A44" vertical={false} />
          <XAxis 
            dataKey="underlying" 
            hide 
            domain={['dataMin', 'dataMax']} 
          />
          <YAxis 
            hide 
            domain={['auto', 'auto']} 
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#1F2A44" strokeWidth={2} />
          <ReferenceLine x={spot} stroke="#f5a623" strokeDasharray="3 3" />
          
          {/* Profit area — green strokes on profit side */}
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={hasLoss && !hasProfit ? '#FF4D4F' : '#00C48C'}
            strokeWidth={3}
            fillOpacity={1}
            fill={hasLoss && !hasProfit ? 'url(#colorLoss)' : 'url(#colorProfit)'}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
