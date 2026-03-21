import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Layers, 
  PieChart, 
  Settings, 
  Search, 
  Bell, 
  ChevronDown, 
  Menu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { OptionChain } from './components/OptionChain';
import { StrategyBuilder } from './components/StrategyBuilder';
import { Portfolio } from './components/Portfolio';

// --- MOCK COMPONENTS ---
const Sidebar = ({ activeTab, setActiveTab }) => (
  <aside className="fixed left-0 top-0 h-screen w-64 bg-[#131B2F] border-r border-[#1F2A44] flex flex-col z-50">
    <div className="p-6 flex items-center gap-3">
      <div className="w-10 h-10 bg-[#00C48C] rounded-xl flex items-center justify-center shadow-lg shadow-[#00C48C]/20">
        <Zap size={24} className="text-[#0B1426] fill-current" />
      </div>
      <span className="text-xl font-bold tracking-tight">SENSIBULL</span>
      <span className="text-[10px] bg-[#1F2A44] px-1.5 py-0.5 rounded text-[#8A92A6] font-mono ml-auto">PRO</span>
    </div>
    
    <nav className="flex-1 px-4 mt-4 space-y-1">
      {[
        { icon: TrendingUp, label: 'Option Chain', id: 'chain' },
        { icon: Layers, label: 'Strategy Builder', id: 'builder' },
        { icon: PieChart, label: 'Positions', id: 'positions' },
        { icon: Settings, label: 'Settings', id: 'settings' }
      ].map((item) => (
        <button 
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
            activeTab === item.id 
              ? 'bg-[#00C48C]/10 text-[#00C48C]' 
              : 'text-[#8A92A6] hover:bg-[#1F2A44] hover:text-white'
          }`}
        >
          <item.icon size={20} className={activeTab === item.id ? 'text-[#00C48C]' : 'group-hover:text-white'} />
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
    
    <div className="p-4 mt-auto">
      <div className="bg-[#1F2A44]/50 border border-[#1F2A44] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-[#00C48C]" />
          <span className="text-xs font-semibold text-[#8A92A6] uppercase tracking-wider">KYC Verified</span>
        </div>
        <div className="text-sm font-bold text-white mb-1">Trading Simulation</div>
        <div className="text-[10px] text-[#8A92A6]">Safe paper trading environment active.</div>
      </div>
    </div>
  </aside>
);

// --- REST OF THE COMPONENTS ---
// (IndexWidget remains the same)

const Header = ({ niftySpot, bankNiftySpot }) => (
  <header className="fixed top-0 left-64 right-0 h-20 bg-[#0B1426]/80 backdrop-blur-md border-b border-[#1F2A44] flex items-center justify-between px-8 z-40">
    <div className="flex items-center gap-4">
      <IndexWidget name="NIFTY 50" price={niftySpot} change={120.4} pct={0.52} />
      <IndexWidget name="BANK NIFTY" price={bankNiftySpot} change={-210.1} pct={-0.43} />
      <div className="h-8 w-px bg-[#1F2A44] mx-2" />
      <div className="flex items-center gap-2 bg-[#131B2F] px-4 py-2 rounded-full border border-[#1F2A44] focus-within:border-[#00C48C] transition-colors">
        <Search size={16} className="text-[#8A92A6]" />
        <input 
          type="text" 
          placeholder="Search stocks (NIFTY, RELIANCE...)" 
          className="bg-transparent border-none outline-none text-sm text-white w-64 placeholder-[#8A92A6]" 
        />
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#00C48C] animate-pulse" />
        <span className="text-[10px] font-bold text-[#00C48C] uppercase tracking-widest">Market Open</span>
      </div>
      <button className="text-[#8A92A6] hover:text-white transition-colors relative">
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4D4F] rounded-full border-2 border-[#0B1426]" />
      </button>
      <div className="flex items-center gap-3 bg-[#131B2F] pl-2 pr-4 py-1.5 rounded-full border border-[#1F2A44] hover:border-[#8A92A6] transition-all cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00C48C] to-[#008C64] flex items-center justify-center text-white font-bold text-xs">
          MU
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white leading-none">Mihir User</span>
          <span className="text-[10px] text-[#8A92A6] leading-none mt-1">Free Plan</span>
        </div>
        <ChevronDown size={14} className="text-[#8A92A6] group-hover:text-white ml-1" />
      </div>
    </div>
  </header>
);

function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chain');
  const [niftySpot, setNiftySpot] = useState(23456.75);
  const [bankNiftySpot, setBankNiftySpot] = useState(48123.40);
  const [legs, setLegs] = useState([
    { strike: 23500, type: 'CE', action: 'BUY', qty: 1, ltp: 145.20 },
    { strike: 23600, type: 'CE', action: 'SELL', qty: 1, ltp: 88.40 }
  ]);
  const [positions, setPositions] = useState([
    { 
      symbol: 'NIFTY', 
      strike: 23400, 
      type: 'PE', 
      qty: 1, 
      avgPrice: 122.50, 
      ltp: 128.40, 
      pnl: 295.00 
    }
  ]);

  const placeOrder = () => {
    // Simulate placing all legs as positions
    const newPositions = legs.map(leg => ({
       symbol: 'NIFTY',
       strike: leg.strike,
       type: leg.type,
       qty: leg.action === 'BUY' ? leg.qty : -leg.qty,
       avgPrice: leg.ltp,
       ltp: leg.ltp + (Math.random() - 0.5) * 5,
       pnl: (Math.random() - 0.5) * 1000
    }));
    setPositions([...positions, ...newPositions]);
    setLegs([]);
    setActiveTab('positions');
  };
  // Simulate market movement
  useEffect(() => {
    const interval = setInterval(() => {
      setNiftySpot(prev => prev + (Math.random() - 0.5) * 5);
      setBankNiftySpot(prev => prev + (Math.random() - 0.5) * 10);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addLeg = (leg) => {
    setLegs([...legs, leg]);
    setActiveTab('builder');
  };

  const removeLeg = (index) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0B1426] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#00C48C] rounded-2xl flex items-center justify-center animate-bounce mb-8 shadow-2xl shadow-[#00C48C]/30">
          <Zap size={32} className="text-[#0B1426] fill-current" />
        </div>
        <div className="w-48 h-1.5 bg-[#1F2A44] rounded-full overflow-hidden">
          <div className="h-full bg-[#00C48C] animate-shimmer" style={{ width: '40%' }} />
        </div>
        <span className="text-[#8A92A6] text-xs font-mono mt-4 tracking-widest uppercase">Initializing Sensibull Pro...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1426] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Header niftySpot={niftySpot} bankNiftySpot={bankNiftySpot} />
      
      <main className="pl-64 pt-20">
        <div className="p-8">
          {activeTab === 'chain' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Option Chain</h1>
                  <p className="text-[#8A92A6]">Live strategy analysis for <span className="text-white font-bold">NIFTY 50</span></p>
                </div>
                
                <div className="flex gap-2 p-1 bg-[#131B2F] border border-[#1F2A44] rounded-xl">
                  {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(target => (
                    <button 
                      key={target}
                      className={`px-6 py-2 font-bold rounded-lg text-sm transition-all ${
                        target === 'NIFTY' ? 'bg-[#00C48C] text-[#0B1426] shadow-lg shadow-[#00C48C]/10' : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>
              <OptionChain symbol="NIFTY" spot={23456.75} onAddLeg={addLeg} />
            </>
          )}

          {activeTab === 'builder' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Strategy Builder</h1>
                  <p className="text-[#8A92A6]">Analyze and visualize your custom strategies</p>
                </div>
              </div>
              <StrategyBuilder 
                legs={legs} 
                onRemoveLeg={removeLeg} 
                onAddLeg={() => setActiveTab('chain')} 
                onPlaceOrder={placeOrder}
                spot={niftySpot} 
              />
            </>
          )}

          {activeTab === 'positions' && (
             <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Portfolio</h1>
                  <p className="text-[#8A92A6]">Track your simulated P&L and active trades</p>
                </div>
              </div>
              <Portfolio positions={positions} />
             </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
