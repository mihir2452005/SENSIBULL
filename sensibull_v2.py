"""
Options Strategy Builder  ·  v2  —  Beyond Sensibull
======================================================
Pure yfinance + Black-Scholes. Zero broker API needed.

New vs v1:
  • P&L vs Time Decay slider  (live payoff curve morph by DTE)
  • Greeks evolution chart     (Δ/Θ/ν vs spot price)
  • Scenario heatmap           (spot move% × IV change%)
  • Probability of Profit      (log-normal PoP)
  • Strategy Scorecard         (auto-rates your strategy)
  • Historical Backtester      (replay past date scenario)
  • OI Chart                   (CE/PE open interest by strike)
  • Position Sizing Calculator (lots from capital + risk%)
  • Export to CSV

Install:
    pip install streamlit plotly pandas numpy scipy yfinance

Run:
    streamlit run sensibull_v2.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy.stats import norm
from datetime import datetime, date, timedelta
import math, io, warnings
warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════════
# REGISTRY
# ══════════════════════════════════════════════════════════════
INDIAN = {
    "NIFTY 50":   {"yf": "^NSEI",                    "lot": 50,  "step": 50,  "ccy": "₹"},
    "BANKNIFTY":  {"yf": "^NSEBANK",                 "lot": 15,  "step": 100, "ccy": "₹"},
    "FINNIFTY":   {"yf": "NIFTY_FIN_SERVICE.NS",     "lot": 40,  "step": 50,  "ccy": "₹"},
    "MIDCPNIFTY": {"yf": "^NSEMDCP50",               "lot": 75,  "step": 25,  "ccy": "₹"},
}
US_PRESET = {
    "AAPL": {"lot": 1, "step": 2.5,  "ccy": "$"},
    "TSLA": {"lot": 1, "step": 5.0,  "ccy": "$"},
    "SPY":  {"lot": 1, "step": 1.0,  "ccy": "$"},
    "QQQ":  {"lot": 1, "step": 1.0,  "ccy": "$"},
    "NVDA": {"lot": 1, "step": 5.0,  "ccy": "$"},
    "MSFT": {"lot": 1, "step": 2.5,  "ccy": "$"},
    "AMZN": {"lot": 1, "step": 5.0,  "ccy": "$"},
}

STRATEGY_NAMES = [
    "Custom",
    "Long Call", "Long Put", "Short Call", "Short Put",
    "Long Straddle", "Short Straddle",
    "Long Strangle", "Short Strangle",
    "Bull Call Spread", "Bear Put Spread",
    "Bull Put Spread",  "Bear Call Spread",
    "Iron Condor", "Iron Butterfly",
    "Long Call Butterfly", "Long Put Butterfly",
    "Covered Call", "Protective Put",
    "Call Ratio Spread", "Put Ratio Spread",
    "Jade Lizard", "Reverse Jade Lizard",
]

# ══════════════════════════════════════════════════════════════
# DATA  (all cached)
# ══════════════════════════════════════════════════════════════
@st.cache_data(ttl=60)
def fetch_spot(yf_ticker: str) -> float:
    import yfinance as yf
    try:
        h = yf.Ticker(yf_ticker).history(period="2d")
        return float(h["Close"].iloc[-1]) if not h.empty else 100.0
    except:
        return 100.0

@st.cache_data(ttl=3600)
def fetch_iv_stats(yf_ticker: str) -> dict:
    import yfinance as yf
    try:
        h = yf.download(yf_ticker, period="1y", interval="1d",
                        progress=False, auto_adjust=True)
        if h.empty or len(h) < 60:
            return {"ivr": "N/A", "ivp": "N/A", "hv30": "N/A", "hv_df": None}
        close = h["Close"].squeeze()
        lr    = np.log(close / close.shift(1)).dropna()
        hv    = lr.rolling(30).std() * np.sqrt(252) * 100
        hv    = hv.dropna()
        cur   = float(hv.iloc[-1])
        lo, hi = float(hv.min()), float(hv.max())
        ivr  = round((cur - lo) / (hi - lo) * 100, 1) if hi != lo else 50.0
        ivp  = round(float((hv < cur).mean()) * 100, 1)
        return {"ivr": ivr, "ivp": ivp, "hv30": round(cur, 2),
                "hv_df": hv.reset_index()}
    except:
        return {"ivr": "N/A", "ivp": "N/A", "hv30": "N/A", "hv_df": None}

@st.cache_data(ttl=3600)
def fetch_hist_close(yf_ticker: str, period: str = "2y") -> pd.DataFrame:
    import yfinance as yf
    try:
        h = yf.download(yf_ticker, period=period, interval="1d",
                        progress=False, auto_adjust=True)
        return h[["Close"]].dropna() if not h.empty else pd.DataFrame()
    except:
        return pd.DataFrame()

@st.cache_data(ttl=120)
def fetch_us_chain(yf_ticker: str, expiry: str) -> pd.DataFrame:
    import yfinance as yf
    try:
        t   = yf.Ticker(yf_ticker)
        opt = t.option_chain(expiry)
        calls, puts = opt.calls.copy(), opt.puts.copy()
        calls["type"], puts["type"] = "CE", "PE"
        df = pd.concat([calls, puts], ignore_index=True)
        df = df.rename(columns={"strike": "strike", "lastPrice": "ltp",
                                 "impliedVolatility": "iv_raw",
                                 "openInterest": "oi"})
        df["iv"]  = df["iv_raw"].fillna(0) * 100
        df["ltp"] = df["ltp"].fillna(0.0)
        df["oi"]  = df["oi"].fillna(0).astype(int)
        return df[["strike", "type", "ltp", "iv", "oi"]].copy()
    except:
        return pd.DataFrame()

@st.cache_data(ttl=120)
def fetch_us_expiries(yf_ticker: str) -> list:
    import yfinance as yf
    try:
        return list(yf.Ticker(yf_ticker).options)
    except:
        return []

# ══════════════════════════════════════════════════════════════
# BLACK-SCHOLES ENGINE
# ══════════════════════════════════════════════════════════════
def bs_price(S, K, T, r, sigma, typ="CE") -> float:
    if T <= 0 or sigma <= 0:
        return max(0.0, (S - K) if typ == "CE" else (K - S))
    d1 = (math.log(S / K) + (r + .5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if typ == "CE":
        return max(0.0, S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2))
    return max(0.0, K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1))

def bs_greeks(S, K, T, r, sigma, typ="CE") -> dict:
    if T <= 0 or sigma <= 0:
        return {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0}
    d1 = (math.log(S / K) + (r + .5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    pdf_d1 = norm.pdf(d1)
    gamma  = pdf_d1 / (S * sigma * math.sqrt(T))
    vega   = S * pdf_d1 * math.sqrt(T) / 100
    if typ == "CE":
        delta = norm.cdf(d1)
        theta = (-S * pdf_d1 * sigma / (2 * math.sqrt(T))
                 - r * K * math.exp(-r * T) * norm.cdf(d2)) / 365
    else:
        delta = norm.cdf(d1) - 1
        theta = (-S * pdf_d1 * sigma / (2 * math.sqrt(T))
                 + r * K * math.exp(-r * T) * norm.cdf(-d2)) / 365
    return {"delta": round(delta, 4), "gamma": round(gamma, 6),
            "theta": round(theta, 2),  "vega":  round(vega,  4)}

def add_greeks_to_chain(df: pd.DataFrame, S, T, r=0.065) -> pd.DataFrame:
    rows = []
    for _, row in df.iterrows():
        iv = max(0.01, row.get("iv", 25.0) / 100)
        g  = bs_greeks(S, row["strike"], T, r, iv, row["type"])
        rows.append({**row.to_dict(), **g})
    return pd.DataFrame(rows)

# ══════════════════════════════════════════════════════════════
# SYNTHETIC CHAIN  (Indian / fallback)
# ══════════════════════════════════════════════════════════════
def synthetic_chain(spot, dte, hv30, step, r=0.065) -> pd.DataFrame:
    T    = max(dte, 1) / 365
    iv0  = (hv30 if isinstance(hv30, float) else 15.0) / 100
    atm  = round(spot / step) * step
    rows = []
    for i in range(-20, 21):
        s = atm + i * step
        for typ in ["CE", "PE"]:
            m    = (s - spot) / spot
            iv   = max(0.05, iv0 - 0.15 * m + 0.5 * m**2 * 3)
            ltp  = bs_price(spot, s, T, r, iv, typ)
            g    = bs_greeks(spot, s, T, r, iv, typ)
            dist = abs(m)
            oi   = int(max(100, 1_200_000 * math.exp(-60 * dist**2)
                           * (1 + np.random.uniform(-0.25, 0.25))))
            rows.append({"strike": s, "type": typ,
                         "ltp": round(ltp, 2), "iv": round(iv * 100, 2),
                         "oi": oi, **g})
    return pd.DataFrame(rows)

def synth_expiries(n=10) -> list:
    out, d = [], date.today()
    for _ in range(n):
        days = (3 - d.weekday()) % 7 or 7
        d   += timedelta(days=days)
        out.append(d.strftime("%d %b %Y"))
    return out

# ══════════════════════════════════════════════════════════════
# STRATEGY PRESETS
# ══════════════════════════════════════════════════════════════
def atm_strike(spot, strikes) -> float:
    return float(min(strikes, key=lambda x: abs(x - spot)))

def off(atm, sl, n) -> float:
    if atm not in sl: return atm
    idx = sl.index(atm)
    return sl[max(0, min(len(sl) - 1, idx + n))]

def build_preset(name, spot, chain) -> list:
    ces = sorted(chain[chain["type"] == "CE"]["strike"].tolist())
    pes = sorted(chain[chain["type"] == "PE"]["strike"].tolist())
    atm = atm_strike(spot, ces)

    def ltp(k, t):
        r = chain[(chain["strike"] == k) & (chain["type"] == t)]
        return float(r["ltp"].iloc[0]) if not r.empty else 0.0
    def iv(k, t):
        r = chain[(chain["strike"] == k) & (chain["type"] == t)]
        return float(r["iv"].iloc[0]) if not r.empty else 15.0
    def L(k, t, a, q=1):
        return {"strike": k, "type": t, "action": a, "qty": q,
                "ltp": ltp(k, t), "iv": iv(k, t)}

    c1, c2 = off(atm, ces, 1), off(atm, ces, 2)
    cm1    = off(atm, ces, -1)
    p1, p2 = off(atm, pes, -1), off(atm, pes, -2)

    P = {
        "Custom":               [],
        "Long Call":            [L(c1,  "CE","BUY")],
        "Long Put":             [L(p1,  "PE","BUY")],
        "Short Call":           [L(c1,  "CE","SELL")],
        "Short Put":            [L(p1,  "PE","SELL")],
        "Long Straddle":        [L(atm, "CE","BUY"),  L(atm,"PE","BUY")],
        "Short Straddle":       [L(atm, "CE","SELL"), L(atm,"PE","SELL")],
        "Long Strangle":        [L(c1,  "CE","BUY"),  L(p1, "PE","BUY")],
        "Short Strangle":       [L(c1,  "CE","SELL"), L(p1, "PE","SELL")],
        "Bull Call Spread":     [L(atm, "CE","BUY"),  L(c1, "CE","SELL")],
        "Bear Put Spread":      [L(atm, "PE","BUY"),  L(p1, "PE","SELL")],
        "Bull Put Spread":      [L(atm, "PE","SELL"), L(p1, "PE","BUY")],
        "Bear Call Spread":     [L(atm, "CE","SELL"), L(c1, "CE","BUY")],
        "Iron Condor":          [L(c1,  "CE","SELL"), L(c2, "CE","BUY"),
                                 L(p1,  "PE","SELL"), L(p2, "PE","BUY")],
        "Iron Butterfly":       [L(atm, "CE","SELL"), L(c1, "CE","BUY"),
                                 L(atm, "PE","SELL"), L(p1, "PE","BUY")],
        "Long Call Butterfly":  [L(cm1, "CE","BUY"),
                                 L(atm, "CE","SELL"), L(atm,"CE","SELL"),
                                 L(c1,  "CE","BUY")],
        "Long Put Butterfly":   [L(p2,  "PE","BUY"),
                                 L(p1,  "PE","SELL"), L(p1, "PE","SELL"),
                                 L(atm, "PE","BUY")],
        "Covered Call":         [L(c1,  "CE","SELL")],
        "Protective Put":       [L(atm, "PE","BUY")],
        "Call Ratio Spread":    [L(atm, "CE","BUY"),  L(c1, "CE","SELL",2)],
        "Put Ratio Spread":     [L(atm, "PE","BUY"),  L(p1, "PE","SELL",2)],
        "Jade Lizard":          [L(c1,  "CE","SELL"), L(p1, "PE","SELL"),
                                 L(p2,  "PE","BUY")],
        "Reverse Jade Lizard":  [L(p1,  "PE","BUY"),  L(c1, "CE","BUY"),
                                 L(c2,  "CE","SELL")],
    }
    return [l.copy() for l in P.get(name, [])]

# ══════════════════════════════════════════════════════════════
# PAYOFF ENGINE
# ══════════════════════════════════════════════════════════════
def payoff(legs, sr, lot) -> np.ndarray:
    pnl = np.zeros(len(sr))
    for l in legs:
        sgn = 1 if l["action"] == "BUY" else -1
        q   = l["qty"] * lot
        intr = np.maximum(sr - l["strike"], 0) if l["type"] == "CE" \
               else np.maximum(l["strike"] - sr, 0)
        pnl += sgn * (intr - l["ltp"]) * q
    return pnl

def payoff_dte(legs, sr, dte_remaining, r=0.065, lot=50) -> np.ndarray:
    """Mid-life P&L using BS theoretical value instead of intrinsic."""
    T = max(dte_remaining, 0.001) / 365
    pnl = np.zeros(len(sr))
    for l in legs:
        sgn = 1 if l["action"] == "BUY" else -1
        q   = l["qty"] * lot
        iv  = l.get("iv", 15.0) / 100 or 0.15
        theo = np.array([bs_price(s, l["strike"], T, r, iv, l["type"]) for s in sr])
        pnl += sgn * (theo - l["ltp"]) * q
    return pnl

def breakevens(pnl, sr) -> list:
    bes = []
    for i in range(len(pnl) - 1):
        if pnl[i] * pnl[i+1] < 0:
            be = sr[i] + (0 - pnl[i]) * (sr[i+1] - sr[i]) / (pnl[i+1] - pnl[i])
            bes.append(round(be, 2))
    return bes

def net_greeks(legs, spot, T, lot, r=0.065) -> dict:
    net = {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0}
    for l in legs:
        iv = max(0.01, l.get("iv", 15.0) / 100)
        g  = bs_greeks(spot, l["strike"], T, r, iv, l["type"])
        s  = (1 if l["action"] == "BUY" else -1) * l["qty"] * lot
        for k in net:
            net[k] += s * g[k]
    return {k: round(v, 4) for k, v in net.items()}

# ══════════════════════════════════════════════════════════════
# PROBABILITY OF PROFIT  (log-normal)
# ══════════════════════════════════════════════════════════════
def prob_of_profit(legs, spot, T, sigma, lot, r=0.065, n_sim=50_000) -> float:
    if T <= 0 or sigma <= 0 or not legs:
        return 0.0
    rng  = np.random.default_rng(42)
    drift = (r - 0.5 * sigma**2) * T
    sims  = spot * np.exp(drift + sigma * math.sqrt(T) * rng.standard_normal(n_sim))
    pnls  = payoff(legs, sims, lot)
    return round(float((pnls > 0).mean()) * 100, 1)

# ══════════════════════════════════════════════════════════════
# SCENARIO HEATMAP  (spot% × IV%)
# ══════════════════════════════════════════════════════════════
def scenario_matrix(legs, spot, T, r, lot) -> pd.DataFrame:
    spot_moves = [-15, -10, -7, -5, -3, 0, 3, 5, 7, 10, 15]
    iv_changes  = [-50, -30, -15, 0, 15, 30, 50]
    rows = []
    for iv_chg in iv_changes:
        row = {}
        for sm in spot_moves:
            new_spot = spot * (1 + sm / 100)
            pnl = 0.0
            for l in legs:
                iv_base = l.get("iv", 15.0) / 100 or 0.15
                iv_new  = max(0.01, iv_base * (1 + iv_chg / 100))
                theo    = bs_price(new_spot, l["strike"], T, r, iv_new, l["type"])
                sgn     = 1 if l["action"] == "BUY" else -1
                pnl    += sgn * (theo - l["ltp"]) * l["qty"] * lot
            row[f"{sm:+d}%"] = round(pnl)
        row["IV Chg"] = f"{iv_chg:+d}%"
        rows.append(row)
    df = pd.DataFrame(rows).set_index("IV Chg")
    return df

# ══════════════════════════════════════════════════════════════
# STRATEGY SCORECARD
# ══════════════════════════════════════════════════════════════
def scorecard(legs, spot, T, lot, ivr, pnl_arr, sr) -> dict:
    if not legs:
        return {}
    max_p = float(pnl_arr.max())
    max_l = float(pnl_arr.min())
    net_p = sum((1 if l["action"] == "BUY" else -1) * l["ltp"] * l["qty"] * lot for l in legs)
    ng    = net_greeks(legs, spot, T, lot)

    # Return score  (0-10)
    rr    = abs(max_p / max_l) if max_l != 0 and abs(max_l) < 9e8 and abs(max_p) < 9e8 else 5
    ret_s = min(10, round(rr * 2.5))

    # Risk score  (10 = low risk)
    max_l_abs = abs(max_l)
    risk_s = 10 if max_l_abs < 9e8 else 2
    if max_l_abs < 9e8:
        risk_s = max(1, 10 - int(max_l_abs / (spot * lot) * 20))

    # IV fit score
    if ivr == "N/A":
        iv_fit = 5
    else:
        is_buyer = sum(1 for l in legs if l["action"] == "BUY") > len(legs) / 2
        iv_fit = max(1, 10 - int(abs(ivr - (20 if is_buyer else 70)) / 8))

    # Theta score  (positive theta = good if IV is high)
    theta_s = min(10, max(1, 5 + int(ng["theta"] / (spot * lot) * 50000)))

    # Complexity  (fewer legs = simpler = 10)
    comp_s = max(1, 10 - (len(legs) - 1) * 2)

    overall = round((ret_s + risk_s + iv_fit + theta_s + comp_s) / 5, 1)
    return {
        "overall":    overall,
        "return":     ret_s,
        "risk":       risk_s,
        "iv_fit":     iv_fit,
        "theta":      theta_s,
        "simplicity": comp_s,
    }

# ══════════════════════════════════════════════════════════════
# HISTORICAL BACKTEST
# ══════════════════════════════════════════════════════════════
def backtest_strategy(legs, hist_close: pd.DataFrame,
                      entry_date_str: str, dte_at_entry: int,
                      lot: int, r: float = 0.065) -> dict:
    """
    Replay: on entry_date, price legs at BS theoretical value,
    then track daily P&L as spot moved, assuming held to expiry.
    """
    if hist_close.empty or not legs:
        return {}
    try:
        hist = hist_close.copy()
        hist.index = pd.to_datetime(hist.index)
        hist.columns = ["Close"]

        entry_date = pd.Timestamp(entry_date_str)
        expiry_date = entry_date + timedelta(days=dte_at_entry)

        # Filter to entry → expiry window
        window = hist[(hist.index >= entry_date) & (hist.index <= expiry_date)].copy()
        if len(window) < 2:
            return {"error": "Not enough data for this date range."}

        entry_spot = float(window["Close"].iloc[0])

        # Re-price legs at entry_spot using BS
        repriced = []
        for l in legs:
            scale = entry_spot / float(window["Close"].iloc[-1]) \
                    if float(window["Close"].iloc[-1]) != 0 else 1.0
            new_k = l["strike"] * scale
            iv    = l.get("iv", 15.0) / 100 or 0.15
            T0    = dte_at_entry / 365
            entry_ltp = bs_price(entry_spot, new_k, T0, r, iv, l["type"])
            repriced.append({**l, "strike": new_k, "ltp": entry_ltp})

        # Daily P&L
        daily_pnl = []
        for i, (dt, row) in enumerate(window.iterrows()):
            s     = float(row["Close"])
            days_left = max(0, (expiry_date - dt).days)
            T_now = max(0, days_left / 365)
            pnl   = 0.0
            for l in repriced:
                sgn  = 1 if l["action"] == "BUY" else -1
                iv   = l.get("iv", 0.15)
                theo = bs_price(s, l["strike"], T_now, r, iv, l["type"])
                pnl += sgn * (theo - l["ltp"]) * l["qty"] * lot
            daily_pnl.append({"date": dt, "spot": s, "pnl": round(pnl)})

        df = pd.DataFrame(daily_pnl)
        final_pnl = float(df["pnl"].iloc[-1])
        max_dd    = float((df["pnl"] - df["pnl"].cummax()).min())

        return {
            "df":       df,
            "entry_spot": entry_spot,
            "final_pnl":  final_pnl,
            "max_dd":     max_dd,
            "win":        final_pnl > 0,
        }
    except Exception as e:
        return {"error": str(e)}

# ══════════════════════════════════════════════════════════════
# CSS  (terminal-green on charcoal — Bloomberg-esque)
# ══════════════════════════════════════════════════════════════
CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Sora:wght@300;400;600;700&display=swap');

html, body, [class*="css"] { font-family:'Sora',sans-serif; }
.stApp { background:#060a0f; }
section[data-testid="stSidebar"] { background:#080d14; border-right:1px solid #0f1a26; }
.block-container { padding-top:1.2rem; }

/* Tabs */
.stTabs [data-baseweb="tab-list"] { gap:0; border-bottom:1px solid #0f1a26; background:transparent; }
.stTabs [data-baseweb="tab"] {
    font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600;
    letter-spacing:.08em; text-transform:uppercase;
    color:#2d4a66; padding:10px 20px; border:none; background:transparent;
}
.stTabs [aria-selected="true"] { color:#00d4aa !important; border-bottom:2px solid #00d4aa !important; }

/* Metric cards */
.mc {
    background:linear-gradient(135deg,#080d14 0%,#0a1019 100%);
    border:1px solid #0f1a26; border-radius:6px;
    padding:14px 18px; margin:4px 0;
}
.mc-label { color:#2d4a66; font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; }
.mc-val   { font-family:'JetBrains Mono',monospace; font-size:21px; font-weight:700; color:#e8edf2; margin-top:3px; }
.mc-val.g { color:#00d4aa; }
.mc-val.r { color:#ff4d6d; }
.mc-val.y { color:#f5a623; }

/* Score ring */
.score-ring {
    width:72px; height:72px; border-radius:50%;
    display:inline-flex; align-items:center; justify-content:center;
    font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:700;
    border:3px solid; margin:0 auto;
}

/* Greek cards */
.gcard {
    background:#080d14; border:1px solid #0f1a26; border-radius:6px;
    padding:12px 14px;
}
.gcard .gname { color:#2d4a66; font-size:10px; letter-spacing:.1em; text-transform:uppercase; }
.gcard .gval  { font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700; margin-top:4px; }

/* Leg row */
.leg-wrap { border-left:2px solid #00d4aa; padding-left:10px; margin:4px 0; }
.leg-buy  { border-left-color:#00d4aa !important; }
.leg-sell { border-left-color:#ff4d6d !important; }

/* Footer */
.footer { color:#0f1a26; font-size:11px; text-align:center; padding:16px 0 4px; }

div[data-testid="stMetricValue"] div { font-family:'JetBrains Mono',monospace !important; }
hr { border-color:#0f1a26 !important; }
</style>
"""

