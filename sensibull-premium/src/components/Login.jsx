import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Smartphone, Mail, Lock } from 'lucide-react';

export const Login = ({ onLogin }) => {
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0); // H-06 fix: starts at 0, not 60
  const [error, setError] = useState('');

  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleIdentifierSubmit = (e) => {
    e.preventDefault();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\d{10}$/.test(identifier);
    if (isEmail || isPhone) {
      setStep('otp');
      setTimer(60); // Start countdown only when OTP is actually sent
      setError('');
    } else {
      setError('Please enter a valid email or 10-digit mobile number');
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    
    // Auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp === '123456') {
      onLogin();
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1426] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00C48C]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#131B2F] border border-[#1F2A44] rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-500">
        <div className="flex flex-col items-center mb-8">
           <div className="w-16 h-16 bg-[#00C48C] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00C48C]/20 mb-6">
              <ShieldCheck size={32} className="text-[#0B1426]" />
           </div>
           <h1 className="text-2xl font-bold text-white mb-2">Welcome to Sensibull</h1>
           <p className="text-[#8A92A6] text-sm text-center">Login to analyze and trade your option strategies with precision.</p>
        </div>

        {step === 'input' ? (
          <form onSubmit={handleIdentifierSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8A92A6] uppercase tracking-widest ml-1">Email or Mobile Number</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or test@example.com"
                  className="w-full bg-[#0B1426] border border-[#1F2A44] rounded-xl px-5 py-4 text-white outline-none focus:border-[#00C48C] transition-all group-hover:border-[#8A92A6]/50"
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1F2A44]">
                   {identifier.includes('@') ? <Mail size={18} /> : <Smartphone size={18} />}
                </div>
              </div>
              {error && <p className="text-[#FF4D4F] text-[10px] font-bold mt-2 ml-1 animate-pulse">{error}</p>}
            </div>

            <button 
              type="submit"
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && !/^\d{10}$/.test(identifier)}
              className="w-full bg-[#00C48C] text-[#0B1426] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#00ebd0] transition-all shadow-lg shadow-[#00C48C]/10 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              Continue
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <p className="text-sm text-[#8A92A6] mb-1">Enter the 6-digit OTP sent to</p>
              <p className="text-sm font-bold text-white">{identifier}</p>
            </div>

            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input 
                  key={idx}
                  id={`otp-${idx}`}
                  type="text" 
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-12 h-14 bg-[#0B1426] border border-[#1F2A44] rounded-xl text-center text-xl font-bold text-white outline-none focus:border-[#00C48C] transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                      document.getElementById(`otp-${idx - 1}`).focus();
                    }
                  }}
                  onPaste={(e) => {
                    // M-12: Paste handler — auto-fill all 6 digits from clipboard
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (pasted.length > 0) {
                      const newOtp = [...otp];
                      pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
                      setOtp(newOtp);
                      document.getElementById(`otp-${Math.min(pasted.length - 1, 5)}`)?.focus();
                    }
                  }}
                />
              ))}
            </div>

            {error && <p className="text-[#FF4D4F] text-xs font-bold text-center animate-shake">{error}</p>}

            <div className="flex flex-col gap-4">
              <button 
                type="submit"
                disabled={otp.join('').length < 6}
                className="w-full bg-[#00C48C] text-[#0B1426] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#00ebd0] transition-all shadow-lg shadow-[#00C48C]/10 disabled:opacity-50 group"
              >
                Verify & Login
                <Lock size={18} />
              </button>

              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] text-[#8A92A6] font-bold uppercase tracking-widest">
                  {timer > 0 ? `Resend in ${timer}s` : 'Didn\'t receive?'}
                </span>
                <button 
                  type="button"
                  disabled={timer > 0}
                  onClick={() => {
                    setTimer(60);
                    setOtp(['', '', '', '', '', '']); // H-04: clear OTP boxes on resend
                    setError('');
                    document.getElementById('otp-0')?.focus();
                  }}
                  className="text-[10px] text-[#00C48C] font-bold uppercase tracking-widest hover:underline disabled:text-[#1F2A44]"
                >
                  Resend OTP
                </button>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => { setStep('input'); setTimer(0); }}
              className="w-full text-center text-xs text-[#8A92A6] hover:text-white transition-colors"
            >
              Change Mobile/Email
            </button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-[#1F2A44]/50 text-center">
          <p className="text-[10px] text-[#1F2A44] uppercase font-bold tracking-[0.2em]">Mock Auth Service Enabled</p>
        </div>
      </div>
    </div>
  );
};
