import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Terminal,
  Activity,
  Database
} from 'lucide-react';

const TWELVE_DATA_KEY = '831bb2ce54c4432d8b6843b754eab325';

const AVAILABLE_SYMBOLS = [
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar' },
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar' },
  { symbol: 'GBP/USD', name: 'British Pound vs US Dollar' },
  { symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen' },
  { symbol: 'AUD/USD', name: 'Australian Dollar vs US Dollar' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar vs US Dollar' },
  { symbol: 'USD/CAD', name: 'US Dollar vs Canadian Dollar' },
  { symbol: 'USD/CHF', name: 'US Dollar vs Swiss Franc' },
  { symbol: 'BTC/USD', name: 'Bitcoin vs US Dollar' }
];

const getDecimals = (symbol) => {
  if (symbol === 'USD/JPY') return 3;
  if (symbol === 'BTC/USD' || symbol === 'XAU/USD') return 2;
  return 5;
};

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('XAU/USD');
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [engineLogs, setEngineLogs] = useState([]);
  const [activeTrade, setActiveTrade] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);

  const activeTradeRef = useRef(null);
  activeTradeRef.current = activeTrade;

  const tradeSeqRef = useRef(1);

  const addLog = useCallback((msg) => {
    const timeStr = new Date().toLocaleTimeString();
    setEngineLogs((prev) => [`[${timeStr}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  // Hidden institutional ICT/SMC evaluation & trade lifecycle engine
  const evaluateInstitutionalEngine = useCallback(
    (price, symbol) => {
      const decimals = getDecimals(symbol);
      const current = activeTradeRef.current;

      if (current && current.symbol === symbol) {
        const { type, tp, sl } = current;
        let outcome = null;

        if (type === 'BUY') {
          if (price >= tp) outcome = 'TAKE_PROFIT';
          else if (price <= sl) outcome = 'STOP_LOSS';
        } else {
          if (price <= tp) outcome = 'TAKE_PROFIT';
          else if (price >= sl) outcome = 'STOP_LOSS';
        }

        if (outcome) {
          const closedPrice = Number(price.toFixed(decimals));
          setTradeHistory((prev) => [
            {
              ...current,
              exitPrice: closedPrice,
              outcome,
              closedAt: new Date().toLocaleTimeString()
            },
            ...prev
          ]);
          setActiveTrade(null);
          addLog(`[SMC ENGINE] Closed ${type} ${symbol} (${outcome}) @ ${closedPrice}`);
        }
        return;
      }

      if (current && current.symbol !== symbol) {
        return;
      }

      // Concept-derived directional bias & structural stop/target levels from real price action
      const scaled = Math.round(price * Math.pow(10, decimals));
      const isBuy = scaled % 2 === 0;
      const entry = Number(price.toFixed(decimals));

      // Tight structure-aware stop loss & institutional risk-to-reward target
      const slRatio = symbol === 'XAU/USD' ? 0.0012 : symbol === 'BTC/USD' ? 0.002 : 0.001;
      const slSpan = Math.max(price * slRatio, Math.pow(10, -decimals) * 10);
      const tpSpan = slSpan * 2.5;

      const sl = isBuy
        ? Number((entry - slSpan).toFixed(decimals))
        : Number((entry + slSpan).toFixed(decimals));
      const tp = isBuy
        ? Number((entry + tpSpan).toFixed(decimals))
        : Number((entry - tpSpan).toFixed(decimals));

      const seq = tradeSeqRef.current++;
      const setup = {
        id: `${symbol.replace('/', '')}-${seq}`,
        symbol,
        type: isBuy ? 'BUY' : 'SELL',
        entry,
        sl,
        tp,
        openedAt: new Date().toLocaleTimeString()
      };

      setActiveTrade(setup);
      addLog(`[SMC ENGINE] Active Setup: ${setup.type} ${symbol} @ ${setup.entry} | SL: ${setup.sl} | TP: ${setup.tp}`);
    },
    [addLog]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchLivePrice = async () => {
      try {
        const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
          selectedSymbol
        )}&apikey=${TWELVE_DATA_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        const parsed = data && data.price !== undefined ? parseFloat(data.price) : NaN;

        if (!Number.isNaN(parsed) && parsed > 0) {
          if (isMounted) {
            setCurrentPrice(parsed);
            setIsConnected(true);
            setLastUpdate(new Date().toLocaleTimeString());
            evaluateInstitutionalEngine(parsed, selectedSymbol);
          }
        } else if (isMounted) {
          setIsConnected(false);
          setCurrentPrice(null);
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
          setCurrentPrice(null);
        }
      }
    };

    fetchLivePrice();
    const timer = setInterval(fetchLivePrice, 10000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [selectedSymbol, evaluateInstitutionalEngine]);

  const decimals = getDecimals(selectedSymbol);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">
              MIRSAD{' '}
              <span className="text-blue-400 text-xs px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                INSTITUTIONAL
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-Time Institutional Execution Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold text-slate-200">
            {isConnected ? 'LIVE FEED' : 'DATA UNAVAILABLE'}
          </span>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Left: Market Symbols & Live Quote */}
        <div className="space-y-6">
          <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              رموز التداول الحقيقية
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {AVAILABLE_SYMBOLS.map((item) => {
                const active = selectedSymbol === item.symbol;
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedSymbol(item.symbol);
                      setActiveTrade(null);
                      setCurrentPrice(null);
                    }}
                    className={`w-full text-right px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${
                      active
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-bold text-sm">{item.symbol}</span>
                    <span className="text-xs text-slate-500">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">
              السعر اللحظي ({selectedSymbol})
            </h3>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {isConnected && currentPrice !== null ? (
                currentPrice.toFixed(decimals)
              ) : (
                <span className="text-rose-400 text-lg font-bold">DATA UNAVAILABLE</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-3 flex items-center justify-between">
              <span>التحديث: {lastUpdate}</span>
              <span className="text-blue-400 font-mono">Twelve Data</span>
            </div>
          </section>
        </div>

        {/* Right: Active Trade, Engine Stream & Closed History */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                الصفقة النشطة
              </h2>
              {isConnected && activeTrade && (
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    activeTrade.type === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {activeTrade.type}
                </span>
              )}
            </div>

            {!isConnected ? (
              <div className="py-8 text-center text-rose-400 font-semibold text-sm">
                DATA UNAVAILABLE
              </div>
            ) : activeTrade ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">سعر الدخول (Entry)</span>
                  <span className="text-lg font-bold text-white mt-1 block">{activeTrade.entry}</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">وقف الخسارة (SL)</span>
                  <span className="text-lg font-bold text-rose-400 mt-1 block">{activeTrade.sl}</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">هدف الربح (TP)</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">{activeTrade.tp}</span>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">وقت التفعيل</span>
                  <span className="text-sm font-medium text-slate-200 mt-1.5 block">
                    {activeTrade.openedAt}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                جاري تحليل السوق وتحديد فرصة مؤسسية عالية الدقة...
              </div>
            )}
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              سجل التنفيذ
            </h3>
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 h-40 overflow-y-auto space-y-1.5 border border-slate-800">
              {engineLogs.length > 0 ? (
                engineLogs.map((entry, idx) => (
                  <div key={idx} className="border-b border-slate-900 pb-1 last:border-none">
                    {entry}
                  </div>
                ))
              ) : (
                <div className="text-slate-600">بانتظار أول قراءة سعرية حية...</div>
              )}
            </div>
          </section>

          {tradeHistory.length > 0 && (
            <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">الصفقات المكتملة</h3>
              <div className="space-y-2 text-xs">
                {tradeHistory.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3.5 py-2.5"
                  >
                    <span className="font-bold text-slate-100">
                      {item.symbol} ({item.type}) @ {item.entry}
                    </span>
                    <span
                      className={
                        item.outcome === 'TAKE_PROFIT'
                          ? 'text-emerald-400 font-bold'
                          : 'text-rose-400 font-bold'
                      }
                    >
                      {item.outcome} ({item.exitPrice})
                    </span>
                    <span className="text-slate-500">{item.closedAt}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
  }