# ══════════════════════════════════════════════════════════════
# PLOTLY THEME
# ══════════════════════════════════════════════════════════════
PLOT_BG  = "#060a0f"
GRID_COL = "#0a1019"
FONT_COL = "#4a6a8a"
ACCENT   = "#00d4aa"
RED_COL  = "#ff4d6d"
AMBER    = "#f5a623"

def base_layout(h=420, title=""):
    return dict(
        paper_bgcolor=PLOT_BG, plot_bgcolor=PLOT_BG,
        font=dict(family="JetBrains Mono", color=FONT_COL, size=11),
        xaxis=dict(gridcolor=GRID_COL, zeroline=False, showline=False),
        yaxis=dict(gridcolor=GRID_COL, zeroline=False, showline=False),
        legend=dict(bgcolor=PLOT_BG, bordercolor="#0f1a26", borderwidth=1),
        margin=dict(t=30, b=48, l=64, r=20),
        height=h, hovermode="x unified",
        title=dict(text=title, font=dict(size=13, color="#4a6a8a")),
    )

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
def main():
    st.set_page_config(
        page_title="Options Lab", page_icon="⚡",
        layout="wide", initial_sidebar_state="expanded"
    )
    st.markdown(CSS, unsafe_allow_html=True)

    # ── Header
    st.markdown("""
    <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:2px;">
      <span style="font-family:'JetBrains Mono';font-size:20px;font-weight:700;color:#e8edf2;">
        ⚡ OPTIONS LAB
      </span>
      <span style="color:#1a2e42;font-size:12px;letter-spacing:.1em;">
        STRATEGY · ANALYTICS · BACKTEST
      </span>
    </div>""", unsafe_allow_html=True)

    # ════════════════════════════════════════════
    # SIDEBAR
    # ════════════════════════════════════════════
    with st.sidebar:
        st.markdown("### 📍 Underlying")
        market   = st.radio("Market", ["🇮🇳 Indian", "🇺🇸 US"], horizontal=True)
        is_indian = market.startswith("🇮🇳")

        if is_indian:
            sym_label = st.selectbox("Index", list(INDIAN.keys()))
            meta      = INDIAN[sym_label]
            yf_ticker = meta["yf"]
            lot_size  = meta["lot"]
            step      = meta["step"]
            ccy       = "₹"
        else:
            choices = list(US_PRESET.keys()) + ["Custom…"]
            us_sel  = st.selectbox("Ticker", choices)
            if us_sel == "Custom…":
                yf_ticker = st.text_input("Ticker symbol", "MSFT").upper().strip()
            else:
                yf_ticker = us_sel
            sym_label = yf_ticker
            lot_size  = US_PRESET.get(yf_ticker, {}).get("lot", 1)
            step      = US_PRESET.get(yf_ticker, {}).get("step", 5.0)
            ccy       = "$"

        st.caption(f"Lot size: **{lot_size}**")

        # Spot
        spot = fetch_spot(yf_ticker)

        # Expiry
        st.markdown("### 📅 Expiry")
        if is_indian:
            expiries     = synth_expiries(12)
            expiry_label = st.selectbox("Expiry date", expiries)
            try:
                exp_date = datetime.strptime(expiry_label, "%d %b %Y").date()
            except:
                exp_date = date.today() + timedelta(days=7)
        else:
            expiries = fetch_us_expiries(yf_ticker)
            if expiries:
                expiry_label = st.selectbox("Expiry date", expiries)
                try:
                    exp_date = datetime.strptime(expiry_label, "%Y-%m-%d").date()
                except:
                    exp_date = date.today() + timedelta(days=30)
            else:
                expiry_label, exp_date = None, date.today() + timedelta(days=30)
                st.warning("No expiries found.")

        dte = max(1, (exp_date - date.today()).days)
        T   = dte / 365
        r   = st.slider("Risk-free rate %", 4.0, 9.0, 6.5, 0.25) / 100

        st.metric("DTE", f"{dte} days")

        # IV Stats
        st.markdown("### 📊 Volatility")
        ivs   = fetch_iv_stats(yf_ticker)
        ivr   = ivs["ivr"]
        ivp   = ivs["ivp"]
        hv30  = ivs["hv30"]
        sigma = (hv30 if isinstance(hv30, float) else 20.0) / 100

        c1, c2 = st.columns(2)
        c1.metric("IV Rank",  f"{ivr}%" if ivr != "N/A" else "—")
        c2.metric("IV %ile",  f"{ivp}%" if ivp != "N/A" else "—")
        st.metric("30D HV", f"{hv30}%" if hv30 != "N/A" else "—")

        if ivr != "N/A":
            if   ivr > 70: st.error("🔥 High IV · Favour **selling**")
            elif ivr < 30: st.info("❄️  Low IV · Favour **buying**")
            else:          st.success("✅ Moderate IV")

        if ivs["hv_df"] is not None:
            hv_df = ivs["hv_df"].tail(252)
            hv_df.columns = ["Date", "HV"]
            fig_hv = go.Figure(go.Scatter(
                x=hv_df["Date"], y=hv_df["HV"], mode="lines",
                line=dict(color=ACCENT, width=1.2),
                fill="tozeroy", fillcolor="rgba(0,212,170,.06)"
            ))
            fig_hv.update_layout(
                height=90, margin=dict(t=0,b=0,l=0,r=0),
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(visible=False), yaxis=dict(visible=False),
                showlegend=False
            )
            st.plotly_chart(fig_hv, use_container_width=True)

    # ── Load chain
    if is_indian:
        chain = synthetic_chain(spot, dte,
                                hv30 if isinstance(hv30, float) else 15.0,
                                step, r)
    else:
        if expiry_label and expiries:
            raw = fetch_us_chain(yf_ticker, expiry_label)
            chain = add_greeks_to_chain(raw, spot, T, r) if not raw.empty \
                    else synthetic_chain(spot, dte, 25.0, step, r)
        else:
            chain = synthetic_chain(spot, dte, 25.0, step, r)

    all_strikes = sorted(chain["strike"].unique().tolist())

    # ── Spot bar
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:20px;padding:10px 0;
                border-top:1px solid #0a1019;border-bottom:1px solid #0a1019;
                margin-bottom:14px;">
      <span style="font-family:'JetBrains Mono';font-size:26px;font-weight:700;color:#e8edf2;">
        {sym_label}
      </span>
      <span style="font-family:'JetBrains Mono';font-size:22px;color:{ACCENT};">
        {ccy}{spot:,.2f}
      </span>
      <span style="color:#1a2e42;font-size:12px;">
        {expiry_label} · DTE {dte}
      </span>
    </div>""", unsafe_allow_html=True)

    # ════════════════════════════════════════════
    # STRATEGY + LEG BUILDER  (always visible)
    # ════════════════════════════════════════════
    col_strat, col_cap = st.columns([3, 1])
    with col_strat:
        strat_name = st.selectbox("Strategy", STRATEGY_NAMES, key="strat")
    with col_cap:
        capital = st.number_input(
            f"Capital ({ccy})",
            min_value=10_000, max_value=10_000_000,
            value=500_000 if is_indian else 10_000,
            step=10_000 if is_indian else 1_000,
            format="%d"
        )

    # Reset legs on strategy/symbol change
    skey = f"{strat_name}|{sym_label}|{expiry_label}"
    if st.session_state.get("_skey") != skey:
        st.session_state["_skey"] = skey
        st.session_state["legs"]  = build_preset(strat_name, spot, chain)

    legs: list = st.session_state.get("legs", [])

    # Leg action buttons
    b1, b2, b3, *_ = st.columns([1, 1, 1, 4])
    if b1.button("＋ CE", use_container_width=True):
        atm = atm_strike(spot, all_strikes)
        row = chain[(chain["strike"] == atm) & (chain["type"] == "CE")]
        legs.append({"strike": atm, "type": "CE", "action": "BUY", "qty": 1,
                     "ltp": float(row["ltp"].iloc[0]) if not row.empty else 0.0,
                     "iv":  float(row["iv"].iloc[0])  if not row.empty else 15.0})
    if b2.button("＋ PE", use_container_width=True):
        atm = atm_strike(spot, all_strikes)
        row = chain[(chain["strike"] == atm) & (chain["type"] == "PE")]
        legs.append({"strike": atm, "type": "PE", "action": "BUY", "qty": 1,
                     "ltp": float(row["ltp"].iloc[0]) if not row.empty else 0.0,
                     "iv":  float(row["iv"].iloc[0])  if not row.empty else 15.0})
    if b3.button("🗑 Clear", use_container_width=True):
        legs = []

    to_del = []
    for i, leg in enumerate(legs):
        border = "#00d4aa" if leg["action"] == "BUY" else "#ff4d6d"
        st.markdown(f'<div style="border-left:2px solid {border};padding-left:8px;margin:4px 0;">', unsafe_allow_html=True)
        c1, c2, c3, c4, c5, c6, c7 = st.columns([2.5, 1, 1.2, 0.9, 1.1, 1.1, 0.5])
        cur_idx = all_strikes.index(leg["strike"]) if leg["strike"] in all_strikes else 0
        ns = c1.selectbox("Strike",  all_strikes, index=cur_idx,    key=f"sk{i}", label_visibility="collapsed")
        nt = c2.selectbox("Type",   ["CE","PE"],  index=0 if leg["type"]=="CE" else 1, key=f"ty{i}", label_visibility="collapsed")
        na = c3.selectbox("Action", ["BUY","SELL"],index=0 if leg["action"]=="BUY" else 1, key=f"ac{i}", label_visibility="collapsed")
        nq = c4.number_input("Qty", 1, 50, leg["qty"], key=f"qy{i}", label_visibility="collapsed")
        row = chain[(chain["strike"] == ns) & (chain["type"] == nt)]
        ltp_v = float(row["ltp"].iloc[0]) if not row.empty else leg["ltp"]
        iv_v  = float(row["iv"].iloc[0])  if not row.empty else leg.get("iv", 15.0)
        col  = ACCENT if na == "SELL" else "#64748b"
        c5.markdown(f"<div style='padding:6px 0;font-family:JetBrains Mono;font-size:13px;color:{col};'>{ccy}{ltp_v:.2f}</div>", unsafe_allow_html=True)
        c6.markdown(f"<div style='padding:6px 0;font-size:12px;color:#2d4a66;'>IV {iv_v:.1f}%</div>", unsafe_allow_html=True)
        if c7.button("✕", key=f"dl{i}"):
            to_del.append(i)
        st.markdown("</div>", unsafe_allow_html=True)
        legs[i] = {"strike": ns, "type": nt, "action": na, "qty": nq, "ltp": ltp_v, "iv": iv_v}

    for idx in sorted(to_del, reverse=True):
        legs.pop(idx)
    st.session_state["legs"] = legs

    if not legs:
        st.info("👆 Choose a strategy or add legs manually.")
        return

    # ── Core calculations
    sr        = np.linspace(spot * .78, spot * 1.22, 700)
    pnl_exp   = payoff(legs, sr, lot_size)
    bes       = breakevens(pnl_exp, sr)
    max_p     = float(pnl_exp.max())
    max_l     = float(pnl_exp.min())
    net_prem  = sum((1 if l["action"]=="BUY" else -1) * l["ltp"] * l["qty"] * lot_size for l in legs)
    ng        = net_greeks(legs, spot, T, lot_size, r)
    pop       = prob_of_profit(legs, spot, T, sigma, lot_size, r)
    sc        = scorecard(legs, spot, T, lot_size, ivr, pnl_exp, sr)

    def fmt(v, prefix=""):
        if abs(v) > 9e8: return "∞"
        return f"{prefix}{abs(v):,.0f}"

    # ════════════════════════════════════════════
    # SUMMARY STRIP
    # ════════════════════════════════════════════
    st.markdown("---")
    m = st.columns(7)
    strip = [
        ("Net Premium",    f"{ccy}{abs(net_prem):,.0f}", "Credit" if net_prem < 0 else "Debit", None),
        ("Max Profit",     fmt(max_p, ccy),  "",  "g" if max_p > 0 else None),
        ("Max Loss",       fmt(max_l, ccy),  "",  "r" if max_l < 0 else None),
        ("Breakeven(s)",   " / ".join([f"{ccy}{b:,.0f}" for b in bes]) or "—", "", "y"),
        ("Risk:Reward",    f"1:{abs(max_p/max_l):.2f}" if max_l != 0 and abs(max_l) < 9e8 and abs(max_p) < 9e8 else "∞", "", None),
        ("Prob of Profit", f"{pop}%", "", "g" if pop > 60 else ("r" if pop < 40 else "y")),
        ("Score",          f"{sc.get('overall','—')}/10", "", "g" if sc.get("overall", 0) >= 7 else "y"),
    ]
    for col, (label, val, sub, cls) in zip(m, strip):
        cls_str = cls or ""
        col.markdown(f"""
        <div class="mc">
            <div class="mc-label">{label}</div>
            <div class="mc-val {cls_str}">{val}</div>
            <div style="color:#2d4a66;font-size:10px;">{sub}</div>
        </div>""", unsafe_allow_html=True)

    # ════════════════════════════════════════════
    # TABS
    # ════════════════════════════════════════════
    tabs = st.tabs([
        "📈 Payoff", "⏱ Time Decay", "🌡 Greeks", "🔥 Scenario",
        "📊 OI Chart", "🎯 Scorecard", "🕰 Backtest", "🔢 Sizing"
    ])

    # ── TAB 1 : Payoff at expiry ─────────────────
    with tabs[0]:
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=sr, y=np.maximum(pnl_exp, 0),
            fill="tozeroy", fillcolor="rgba(0,212,170,.06)",
            line=dict(width=0), showlegend=False))
        fig.add_trace(go.Scatter(x=sr, y=np.minimum(pnl_exp, 0),
            fill="tozeroy", fillcolor="rgba(255,77,109,.06)",
            line=dict(width=0), showlegend=False))
        fig.add_trace(go.Scatter(x=sr, y=pnl_exp, mode="lines",
            line=dict(color=ACCENT, width=2.5), name="P&L at expiry",
            hovertemplate=f"Spot: {ccy}%{{x:,.1f}}<br>P&L: {ccy}%{{y:,.0f}}<extra></extra>"))
        cur_pnl = float(np.interp(spot, sr, pnl_exp))
        fig.add_trace(go.Scatter(x=[spot], y=[cur_pnl], mode="markers",
            marker=dict(color=AMBER, size=9), name=f"Now {ccy}{cur_pnl:,.0f}"))
        fig.add_vline(x=spot, line_dash="dash", line_color=AMBER,
                      line_width=1.2, annotation_text=f"Spot",
                      annotation_font_color=AMBER)
        for be in bes:
            fig.add_vline(x=be, line_dash="dot", line_color="#2d4a66",
                          line_width=1,
                          annotation_text=f"{ccy}{be:,.0f}",
                          annotation_font_color="#4a6a8a",
                          annotation_position="bottom right")
        fig.add_hline(y=0, line_color="#0f1a26", line_width=1)

        # Leg strike markers
        for l in legs:
            col_ = ACCENT if l["action"] == "BUY" else RED_COL
            fig.add_vline(x=l["strike"], line_dash="dot", line_color=col_,
                          line_width=0.8, opacity=0.5)

        lay = base_layout(440)
        lay["xaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL, title=f"Spot Price ({ccy})")
        lay["yaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL, title=f"P&L ({ccy})")
        fig.update_layout(lay)
        st.plotly_chart(fig, use_container_width=True)

        # Leg details table
        leg_rows = []
        for l in legs:
            g = bs_greeks(spot, l["strike"], T, r, l.get("iv", 15.0) / 100, l["type"])
            leg_rows.append({
                "Strike": f"{ccy}{l['strike']:,.1f}", "Type": l["type"],
                "Action": l["action"], "Lots": l["qty"],
                "LTP": f"{ccy}{l['ltp']:.2f}", "IV": f"{l.get('iv',0):.1f}%",
                "Δ": f"{g['delta']:+.4f}", "Θ": f"{g['theta']:+.2f}",
                "ν": f"{g['vega']:+.4f}",  "Γ": f"{g['gamma']:+.6f}",
            })

        def color_action(row):
            c = "color: #00d4aa" if row["Action"] == "BUY" else "color: #ff4d6d"
            return [c] * len(row)

        st.dataframe(
            pd.DataFrame(leg_rows).style.apply(color_action, axis=1),
            use_container_width=True, hide_index=True
        )

        # Export
        csv_buf = io.StringIO()
        pd.DataFrame(leg_rows).to_csv(csv_buf, index=False)
        st.download_button("⬇ Export legs CSV", csv_buf.getvalue(),
                           "strategy_legs.csv", "text/csv", use_container_width=False)

    # ── TAB 2 : P&L vs Time Decay ────────────────
    with tabs[1]:
        st.markdown("#### P&L curve as time decays — drag the slider")
        dte_now = st.slider("Days to Expiry (DTE)", 0, dte, dte,
                            help="Drag left to simulate passage of time")
        show_all = st.checkbox("Overlay all DTE snapshots", value=True)

        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(x=sr, y=np.maximum(pnl_exp, 0),
            fill="tozeroy", fillcolor="rgba(0,212,170,.04)",
            line=dict(width=0), showlegend=False))
        fig2.add_trace(go.Scatter(x=sr, y=np.minimum(pnl_exp, 0),
            fill="tozeroy", fillcolor="rgba(255,77,109,.04)",
            line=dict(width=0), showlegend=False))

        # Overlay snapshots
        if show_all:
            snapshots = [int(dte * f) for f in [1.0, 0.75, 0.5, 0.25, 0.1]]
            snapshots = sorted(set(snapshots), reverse=True)
            palette   = ["#1a3a52","#1e4d6e","#246094","#2a73ba", ACCENT]
            for snap, col_ in zip(snapshots, palette):
                if snap == dte_now:
                    continue
                pnl_s = payoff_dte(legs, sr, snap, r, lot_size)
                fig2.add_trace(go.Scatter(
                    x=sr, y=pnl_s, mode="lines",
                    line=dict(color=col_, width=1, dash="dot"),
                    name=f"DTE {snap}", opacity=0.5))

        # Selected DTE
        pnl_sel = payoff_dte(legs, sr, dte_now, r, lot_size)
        bes_sel  = breakevens(pnl_sel, sr)
        cur_sel  = float(np.interp(spot, sr, pnl_sel))
        fig2.add_trace(go.Scatter(
            x=sr, y=pnl_sel, mode="lines",
            line=dict(color=ACCENT, width=3),
            name=f"DTE {dte_now} (selected)",
            hovertemplate=f"Spot: {ccy}%{{x:,.1f}}<br>P&L: {ccy}%{{y:,.0f}}<extra></extra>"))
        fig2.add_vline(x=spot, line_dash="dash", line_color=AMBER, line_width=1.2)
        for be in bes_sel:
            fig2.add_vline(x=be, line_dash="dot", line_color="#2d4a66", line_width=1)
        fig2.add_hline(y=0, line_color="#0f1a26", line_width=1)

        lay2 = base_layout(440)
        lay2["xaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL, title=f"Spot ({ccy})")
        lay2["yaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL, title=f"P&L ({ccy})")
        fig2.update_layout(lay2)
        st.plotly_chart(fig2, use_container_width=True)

        # Theta bleed table
        theta_rows = []
        for d in range(dte, -1, -max(1, dte // 10)):
            p = payoff_dte(legs, np.array([spot]), d, r, lot_size)[0]
            theta_rows.append({"DTE": d, "P&L at Spot": f"{ccy}{p:,.0f}"})
        st.markdown("**Daily theta bleed at current spot:**")
        st.dataframe(pd.DataFrame(theta_rows), use_container_width=False,
                     hide_index=True, height=200)

    # ── TAB 3 : Greeks ───────────────────────────
    with tabs[2]:
        # Portfolio Greeks
        gc1, gc2, gc3, gc4 = st.columns(4)
        def gcard(col, sym, name, val, desc):
            c = "#00d4aa" if val > 0 else "#ff4d6d" if val < 0 else "#4a6a8a"
            col.markdown(f"""<div class="gcard">
                <div class="gname">{sym} {name}</div>
                <div class="gval" style="color:{c};">{val:+,.4f}</div>
                <div style="color:#1a2e42;font-size:10px;margin-top:3px;">{desc}</div>
            </div>""", unsafe_allow_html=True)

        gcard(gc1, "Δ", "Delta", ng["delta"], "Per unit spot move")
        gcard(gc2, "Γ", "Gamma", ng["gamma"], "Delta acceleration")
        gcard(gc3, "Θ", "Theta", ng["theta"], f"{ccy}/day time decay")
        gcard(gc4, "ν", "Vega",  ng["vega"],  "Per 1% IV move")

        # Greeks vs Spot chart
        st.markdown("#### Greeks across spot prices")
        greek_choice = st.multiselect("Show", ["Delta","Gamma","Theta","Vega"],
                                       default=["Delta","Theta"])
        key_map = {"Delta":"delta","Gamma":"gamma","Theta":"theta","Vega":"vega"}
        colors_ = {"Delta": ACCENT, "Gamma": "#a78bfa",
                   "Theta": RED_COL, "Vega": AMBER}

        fig3 = make_subplots(specs=[[{"secondary_y": True}]])
        for i, gname in enumerate(greek_choice):
            gkey = key_map[gname]
            g_vals = []
            for s in sr:
                t_ng = {k: 0.0 for k in ["delta","gamma","theta","vega"]}
                for l in legs:
                    iv_ = max(0.01, l.get("iv", 15.0) / 100)
                    g_  = bs_greeks(s, l["strike"], T, r, iv_, l["type"])
                    sgn = (1 if l["action"] == "BUY" else -1) * l["qty"] * lot_size
                    for k in t_ng:
                        t_ng[k] += sgn * g_[k]
                g_vals.append(t_ng[gkey])

            sec = i > 0
            fig3.add_trace(go.Scatter(
                x=sr, y=g_vals, mode="lines", name=gname,
                line=dict(color=colors_[gname], width=2),
                hovertemplate=f"Spot: {ccy}%{{x:,.1f}}<br>{gname}: %{{y:,.4f}}<extra></extra>"
            ), secondary_y=sec)

        fig3.add_vline(x=spot, line_dash="dash", line_color=AMBER, line_width=1.2)
        fig3.add_hline(y=0, line_color="#0f1a26", line_width=1)
        lay3 = base_layout(400)
        lay3["xaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL)
        fig3.update_layout(lay3)
        st.plotly_chart(fig3, use_container_width=True)

    # ── TAB 4 : Scenario Heatmap ─────────────────
    with tabs[3]:
        st.markdown("#### P&L Scenario Matrix  (Spot move × IV change)")
        scen = scenario_matrix(legs, spot, T, r, lot_size)

        # Build heatmap
        z_vals = scen.values.astype(float)
        fig4 = go.Figure(go.Heatmap(
            z=z_vals, x=scen.columns.tolist(), y=scen.index.tolist(),
            colorscale=[[0, "#7f0020"], [0.5, "#0f1a26"], [1, "#004d3a"]],
            zmid=0,
            text=[[f"{ccy}{v:,.0f}" for v in row] for row in z_vals],
            texttemplate="%{text}",
            textfont=dict(family="JetBrains Mono", size=11),
            hovertemplate="IV: %{y}<br>Spot: %{x}<br>P&L: %{text}<extra></extra>",
            showscale=True,
            colorbar=dict(tickfont=dict(color=FONT_COL))
        ))
        lay4 = base_layout(380, "")
        lay4["xaxis"].update(gridcolor=GRID_COL, title="Spot Move")
        lay4["yaxis"].update(gridcolor=GRID_COL, title="IV Change")
        fig4.update_layout(lay4)
        st.plotly_chart(fig4, use_container_width=True)

        # Dataframe view
        with st.expander("Raw table"):
            st.dataframe(scen, use_container_width=True)

    # ── TAB 5 : OI Chart ─────────────────────────
    with tabs[4]:
        st.markdown("#### Open Interest by Strike")
        atm_s = atm_strike(spot, all_strikes)
        oi_range = 12
        atm_idx  = all_strikes.index(atm_s) if atm_s in all_strikes else len(all_strikes)//2
        vis_strikes = all_strikes[max(0, atm_idx - oi_range): atm_idx + oi_range + 1]

        ce_oi = chain[(chain["type"] == "CE") & (chain["strike"].isin(vis_strikes))]
        pe_oi = chain[(chain["type"] == "PE") & (chain["strike"].isin(vis_strikes))]

        fig5 = go.Figure()
        fig5.add_trace(go.Bar(x=ce_oi["strike"], y=ce_oi["oi"],
            name="CE OI", marker_color=ACCENT, opacity=0.8))
        fig5.add_trace(go.Bar(x=pe_oi["strike"], y=pe_oi["oi"],
            name="PE OI", marker_color=RED_COL, opacity=0.8))
        fig5.add_vline(x=spot, line_dash="dash", line_color=AMBER, line_width=1.5,
                       annotation_text="Spot", annotation_font_color=AMBER)
        # Strike from legs
        for l in legs:
            c_ = ACCENT if l["type"] == "CE" else RED_COL
            fig5.add_vline(x=l["strike"], line_dash="dot", line_color=c_,
                           line_width=1, opacity=0.7)
        lay5 = base_layout(420)
        lay5["xaxis"].update(tickprefix=ccy, tickformat=",", gridcolor=GRID_COL, title=f"Strike ({ccy})")
        lay5["yaxis"].update(tickformat=",", gridcolor=GRID_COL, title="Open Interest")
        fig5.update_layout(lay5, barmode="group")
        st.plotly_chart(fig5, use_container_width=True)

        # PCR
        total_ce_oi = int(chain[chain["type"] == "CE"]["oi"].sum())
        total_pe_oi = int(chain[chain["type"] == "PE"]["oi"].sum())
        pcr = round(total_pe_oi / total_ce_oi, 3) if total_ce_oi else 0
        c1, c2, c3 = st.columns(3)
        c1.metric("Total CE OI", f"{total_ce_oi:,}")
        c2.metric("Total PE OI", f"{total_pe_oi:,}")
        c3.metric("PCR (PE/CE)", pcr,
                  delta="Bearish" if pcr > 1.2 else ("Bullish" if pcr < 0.8 else "Neutral"),
                  delta_color="inverse" if pcr > 1.2 else "normal")

    # ── TAB 6 : Scorecard ────────────────────────
    with tabs[5]:
        st.markdown("#### Strategy Scorecard")
        if not sc:
            st.info("No legs to score.")
        else:
            overall = sc.get("overall", 0)
            ring_col = "#00d4aa" if overall >= 7 else "#f5a623" if overall >= 5 else "#ff4d6d"
            st.markdown(f"""
            <div style="text-align:center;padding:20px 0;">
              <div class="score-ring" style="border-color:{ring_col};color:{ring_col};
                   width:90px;height:90px;font-size:28px;display:inline-flex;
                   align-items:center;justify-content:center;border-radius:50%;
                   border:3px solid;">
                {overall}
              </div>
              <div style="color:#2d4a66;font-size:13px;margin-top:8px;">Overall Score / 10</div>
            </div>""", unsafe_allow_html=True)

            dims = [
                ("Return Potential", sc["return"],     "Based on risk:reward ratio"),
                ("Risk Management",  sc["risk"],       "Defined-risk strategies score higher"),
                ("IV Fit",           sc["iv_fit"],     "How well strategy suits current IV environment"),
                ("Theta Profile",    sc["theta"],      "Positive theta = time is on your side"),
                ("Simplicity",       sc["simplicity"], "Fewer legs = easier to manage"),
            ]
            for name, val, desc in dims:
                pct  = val / 10
                col_ = "#00d4aa" if val >= 7 else "#f5a623" if val >= 5 else "#ff4d6d"
                st.markdown(f"""
                <div style="margin:8px 0;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="font-size:12px;color:#4a6a8a;">{name}</span>
                    <span style="font-family:'JetBrains Mono';font-size:12px;color:{col_};">{val}/10</span>
                  </div>
                  <div style="background:#0a1019;border-radius:3px;height:6px;">
                    <div style="background:{col_};width:{pct*100:.0f}%;height:6px;border-radius:3px;
                                transition:width .5s ease;"></div>
                  </div>
                  <div style="font-size:10px;color:#1a2e42;margin-top:2px;">{desc}</div>
                </div>""", unsafe_allow_html=True)

            # Natural language verdict
            st.markdown("---")
            msgs = []
            is_buyer = sum(1 for l in legs if l["action"] == "BUY") > len(legs) / 2
            if ivr != "N/A":
                if ivr > 70 and is_buyer:
                    msgs.append("⚠️ **IV is high** — you're buying expensive options. Consider selling strategies.")
                elif ivr < 30 and not is_buyer:
                    msgs.append("⚠️ **IV is low** — you're selling cheap options. Buyers have an edge here.")
                else:
                    msgs.append(f"✅ IV Rank {ivr}% fits a {'buying' if is_buyer else 'selling'} strategy.")
            if ng["theta"] < 0:
                msgs.append(f"⏱ Theta is **negative** ({ng['theta']:+.2f}) — time works against you.")
            else:
                msgs.append(f"⏱ Theta is **positive** ({ng['theta']:+.2f}) — time decay works in your favour.")
            if abs(max_l) < 9e8:
                msgs.append(f"🛡 Risk is **defined** at max {ccy}{abs(max_l):,.0f}.")
            else:
                msgs.append("🚨 **Unlimited risk** strategy — use with caution.")
            for msg in msgs:
                st.markdown(msg)

    # ── TAB 7 : Historical Backtest ──────────────
    with tabs[6]:
        st.markdown("#### Historical Strategy Replay")
        st.caption("Reprices your strategy at a past date and tracks daily P&L through to expiry.")

        hist_df = fetch_hist_close(yf_ticker, "2y")
        if hist_df.empty:
            st.warning("Could not load historical data.")
        else:
            hist_df.index = pd.to_datetime(hist_df.index)
            min_date = hist_df.index.min().date()
            max_date = (hist_df.index.max() - timedelta(days=7)).date()

            bc1, bc2, bc3 = st.columns(3)
            entry_date = bc1.date_input("Entry date", max_date - timedelta(days=30),
                                         min_value=min_date, max_value=max_date)
            bt_dte     = bc2.number_input("DTE at entry", 5, 60, 14)
            run_bt     = bc3.button("▶ Run Backtest", use_container_width=True)

            if run_bt or st.session_state.get("_bt_ran"):
                st.session_state["_bt_ran"] = True
                with st.spinner("Running backtest…"):
                    res = backtest_strategy(legs, hist_df, str(entry_date),
                                            bt_dte, lot_size, r)

                if "error" in res:
                    st.error(res["error"])
                elif "df" in res:
                    df_bt = res["df"]
                    final = res["final_pnl"]
                    mdd   = res["max_dd"]
                    win   = res["win"]
                    es    = res["entry_spot"]

                    r1, r2, r3, r4 = st.columns(4)
                    r1.metric("Entry Spot",  f"{ccy}{es:,.2f}")
                    r2.metric("Final P&L",   f"{ccy}{final:,.0f}",
                              delta="WIN ✓" if win else "LOSS ✗",
                              delta_color="normal" if win else "inverse")
                    r3.metric("Max Drawdown", f"{ccy}{abs(mdd):,.0f}",
                              delta_color="inverse")
                    r4.metric("Hold Days", len(df_bt))

                    fig7 = make_subplots(rows=2, cols=1, shared_xaxes=True,
                                         row_heights=[0.6, 0.4],
                                         vertical_spacing=0.04)
                    pnl_col = [ACCENT if v >= 0 else RED_COL for v in df_bt["pnl"]]
                    fig7.add_trace(go.Bar(
                        x=df_bt["date"], y=df_bt["pnl"], name="Daily P&L",
                        marker_color=pnl_col, opacity=0.85
                    ), row=1, col=1)
                    # Cumulative
                    fig7.add_trace(go.Scatter(
                        x=df_bt["date"], y=df_bt["pnl"].cumsum(),
                        mode="lines", line=dict(color=AMBER, width=2),
                        name="Cumulative P&L"
                    ), row=1, col=1)
                    # Spot price
                    fig7.add_trace(go.Scatter(
                        x=df_bt["date"], y=df_bt["spot"],
                        mode="lines", line=dict(color="#4a6a8a", width=1.5),
                        name="Spot Price"
                    ), row=2, col=1)
                    lay7 = base_layout(440)
                    fig7.update_layout(lay7)
                    fig7.update_yaxes(gridcolor=GRID_COL)
                    fig7.update_xaxes(gridcolor=GRID_COL)
                    st.plotly_chart(fig7, use_container_width=True)

    # ── TAB 8 : Position Sizing ──────────────────
    with tabs[7]:
        st.markdown("#### Position Sizing Calculator")

        ps1, ps2 = st.columns(2)
        risk_pct  = ps1.slider("Max risk per trade (%)", 0.5, 10.0, 2.0, 0.5)
        target_rr = ps2.slider("Target R:R ratio", 0.5, 5.0, 1.5, 0.25)

        max_risk_capital = capital * risk_pct / 100
        max_loss_per_lot = abs(max_l) / max(1, sum(l["qty"] for l in legs))

        if max_loss_per_lot > 0 and abs(max_l) < 9e8:
            suggested_lots = max(1, int(max_risk_capital / max_loss_per_lot))
            suggested_capital = suggested_lots * lot_size * \
                sum(l["ltp"] * l["qty"] for l in legs if l["action"] == "BUY")
            target_profit = suggested_lots * abs(max_l) / lot_size * target_rr * lot_size

            s1, s2, s3, s4 = st.columns(4)
            s1.metric("Capital",          f"{ccy}{capital:,.0f}")
            s2.metric("Max Risk Budget",  f"{ccy}{max_risk_capital:,.0f}", f"{risk_pct}%")
            s3.metric("Suggested Lots",   suggested_lots)
            s4.metric("Target Profit",    f"{ccy}{target_profit:,.0f}",
                      delta=f"R:R {target_rr}x")

            # Risk ladder table
            st.markdown("##### Risk ladder")
            rows_ = []
            for lots in [1, 2, 5, suggested_lots, suggested_lots * 2]:
                ml   = abs(max_l) / max(1, sum(l["qty"] for l in legs)) * lots
                mp   = abs(max_p) / max(1, sum(l["qty"] for l in legs)) * lots if abs(max_p) < 9e8 else float("inf")
                rows_.append({
                    "Lots": lots,
                    f"Max Loss ({ccy})":   f"{ccy}{ml:,.0f}",
                    f"Max Profit ({ccy})": f"{ccy}{mp:,.0f}" if mp < 9e8 else "∞",
                    "% of Capital":       f"{ml / capital * 100:.1f}%",
                    "Recommended":        "✅" if lots == suggested_lots else "",
                })
            st.dataframe(pd.DataFrame(rows_), use_container_width=True, hide_index=True)

        else:
            st.warning("Unlimited risk strategy — position sizing based on premium only.")
            prem_per_lot = abs(net_prem) / max(1, sum(l["qty"] for l in legs))
            lots_by_prem = max(1, int(max_risk_capital / prem_per_lot)) if prem_per_lot else 1
            st.metric("Lots by premium risk", lots_by_prem)

        # Option chain expander
        with st.expander("📋 Full Option Chain"):
            atm_s = atm_strike(spot, all_strikes)
            ce_ = chain[chain["type"]=="CE"][["strike","ltp","iv","oi","delta","theta","vega"]] \
                    .rename(columns={"ltp":"CE LTP","iv":"CE IV%","oi":"CE OI",
                                     "delta":"CE Δ","theta":"CE Θ","vega":"CE ν"})
            pe_ = chain[chain["type"]=="PE"][["strike","ltp","iv","oi","delta","theta","vega"]] \
                    .rename(columns={"ltp":"PE LTP","iv":"PE IV%","oi":"PE OI",
                                     "delta":"PE Δ","theta":"PE Θ","vega":"PE ν"})
            merged_ = pd.merge(ce_, pe_, on="strike").sort_values("strike")
            def hl_atm(row):
                return ["background-color:#0a1a2a"] * len(row) \
                        if row["strike"] == atm_s else [""] * len(row)
            st.dataframe(merged_.style.apply(hl_atm, axis=1),
                         use_container_width=True, height=380, hide_index=True)

    # Footer
    st.markdown("""<div class="footer">
    For educational / paper trading only · Indian chains are synthetic (Black-Scholes + vol smile)
    · US chains use live yfinance data · Not financial advice
    </div>""", unsafe_allow_html=True)


if __name__ == "__main__":
    main()
