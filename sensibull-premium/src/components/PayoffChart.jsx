import React from 'react';
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

export const PayoffChart = ({ legs = [], spot = 23450, step = 50 }) => {
  // Generate data points for the payoff curve
  const generateData = () => {
    const data = [];
    const range = 500; // ±500 points from spot
    const points = 50;
    
    for (let i = -points; i <= points; i++) {
       const underlying = spot + (i * range) / points;
       let pnl = 0;
       
       legs.forEach(leg => {
         const intrinsic = leg.type === 'CE' 
           ? Math.max(0, underlying - leg.strike) 
           : Math.max(0, leg.strike - underlying);
         
         const unitPnl = leg.action === 'BUY' 
           ? intrinsic - leg.ltp 
           : leg.ltp - intrinsic;
           
         pnl += unitPnl * leg.qty * 50; // 50 is lot size
       });
       
       data.push({
         underlying,
         pnl: Math.round(pnl)
       });
    }
    return data;
  };

  const data = generateData();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-[#131B2F] border border-[#1F2A44] p-3 rounded-lg shadow-2xl">
          <div className="text-[10px] text-[#8A92A6] uppercase font-bold mb-1">P&L at Expiry</div>
          <div className={`text-sm font-mono font-bold ${val >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
            ₹{val.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#8A92A6] mt-2">Spot: ₹{payload[0].payload.underlying.toFixed(0)}</div>
        </div>
      );
    }
    return null;
  };

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
          
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="#00C48C"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorProfit)"
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
