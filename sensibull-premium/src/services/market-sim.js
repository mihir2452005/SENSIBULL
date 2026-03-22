/**
 * Black-Scholes and Market Simulation Service
 */

export const calculateGreeks = (S, K, T, r, sigma, type = 'CE') => {
  if (T <= 0 || sigma <= 0) {
    return {
      delta: type === 'CE' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      price: Math.max(0, type === 'CE' ? S - K : K - S)
    };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const n = (x) => {
    const a1 = 0.309815355;
    const a2 = -0.160100306;
    const a3 = 0.650303548;
    const a4 = -1.121795567;
    const a5 = 0.771123204;
    const b1 = 0.000000038;
    const b2 = 0.000327762;
    const b3 = -0.000036145;
    const b4 = -0.000032520;
    const b5 = 0.000014925;
    const b6 = 0.000004793;
    const b7 = -0.000019160;
    const b8 = 0.000005167;
    const b9 = 0.000001906;

    const e = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    if (x >= 0) {
      const t = 1 / (1 + 0.2316419 * x);
      return 1 - e * ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
    } else {
      const t = 1 / (1 - 0.2316419 * x);
      return e * ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
    }
  };

  const nd1 = n(d1);
  const nd2 = n(d2);
  const npd1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);

  const price = type === 'CE' 
    ? S * nd1 - K * Math.exp(-r * T) * nd2 
    : K * Math.exp(-r * T) * n(-d2) - S * n(-d1);

  const delta = type === 'CE' ? nd1 : nd1 - 1;
  const gamma = npd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * npd1 * Math.sqrt(T)) / 100;
  const theta = (-(S * npd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * (type === 'CE' ? nd2 : n(-d2))) / 365;

  return {
    price: Math.max(0.05, price),
    delta,
    gamma,
    theta,
    vega
  };
};

export const generateOptionChain = (spot, step = 50, range = 20) => {
  // H-06: Dynamically find the next weekly expiry (Thursday for NIFTY)
  const getNextExpiry = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 4=Thu
    const daysToThursday = (4 - day + 7) % 7 || 7; // days until next Thursday (never 0)
    const expiry = new Date(now);
    expiry.setDate(now.getDate() + daysToThursday);
    expiry.setHours(15, 30, 0, 0); // 3:30 PM IST
    return expiry;
  };
  const EXPIRY_DATE = getNextExpiry();
  const now = new Date();
  const dte = Math.max(0.5, (EXPIRY_DATE - now) / (1000 * 60 * 60 * 24));
  const T = dte / 365;
  const r = 0.07;
  const atmBase = Math.round(spot / step) * step;
  const chain = [];

  for (let i = -range; i <= range; i++) {
    const strike = atmBase + i * step;
    const dist = Math.abs(strike - spot) / spot;
    const iv = 15 + dist * 100 * 0.5; // Simple skew simulation

    const ce = calculateGreeks(spot, strike, T, r, iv / 100, 'CE');
    const pe = calculateGreeks(spot, strike, T, r, iv / 100, 'PE');

    chain.push({
      strike,
      ce: {
        ltp: ce.price,
        change: +((strike % 73) / 10 - 4).toFixed(2),
        // L-02: OI with slight skew (PCR ~1.15 near ATM, lower far OTM)
        oi: Math.floor(1000000 * Math.exp(-15 * dist) * (1 + dist * 0.1)),
        iv: iv,
        ...ce
      },
      pe: {
        ltp: pe.price,
        change: +((strike % 61) / 10 - 3).toFixed(2),
        // L-02: PE OI slightly higher than CE (reflects typical put-call ratio > 1)
        oi: Math.floor(1000000 * Math.exp(-15 * dist) * 1.15 * (1 - dist * 0.05)),
        iv: iv,
        ...pe
      }
    });
  }

  return chain;
};
