import React, { useState, useEffect, useRef } from 'react';
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
  Zap,
  X
} from 'lucide-react';
import { OptionChain } from './components/OptionChain';
import { StrategyBuilder } from './components/StrategyBuilder';
import { Portfolio } from './components/Portfolio';
import { Login } from './components/Login';

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

// FIX BUG-4: IndexWidget now receives and displays live change derived from props
const IndexWidget = ({ name, price, change, pct }) => (
  <div className="flex items-center gap-4 px-4 py-2 bg-[#131B2F]/50 border border-[#1F2A44] rounded-lg">
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-[#8A92A6] uppercase tracking-widest">{name}</span>
      <span className="text-sm font-bold font-mono text-white">{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
    <div className={`flex flex-col items-end ${pct >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
      <span className="text-[10px] font-bold font-mono">{change > 0 ? '+' : ''}{change.toFixed(2)}</span>
      <span className="text-[10px] font-bold font-mono">{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>
    </div>
  </div>
);

const Header = ({ niftySpot, bankNiftySpot, niftyChange, niftyPct, bankNiftyChange, bankNiftyPct, onLogout, isMarketOpen }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-[#0B1426]/80 backdrop-blur-md border-b border-[#1F2A44] flex items-center justify-between px-8 z-40">
      <div className="flex items-center gap-4">
        {/* FIX BUG-4: Pass live change & pct */}
        <IndexWidget name="NIFTY 50" price={niftySpot} change={niftyChange} pct={niftyPct} />
        <IndexWidget name="BANK NIFTY" price={bankNiftySpot} change={bankNiftyChange} pct={bankNiftyPct} />
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
          <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-[#00C48C] animate-pulse' : 'bg-[#FF4D4F]'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isMarketOpen ? 'text-[#00C48C]' : 'text-[#FF4D4F]'}`}>
            {isMarketOpen ? 'Market Open' : 'Market Closed'}
          </span>
        </div>
        <button className="text-[#8A92A6] hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4D4F] rounded-full border-2 border-[#0B1426]" />
        </button>
        
        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 bg-[#131B2F] pl-2 pr-4 py-1.5 rounded-full border border-[#1F2A44] hover:border-[#8A92A6] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00C48C] to-[#008C64] flex items-center justify-center text-white font-bold text-xs">
              MU
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-none">Mihir User</span>
              <span className="text-[10px] text-[#8A92A6] leading-none mt-1">Free Plan</span>
            </div>
            <ChevronDown size={14} className={`text-[#8A92A6] group-hover:text-white ml-1 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#131B2F] border border-[#1F2A44] rounded-2xl shadow-2xl py-2 z-50">
               <button className="w-full text-left px-4 py-2 text-sm text-[#8A92A6] hover:bg-[#1F2A44] hover:text-white transition-colors">Profile Settings</button>
               <button className="w-full text-left px-4 py-2 text-sm text-[#8A92A6] hover:bg-[#1F2A44] hover:text-white transition-colors">Subscription</button>
               <div className="h-px bg-[#1F2A44] my-1" />
               <button 
                id="logout-button"
                onClick={() => { setIsProfileOpen(false); onLogout(); }}
                className="w-full text-left px-4 py-2 text-sm text-[#FF4D4F] hover:bg-[#FF4D4F]/10 transition-colors font-bold"
               >
                Logout
               </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// M-03 fixed: SettingsPanel accepts realTimeFeed from App so toggling actually pauses the sim
const SettingsPanel = ({ realTimeFeed, setRealTimeFeed }) => {
  const [paperTrading, setPaperTrading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
  <div className="flex flex-col gap-6 max-w-2xl">
    <div className="bg-[#131B2F] border border-[#1F2A44] rounded-2xl p-6">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Settings size={16} className="text-[#00C48C]" /> Simulation Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-[#1F2A44]/50">
          <div>
            <div className="text-sm font-bold text-white">Paper Trading Mode</div>
            <div className="text-[10px] text-[#8A92A6] mt-0.5">All trades are simulated. No real money involved.</div>
          </div>
          <div 
            onClick={() => setPaperTrading(!paperTrading)}
            className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${paperTrading ? 'bg-[#00C48C] justify-end' : 'bg-[#1F2A44] justify-start'}`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[#1F2A44]/50">
          <div>
            <div className="text-sm font-bold text-white">Real-time Price Feed</div>
            <div className="text-[10px] text-[#8A92A6] mt-0.5">Simulated market data engine (1s interval).</div>
          </div>
          <div 
            onClick={() => setRealTimeFeed(!realTimeFeed)}
            className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${realTimeFeed ? 'bg-[#00C48C] justify-end' : 'bg-[#1F2A44] justify-start'}`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-bold text-white">Dark Mode</div>
            <div className="text-[10px] text-[#8A92A6] mt-0.5">Optimized for low-light trading environments.</div>
          </div>
          <div 
            onClick={() => setDarkMode(!darkMode)}
            className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${darkMode ? 'bg-[#00C48C] justify-end' : 'bg-[#1F2A44] justify-start'}`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
          </div>
        </div>
      </div>
    </div>
    <div className="bg-[#131B2F] border border-[#1F2A44] rounded-2xl p-6">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-[#00C48C]" /> Account</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3 py-3 border-b border-[#1F2A44]/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00C48C] to-[#008C64] flex items-center justify-center text-white font-bold text-sm">MU</div>
          <div>
            <div className="text-sm font-bold text-white">Mihir User</div>
            <div className="text-[10px] text-[#8A92A6]">test@example.com · Free Plan</div>
          </div>
          <span className="ml-auto text-[10px] bg-[#00C48C]/10 text-[#00C48C] border border-[#00C48C]/20 px-2 py-1 rounded font-bold">KYC Verified</span>
        </div>
        <div className="text-[10px] text-[#8A92A6] pt-2">Mock Auth Service is active. All data is local and ephemeral.</div>
      </div>
    </div>
  </div>
  );
};

const NIFTY_OPEN = 23456.75;
const BANK_NIFTY_OPEN = 48123.40;

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('chain');
  const [selectedIndex, setSelectedIndex] = useState('NIFTY');
  const [niftySpot, setNiftySpot] = useState(NIFTY_OPEN);
  const [bankNiftySpot, setBankNiftySpot] = useState(BANK_NIFTY_OPEN);
  const [finniftySpot, setFinniftySpot] = useState(21500.00);
  // M-03: realTimeFeed lifted from SettingsPanel into App so the sim interval can be gated
  const [realTimeFeed, setRealTimeFeed] = useState(true);
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
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [exitedPositions, setExitedPositions] = useState([]);


  // Compute the active spot based on index selection
  const activeSpot = selectedIndex === 'NIFTY' ? niftySpot : selectedIndex === 'BANKNIFTY' ? bankNiftySpot : finniftySpot;

  // H-01: Recompute isMarketOpen every minute (not just once at render)
  const computeMarketOpen = () => {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    return day >= 1 && day <= 5 && mins >= 555 && mins < 930;
  };
  const [isMarketOpen, setIsMarketOpen] = useState(computeMarketOpen);
  useEffect(() => {
    const interval = setInterval(() => setIsMarketOpen(computeMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, []);

  // FIX BUG-4: Track live change from open price
  const niftyChange = niftySpot - NIFTY_OPEN;
  const niftyPct = (niftyChange / NIFTY_OPEN) * 100;
  const bankNiftyChange = bankNiftySpot - BANK_NIFTY_OPEN;
  const bankNiftyPct = (bankNiftyChange / BANK_NIFTY_OPEN) * 100;

  const placeOrder = () => {
    const newPositions = legs.map(leg => ({
       symbol: selectedIndex,
       strike: leg.strike,
       type: leg.type,
       qty: leg.action === 'BUY' ? leg.qty : -leg.qty,
       avgPrice: leg.ltp,
       ltp: leg.ltp,
       pnl: 0
    }));
    setPositions(prev => [...prev, ...newPositions]);
    setLegs([]);
    setActiveTab('positions');
  };

  // C-01: Pause market simulation when market is closed OR real-time feed is toggled off
  useEffect(() => {
    if (!isMarketOpen || !realTimeFeed) return; // Gate: no movement after hours
    const interval = setInterval(() => {
      setNiftySpot(prev => +(prev + (Math.random() - 0.5) * 8).toFixed(2));
      setBankNiftySpot(prev => +(prev + (Math.random() - 0.5) * 15).toFixed(2));
      setFinniftySpot(prev => +(prev + (Math.random() - 0.5) * 6).toFixed(2));
    }, 1000);
    return () => clearInterval(interval);
  }, [isMarketOpen, realTimeFeed]);

  const addLeg = (leg) => {
    setLegs(prev => [...prev, leg]);
    setActiveTab('builder');
  };

  const updateLeg = (index, updates) => {
    setLegs(prev => {
      const newLegs = [...prev];
      newLegs[index] = { ...newLegs[index], ...updates };
      return newLegs;
    });
  };

  const removeLeg = (index) => {
    setLegs(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const token = localStorage.getItem('sensibull_token');
    if (token) setIsAuthenticated(true);
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sensibull_token');
    setIsAuthenticated(false);
  };

  const handleExitPosition = (index) => {
    setPositions(prev => {
      const posToExit = prev[index];
      setRealizedPnl(r => r + posToExit.pnl);
      // M-04: Save snapshot to history
      setExitedPositions(hist => [...hist, { ...posToExit }]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // C-02: Gate P&L position updates — no LTP movement when market is closed
  useEffect(() => {
    if (!isMarketOpen || !realTimeFeed) return;
    setPositions(prev => prev.map(pos => {
      const delta = (Math.random() - 0.5) * 2;
      const newLtp = Math.max(0.05, +(pos.ltp + delta).toFixed(2));
      const newPnl = +((newLtp - pos.avgPrice) * pos.qty * 50).toFixed(2);
      return { ...pos, ltp: newLtp, pnl: newPnl };
    }));
  }, [niftySpot]); // niftySpot only changes when sim is running (gated above)

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0B1426] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-[#00C48C] rounded-2xl flex items-center justify-center animate-bounce mb-8 shadow-2xl shadow-[#00C48C]/30">
          <Zap size={32} className="text-[#0B1426] fill-current" />
        </div>
        <div className="w-48 h-1.5 bg-[#1F2A44] rounded-full overflow-hidden">
          <div className="h-full bg-[#00C48C] loading-bar" />
        </div>
        <span className="text-[#8A92A6] text-xs font-mono mt-4 tracking-widest uppercase">Initializing Sensibull Pro...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => {
      localStorage.setItem('sensibull_token', 'mock_jwt_token_12345');
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#0B1426] text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* H-02: isMarketOpen prop passed so Header badge reflects real status */}
      <Header 
        niftySpot={niftySpot} 
        bankNiftySpot={bankNiftySpot}
        niftyChange={niftyChange}
        niftyPct={niftyPct}
        bankNiftyChange={bankNiftyChange}
        bankNiftyPct={bankNiftyPct}
        onLogout={handleLogout}
        isMarketOpen={isMarketOpen}
      />
      
      <main className="pl-64 pt-20">
        <div className="p-8">
          {activeTab === 'chain' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Option Chain</h1>
                  <p className="text-[#8A92A6]">Live strategy analysis for <span className="text-white font-bold">{selectedIndex === 'NIFTY' ? 'NIFTY 50' : selectedIndex === 'BANKNIFTY' ? 'BANK NIFTY' : 'FINNIFTY'}</span></p>
                </div>
                
                <div className="flex gap-2 p-1 bg-[#131B2F] border border-[#1F2A44] rounded-xl">
                  {['NIFTY', 'BANKNIFTY', 'FINNIFTY'].map(target => (
                    <button 
                      key={target}
                      onClick={() => setSelectedIndex(target)}
                      className={`px-6 py-2 font-bold rounded-lg text-sm transition-all ${
                        selectedIndex === target ? 'bg-[#00C48C] text-[#0B1426] shadow-lg shadow-[#00C48C]/10' : 'text-[#8A92A6] hover:text-white'
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>
              <OptionChain symbol={selectedIndex} spot={activeSpot} onAddLeg={addLeg} />
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
                onUpdateLeg={updateLeg}
                onAddLeg={() => setActiveTab('chain')} 
                onPlaceOrder={placeOrder}
                spot={activeSpot}
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
              <Portfolio positions={positions} onExitPosition={handleExitPosition} realizedPnl={realizedPnl} exitedPositions={exitedPositions} />
             </>
          )}

          {/* FIX BUG-3: Show settings panel for settings tab */}
          {activeTab === 'settings' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                  <p className="text-[#8A92A6]">Manage your preferences and account</p>
                </div>
              </div>
              {/* M-03: Pass realTimeFeed state down so toggle actually connects to the sim */}
              <SettingsPanel realTimeFeed={realTimeFeed} setRealTimeFeed={setRealTimeFeed} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
