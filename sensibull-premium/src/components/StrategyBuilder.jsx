import React from 'react';
import { Trash2, Plus, Copy, Info } from 'lucide-react';
import { PayoffChart } from './PayoffChart';

const MetricCard = ({ label, value, sub, type }) => (
  <div className="bg-[#131B2F]/50 border border-[#1F2A44] p-4 rounded-xl flex flex-col gap-1">
    <span className="text-[10px] text-[#8A92A6] uppercase font-bold tracking-widest">{label}</span>
    <span className={`text-lg font-bold font-mono ${
      type === 'profit' ? 'text-[#00C48C]' : 
      type === 'loss' ? 'text-[#FF4D4F]' : 
      'text-white'
    }`}>
      {value}
    </span>
    <span className="text-[10px] text-[#2d4a66] font-medium">{sub}</span>
  </div>
);

export const StrategyBuilder = ({ legs = [], onAddLeg, onRemoveLeg, onUpdateLeg, onPlaceOrder, spot = 23450 }) => {
  const calculateMetrics = () => {
    let maxProfit = 0;
    let maxLoss = 0;
    let netPremium = 0;

    legs.forEach(leg => {
       const prem = leg.ltp * leg.qty * 50;
       netPremium += leg.action === 'BUY' ? -prem : prem;
    });

    // Simple heuristic for max profit/loss in this mock
    const isCredit = netPremium > 0;
    maxProfit = isCredit ? netPremium : 'Unlimited';
    maxLoss = isCredit ? 'Limited' : Math.abs(netPremium);

    return { maxProfit, maxLoss, netPremium };
  };

  const { maxProfit, maxLoss, netPremium } = calculateMetrics();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Leg Manager */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-[#131B2F] border border-[#1F2A44] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#1F2A44] flex items-center justify-between">
            <h3 className="font-bold text-sm">Strategy Legs</h3>
            <button 
              onClick={onAddLeg}
              className="p-1.5 bg-[#00C48C]/10 text-[#00C48C] rounded-lg hover:bg-[#00C48C]/20 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {legs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-[#1F2A44] rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                   <Layers size={24} className="text-[#8A92A6]" />
                </div>
                <p className="text-xs text-[#8A92A6]">No legs added yet.<br/>Click + to start building.</p>
              </div>
            ) : (
              legs.map((leg, idx) => (
                <div key={idx} className={`p-4 rounded-xl border-l-4 ${leg.action === 'BUY' ? 'border-[#00C48C] bg-[#00C48C]/5' : 'border-[#FF4D4F] bg-[#FF4D4F]/5'} border-[#1F2A44] bg-[#131B2F]`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${leg.action === 'BUY' ? 'bg-[#00C48C]/20 text-[#00C48C]' : 'bg-[#FF4D4F]/20 text-[#FF4D4F]'}`}>
                      {leg.action}
                    </span>
                    <div className="flex gap-2">
                       <button className="text-[#8A92A6] hover:text-white"><Copy size={14} /></button>
                       <button 
                         onClick={() => onRemoveLeg(idx)}
                         className="text-[#8A92A6] hover:text-[#FF4D4F]"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-mono">{leg.strike}</span>
                    <span className="text-xs font-bold text-[#8A92A6]">{leg.type}</span>
                    <span className="ml-auto text-sm font-bold font-mono">₹{leg.ltp.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1F2A44]/50">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#8A92A6] uppercase font-bold">Qty</span>
                      <span className="text-xs font-bold font-mono">{leg.qty * 50}</span>
                    </div>
                    <div className="flex flex-col ml-auto text-right">
                      <span className="text-[8px] text-[#8A92A6] uppercase font-bold">IV</span>
                      <span className="text-xs font-bold font-mono">14.2%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#00C48C]/10 border border-[#00C48C]/20 p-4 rounded-2xl flex gap-3">
          <Info size={20} className="text-[#00C48C] shrink-0" />
          <p className="text-xs text-[#00C48C]/80 leading-relaxed">
            Market is currently <span className="font-bold underline">Bullish</span>. Consider selling Put Spreads for high-probability income.
          </p>
        </div>
      </div>

      {/* Right: Visualization & Metrics */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            label="Max Profit" 
            value={typeof maxProfit === 'number' ? `₹${maxProfit.toLocaleString('en-IN')}` : maxProfit} 
            sub="Estimated at expiry"
            type="profit"
          />
          <MetricCard 
            label="Max Loss" 
            value={typeof maxLoss === 'number' ? `₹${maxLoss.toLocaleString('en-IN')}` : maxLoss} 
            sub="Estimated at expiry"
            type="loss"
          />
          <MetricCard 
            label="Net Premium" 
            value={`₹${Math.abs(netPremium).toLocaleString('en-IN')}`} 
            sub={netPremium >= 0 ? 'Credit Received' : 'Debit Paid'}
            type={netPremium >= 0 ? 'profit' : 'loss'}
          />
          <MetricCard 
            label="Prob. of Profit" 
            value="64.2%" 
            sub="Statistical estimate"
          />
        </div>

        <div className="bg-[#131B2F] border border-[#1F2A44] rounded-2xl p-6 flex-1 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-sm">Payoff Visualization</h3>
            <div className="flex gap-4 items-center">
              <button 
                onClick={onPlaceOrder}
                className="px-6 py-2 bg-[#00C48C] text-[#0B1426] font-bold rounded-lg text-sm hover:bg-[#00ebd0] transition-all shadow-lg shadow-[#00C48C]/20"
              >
                Place Order
              </button>
              <div className="flex gap-2 p-1 bg-[#0B1426] rounded-lg">
                 <button className="px-3 py-1 bg-[#1F2A44] text-white text-[10px] font-bold rounded">EXPIRY</button>
                 <button className="px-3 py-1 text-[#8A92A6] text-[10px] font-bold rounded">T+0</button>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full bg-[#0B1426]/30 rounded-xl overflow-hidden">
             <PayoffChart legs={legs} spot={spot} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Layers = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m2.6 12.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9" />
    <path d="m2.6 17.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9" />
  </svg>
);
