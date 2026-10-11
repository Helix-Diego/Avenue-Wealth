import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  ExternalLink, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Globe, 
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Edit3,
  X,
  Zap,
  Calendar,
  Sparkles,
  Target,
  Calculator,
  Sliders,
  AlertCircle,
  ArrowRight,
  Check,
  Award,
  Layers,
  BarChart2,
  HelpCircle,
  Search,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

export default function PortfolioView({ 
  portfolio, 
  summary,
  darkMode,
  onSyncSheets, 
  onOpenMsciModal,
  onOpenContributionModal,
  onRefreshPortfolio,
  setActiveTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'habits_goals' | 'simulation'
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [expandedFundIsins, setExpandedFundIsins] = useState({});
  const [editingAccount, setEditingAccount] = useState(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  // Add Fund Modal State
  const [isAddFundModalOpen, setIsAddFundModalOpen] = useState(false);
  const [newFundIsin, setNewFundIsin] = useState('');
  const [newFundName, setNewFundName] = useState('');
  const [newFundNav, setNewFundNav] = useState('');
  const [lookingUpFund, setLookingUpFund] = useState(false);
  const [savingFund, setSavingFund] = useState(false);
  const [fundLookupNotice, setFundLookupNotice] = useState(null);

  // Add Stock Modal State
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState([]);
  const [searchingStocks, setSearchingStocks] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState('');
  const [selectedStockName, setSelectedStockName] = useState('');
  const [stockShares, setStockShares] = useState('');
  const [stockAvgPrice, setStockAvgPrice] = useState('');
  const [stockCurrency, setStockCurrency] = useState('USD');
  const [currentMarketQuote, setCurrentMarketQuote] = useState(null);
  const [savingStock, setSavingStock] = useState(false);

  // Live stock debounced search effect
  useEffect(() => {
    if (!stockSearchQuery.trim()) {
      setStockSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStocks(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(stockSearchQuery.trim())}`);
        const data = await res.json();
        setStockSearchResults(data.results || []);
      } catch (err) {
        console.error('Error searching stocks with Finnhub:', err);
      } finally {
        setSearchingStocks(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [stockSearchQuery]);

  const handleSelectStock = async (item) => {
    setSelectedStockSymbol(item.symbol);
    setSelectedStockName(item.description);
    setStockSearchQuery('');
    setStockSearchResults([]);
    try {
      const res = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(item.symbol)}`);
      const q = await res.json();
      setCurrentMarketQuote(q);
      if (q.price && !stockAvgPrice) {
        setStockAvgPrice(q.price.toString());
      }
    } catch (err) {
      console.error('Error fetching stock quote:', err);
    }
  };

  const handleSaveStock = async (e) => {
    e?.preventDefault();
    if (!selectedStockSymbol) return;
    setSavingStock(true);
    try {
      await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStockSymbol,
          name: selectedStockName,
          shares: parseFloat(stockShares) || 0,
          avg_price: parseFloat(stockAvgPrice) || 0,
          currency: stockCurrency
        })
      });
      setIsAddStockModalOpen(false);
      setSelectedStockSymbol('');
      setSelectedStockName('');
      setStockShares('');
      setStockAvgPrice('');
      setCurrentMarketQuote(null);
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error saving stock holding:', err);
    } finally {
      setSavingStock(false);
    }
  };

  const handleDeleteStock = async (symbol) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la posición en ${symbol}?`)) return;
    try {
      await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error deleting stock holding:', err);
    }
  };

  const handleLookupFund = async () => {
    if (!newFundIsin.trim()) return;
    setLookingUpFund(true);
    setFundLookupNotice(null);
    try {
      const res = await fetch(`/api/portfolio/funds/lookup?isin=${encodeURIComponent(newFundIsin.trim())}`);
      const data = await res.json();
      if (data) {
        if (data.name) setNewFundName(data.name);
        if (data.nav) setNewFundNav(data.nav.toString());
        setFundLookupNotice(`Cotización obtenida en tiempo real (NAV: ${data.nav || 0} €)`);
      }
    } catch (err) {
      console.error('Error looking up fund:', err);
      setFundLookupNotice('No se localizó automáticamente. Rellena el nombre y NAV manualmente.');
    } finally {
      setLookingUpFund(false);
    }
  };

  const handleSaveFund = async (e) => {
    e?.preventDefault();
    if (!newFundIsin.trim()) return;
    setSavingFund(true);
    try {
      await fetch('/api/portfolio/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isin: newFundIsin.trim().toUpperCase(),
          name: newFundName.trim() || `Fondo ${newFundIsin.trim().toUpperCase()}`,
          latest_nav: parseFloat(newFundNav) || 0.0,
          currency: 'EUR'
        })
      });
      setIsAddFundModalOpen(false);
      setNewFundIsin('');
      setNewFundName('');
      setNewFundNav('');
      setFundLookupNotice(null);
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error saving fund:', err);
    } finally {
      setSavingFund(false);
    }
  };

  const handleDeleteFund = async (isin) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el fondo ${isin} y su historial de aportaciones?`)) return;
    try {
      await fetch(`/api/portfolio/funds/${encodeURIComponent(isin)}`, { method: 'DELETE' });
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error deleting fund:', err);
    }
  };

  const handleDeleteFundContribution = async (contribId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta aportación?')) return;
    try {
      await fetch(`/api/portfolio/funds/contributions/${contribId}`, { method: 'DELETE' });
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error deleting contribution:', err);
    }
  };

  const handleRefreshLivePrices = async () => {
    setRefreshingLive(true);
    try {
      await Promise.all([
        fetch('/api/stocks/refresh', { method: 'POST' }),
        fetch('/api/portfolio/funds/refresh-all', { method: 'POST' })
      ]);
      if (onRefreshPortfolio) await onRefreshPortfolio();
    } catch (err) {
      console.error('Error refreshing live quotes:', err);
    } finally {
      setRefreshingLive(false);
    }
  };

  // -------------------------------------------------------------
  // Mutual Funds Compound Interest Simulator State
  // -------------------------------------------------------------
  const [monthlyContribution, setMonthlyContribution] = useState(300);
  const [annualReturnRate, setAnnualReturnRate] = useState(7.5);
  const [selectedFundIsinForSim, setSelectedFundIsinForSim] = useState('');

  // -------------------------------------------------------------
  // Goals & Habits Adaptation Engine State
  // -------------------------------------------------------------
  const [habitsData, setHabitsData] = useState(null);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [targetCapital, setTargetCapital] = useState(30000);
  const [targetMonths, setTargetMonths] = useState(12);
  const [categoryReductions, setCategoryReductions] = useState({
    'Restaurantes': 30,
    'Otras compras': 35,
    'Servicios/Suscripciones': 25,
    'Compra Ropa': 30,
    'Entretenimiento': 25,
    'Gastos Viajes': 20
  });

  useEffect(() => {
    setLoadingHabits(true);
    fetch('/api/forecast/habits-and-goals')
      .then(res => res.json())
      .then(data => {
        setHabitsData(data);
        if (data?.current_capital && targetCapital <= data.current_capital) {
          setTargetCapital(Math.ceil((data.current_capital + 5000) / 5000) * 5000);
        }
      })
      .catch(err => console.error('Error fetching habits & goals:', err))
      .finally(() => setLoadingHabits(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await onSyncSheets();
    setSyncing(false);
  };

  const handleOpenEdit = (acc) => {
    setEditingAccount(acc);
    setNewBalanceInput(acc.current_balance !== undefined ? String(acc.current_balance) : '0');
  };

  const handleSaveBalance = async (e) => {
    e?.preventDefault();
    if (!editingAccount) return;
    setSavingBalance(true);
    try {
      await fetch('/api/accounts/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: editingAccount.account_name,
          balance: parseFloat(newBalanceInput) || 0.0,
          notes: 'Ajuste manual de saldo'
        })
      });
      if (onRefreshPortfolio) {
        await onRefreshPortfolio();
      }
      setEditingAccount(null);
    } catch (err) {
      console.error('Error saving balance:', err);
    } finally {
      setSavingBalance(false);
    }
  };

  // Compound Interest Simulation calculations (15 years)
  const userFunds = Array.isArray(portfolio?.funds) ? portfolio.funds : [];
  const hasUserFunds = userFunds.length > 0;
  const activeFundForSim = userFunds.find(f => f.isin === selectedFundIsinForSim) || userFunds[0] || null;

  const simulationProjection = useMemo(() => {
    const currentFundValue = activeFundForSim ? Number(activeFundForSim.total_value_eur || 0) : 0;
    const r = (annualReturnRate / 100) / 12;
    const points = [];

    let totalInvested = currentFundValue;
    let portfolioValue = currentFundValue;

    points.push({
      year: 'Hoy',
      invested: Math.round(totalInvested),
      interest: 0,
      total: Math.round(portfolioValue)
    });

    for (let yr = 1; yr <= 15; yr++) {
      for (let m = 1; m <= 12; m++) {
        portfolioValue = (portfolioValue + monthlyContribution) * (1 + r);
        totalInvested += monthlyContribution;
      }
      const interestEarned = Math.max(0, portfolioValue - totalInvested);
      points.push({
        year: `Año ${yr}`,
        invested: Math.round(totalInvested),
        interest: Math.round(interestEarned),
        total: Math.round(portfolioValue)
      });
    }

    const yr5 = points[5] || { total: 0, invested: 0, interest: 0 };
    const yr10 = points[10] || { total: 0, invested: 0, interest: 0 };
    const yr15 = points[15] || { total: 0, invested: 0, interest: 0 };

    return {
      points,
      yr5,
      yr10,
      yr15,
      totalGrowth10: Math.max(0, (yr10.total || 0) - (yr10.invested || 0))
    };
  }, [monthlyContribution, annualReturnRate, activeFundForSim]);

  // Goal & Habit Calculations
  const goalCalculations = useMemo(() => {
    const currentCap = habitsData?.current_capital ?? (portfolio?.capital_global || 0);
    const gap = Math.max(0, targetCapital - currentCap);

    let extraMonthly = 0;
    if (habitsData?.categories) {
      habitsData.categories.forEach(cat => {
        if (cat.is_reducible) {
          const pct = categoryReductions[cat.category] ?? 0;
          extraMonthly += cat.monthly_avg * (pct / 100);
        }
      });
    }
    extraMonthly = Math.round(extraMonthly * 100) / 100;

    const baseMonthlySavings = habitsData?.current_monthly_savings || 0;
    const totalAdaptedMonthlySavings = Math.round((baseMonthlySavings + extraMonthly) * 100) / 100;
    const requiredMonthlySavings = targetMonths > 0 ? Math.round(gap / targetMonths) : 0;

    let monthsToGoalWithAdaptation = totalAdaptedMonthlySavings > 0 ? Math.ceil(gap / totalAdaptedMonthlySavings) : 999;
    let monthsToGoalWithoutAdaptation = baseMonthlySavings > 0 ? Math.ceil(gap / baseMonthlySavings) : null;

    // Timeline Projection points
    const projectionTimeline = [];
    const maxMonths = Math.min(36, Math.max(targetMonths + 4, 14));
    
    for (let m = 0; m <= maxMonths; m++) {
      const capNoAdapt = Math.round(currentCap + baseMonthlySavings * m);
      const capWithAdapt = Math.round(currentCap + totalAdaptedMonthlySavings * m);

      projectionTimeline.push({
        monthIndex: m,
        monthLabel: m === 0 ? 'Hoy' : `Mes ${m}`,
        target: targetCapital,
        sinAdaptacion: capNoAdapt,
        conAdaptacion: capWithAdapt
      });
    }

    const isTargetAchievedOnTime = monthsToGoalWithAdaptation <= targetMonths;
    const timeSavedMonths = monthsToGoalWithoutAdaptation 
      ? Math.max(0, monthsToGoalWithoutAdaptation - monthsToGoalWithAdaptation) 
      : null;

    return {
      currentCap,
      gap,
      extraMonthly,
      totalAdaptedMonthlySavings,
      requiredMonthlySavings,
      monthsToGoalWithAdaptation,
      monthsToGoalWithoutAdaptation,
      isTargetAchievedOnTime,
      timeSavedMonths,
      projectionTimeline
    };
  }, [habitsData, portfolio?.capital_global, targetCapital, targetMonths, categoryReductions]);

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        <div className="animate-pulse">Cargando portfolio y activos globales...</div>
      </div>
    );
  }

  const { 
    capital_global, 
    gross_capital,
    total_debt = 0,
    monthly_debt_burden = 0,
    active_loans_count = 0,
    liquid_cash, 
    stocks, 
    fund, 
    pending_company_reimbursements,
    bank_accounts = [],
    last_liquidity_date
  } = portfolio;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📈</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
                Portfolio & Capital Global
              </h1>
              <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
                Patrimonio neto real, planificador de objetivos según tus hábitos y simulación de interés compuesto
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenContributionModal ? onOpenContributionModal() : (onOpenMsciModal && onOpenMsciModal())}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Aportación</span>
          </button>
          <button
            onClick={() => setIsAddFundModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Fondo (ISIN)</span>
          </button>
          <button
            onClick={() => setIsAddStockModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Acción (Finnhub)</span>
          </button>
          <button
            disabled={refreshingLive}
            onClick={handleRefreshLivePrices}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingLive ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{refreshingLive ? 'Actualizando...' : 'Actualizar Cotizaciones'}</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'bg-white dark:bg-[#202020] text-neutral-900 dark:text-white shadow-2xs font-bold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-indigo-500" />
          <span>Activos & Capital Global</span>
        </button>

        <button
          onClick={() => setActiveSubTab('habits_goals')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'habits_goals'
              ? 'bg-white dark:bg-[#202020] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-emerald-500" />
          <span>Planificador de Objetivos & Hábitos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
            Inteligente
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulation')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'simulation'
              ? 'bg-white dark:bg-[#202020] text-violet-600 dark:text-violet-400 shadow-2xs font-bold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-violet-500" />
          <span>Simulador Interés Compuesto</span>
        </button>
      </div>

      {/* Capital Global Hero Card (Shared across all subtabs) */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Patrimonio Neto Real (Activos - Deudas)
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-400">
              {capital_global.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
            <p className="text-xs text-neutral-400 max-w-lg mt-1">
              Activos brutos: {(gross_capital || capital_global).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€ (Fondo MSCI + Acciones + Liquidez bancaria) {total_debt > 0 ? `— Deuda viva préstamos: -${total_debt.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ (${active_loans_count} financiaciones)` : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Funds Pill */}
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-xs text-left">
              <span className="text-[10px] text-neutral-300 block">Fondos de Inversión</span>
              <span className="text-base font-bold font-mono">
                {((portfolio.funds_summary?.total_value_eur ?? fund?.total_value_eur) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
              <span className="text-[11px] block mt-0.5 font-semibold text-emerald-400">
                +{((portfolio.funds_summary?.pnl_eur ?? fund?.pnl_eur) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (↑ {portfolio.funds_summary?.pnl_pct ?? fund?.pnl_pct ?? 0}%)
              </span>
            </div>

            {/* Stocks Pill */}
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-300 block">Cartera Acciones</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">Finnhub</span>
              </div>
              <span className="text-base font-bold font-mono">{(stocks?.total_value_eur || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              <span className={`text-[11px] block mt-0.5 font-semibold ${(stocks?.pnl_eur || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(stocks?.pnl_eur || 0) >= 0 ? `+${stocks?.pnl_pct || 0}%` : `${stocks?.pnl_pct || 0}%`}
              </span>
            </div>

            {/* Liquidity Pill */}
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-xs text-left">
              <span className="text-[10px] text-neutral-300 block">Liquidez en Cuentas</span>
              <span className="text-base font-bold font-mono">{liquid_cash.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              <span className="text-[10px] block mt-0.5 text-neutral-300 font-mono truncate">
                {last_liquidity_date ? `Al ${last_liquidity_date}` : 'Sin extracto aún'}
              </span>
            </div>

            {/* Debt Pill */}
            <div 
              onClick={() => setActiveTab && setActiveTab('loans')}
              className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 backdrop-blur-xs text-left cursor-pointer hover:bg-rose-500/30 transition-colors"
            >
              <span className="text-[10px] text-rose-300 block">Deuda en Financiaciones</span>
              <span className="text-base font-bold font-mono text-rose-200">
                -{total_debt.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
              <span className="text-[10px] block mt-0.5 text-rose-300/90 font-medium">
                Cuotas: {monthly_debt_burden.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/mes →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: ACTIVOS & CAPITAL GLOBAL (ORIGINAL DETAILED HOLDINGS VIEW) */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 1: Real Bank Accounts & Liquidity */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🏦</span>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    Cuentas Bancarias & Liquidez en Cuentas
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {liquid_cash.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € Disponible
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Saldos consolidados de tus extractos bancarios (Santander, N26, etc.) o ajustables manualmente
                </p>
              </div>

              <div className="text-xs text-neutral-500">
                {last_liquidity_date ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Último extracto: {last_liquidity_date}
                  </span>
                ) : (
                  <span className="text-neutral-400">Importa tus extractos para actualizar saldos</span>
                )}
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold bg-neutral-50/50 dark:bg-neutral-800/30">
                    <th className="py-2.5 px-3">Cuenta / Tarjeta</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3 text-right">Saldo Actual</th>
                    <th className="py-2.5 px-3 text-center">Fecha Último Extracto</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {bank_accounts.map((acc) => {
                    const isCard = acc.is_credit_card;
                    const hasBalance = acc.current_balance > 0;

                    return (
                      <tr key={acc.account_name} className="hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                            <span>{isCard ? '💳' : '🏛️'}</span>
                            <span>{acc.account_name}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">{acc.notes}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            isCard 
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                              : acc.account_type === 'savings'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}>
                            {isCard ? 'Tarjeta Crédito' : acc.account_type === 'savings' ? 'Ahorro' : 'Cuenta Corriente'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                          <span className={hasBalance ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                            {acc.current_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </span>
                          {isCard && acc.current_balance === 0 && (
                            <span className="block text-[10px] text-neutral-400 font-sans font-normal">Facturación mensual</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-neutral-500 font-mono text-[11px]">
                          {acc.last_transaction_date ? (
                            <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                              <Calendar className="w-3 h-3 text-neutral-400" />
                              {acc.last_transaction_date}
                            </span>
                          ) : (
                            <span className="text-neutral-400 italic">Pendiente de importación</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title="Calibrar o ajustar saldo manualmente"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Ajustar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Fondos de Inversión (Generalista por ISIN / Ref) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🌍</span>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    Fondos de Inversión
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {(portfolio.funds || []).length} Registrados
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Registra cualquier fondo de inversión por su código ISIN para cotización y aportaciones en tiempo real
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddFundModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Fondo (ISIN)</span>
                </button>
                <button
                  onClick={() => onOpenContributionModal ? onOpenContributionModal() : (onOpenMsciModal && onOpenMsciModal())}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Aportación</span>
                </button>
              </div>
            </div>

            {/* Funds Cards / List */}
            {(!portfolio.funds || portfolio.funds.length === 0) ? (
              <div className="p-8 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  No tienes fondos de inversión registrados aún
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Añade tus fondos indexados o de gestión activa indicando su código ISIN para tener su cotización y valor liquidativo en tiempo real.
                </p>
                <button
                  onClick={() => setIsAddFundModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar mi primer fondo</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolio.funds.map((f) => {
                  const isExpanded = Boolean(expandedFundIsins[f.isin]);
                  const costPrice = f.total_shares > 0 ? (f.invested_eur / f.total_shares) : (f.latest_nav || 0);

                  return (
                    <div key={f.isin} className="p-5 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                              {f.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              ISIN: {f.isin}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            Última actualización: {f.last_updated ? f.last_updated.slice(0, 16).replace('T', ' ') : 'Hoy'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onOpenContributionModal ? onOpenContributionModal(f.isin) : (onOpenMsciModal && onOpenMsciModal())}
                            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Aportar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFund(f.isin)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar fondo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metrics cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-[11px] text-neutral-500 block">Valor de Mercado</span>
                          <div className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                            {f.total_value_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <span className={`text-[10px] font-semibold mt-0.5 block ${f.pnl_eur >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {f.pnl_eur >= 0 ? `+${f.pnl_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (↑ ${f.pnl_pct}%)` : `${f.pnl_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (↓ ${f.pnl_pct}%)`}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-[11px] text-neutral-500 block">Participaciones</span>
                          <div className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                            {f.total_shares.toLocaleString('es-ES', { minimumFractionDigits: 4 })}
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">Títulos en posesión</span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-[11px] text-neutral-500 block">Coste Medio</span>
                          <div className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                            {costPrice.toFixed(4)} €
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">Precio medio compra</span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-[11px] text-neutral-500 block">Invertido Acumulado</span>
                          <div className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
                            {f.invested_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">Capital aportado</span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                          <span className="text-[11px] text-neutral-500 block">NAV Actual</span>
                          <div className="text-base font-bold font-mono text-violet-600 dark:text-violet-400 mt-0.5">
                            {f.latest_nav.toFixed(4)} €
                          </div>
                          <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Cotización en vivo</span>
                        </div>
                      </div>

                      {/* Contributions History Accordion */}
                      {f.contributions && f.contributions.length > 0 && (
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setExpandedFundIsins(prev => ({ ...prev, [f.isin]: !prev[f.isin] }))}
                            className="flex items-center justify-between w-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 py-1 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <span>Historial de Suscripciones y Aportaciones ({f.contributions.length} registros)</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 font-normal">
                              {isExpanded ? 'Ocultar' : 'Mostrar detalle'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="overflow-x-auto rounded-lg border border-neutral-200/70 dark:border-neutral-800 mt-2">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium bg-neutral-50/60 dark:bg-neutral-800/40">
                                    <th className="py-2 px-3">Fecha</th>
                                    <th className="py-2 px-3">Concepto / Detalle</th>
                                    <th className="py-2 px-3">Cuenta Origen</th>
                                    <th className="py-2 px-3 text-right">Importe Invertido</th>
                                    <th className="py-2 px-3 text-right">Participaciones</th>
                                    <th className="py-2 px-3 text-right">Precio NAV</th>
                                    <th className="py-2 px-3 text-center">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                                  {f.contributions.map((c) => (
                                    <tr key={c.id} className="hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50">
                                      <td className="py-2 px-3 font-sans text-neutral-600 dark:text-neutral-400">{c.date}</td>
                                      <td className="py-2 px-3 font-sans font-medium text-neutral-800 dark:text-neutral-200">{c.notes}</td>
                                      <td className="py-2 px-3 font-sans text-neutral-500 text-[11px]">{c.funding_account || '-'}</td>
                                      <td className="py-2 px-3 text-right font-bold text-neutral-900 dark:text-white">
                                        {c.invested_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                      </td>
                                      <td className="py-2 px-3 text-right text-violet-600 dark:text-violet-400">
                                        {c.shares.toLocaleString('es-ES', { minimumFractionDigits: 4 })}
                                      </td>
                                      <td className="py-2 px-3 text-right text-neutral-500 text-[11px]">
                                        {c.nav_price ? `${c.nav_price.toFixed(4)} €` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <button
                                          onClick={() => handleDeleteFundContribution(c.id)}
                                          className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                                          title="Eliminar aportación"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Cartera de Acciones con Finnhub API en directo */}
          <div className="space-y-3 pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Cartera de Acciones
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Zap className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" /> Finnhub en directo
                </span>
                <span className="text-xs text-neutral-400 font-mono ml-2">
                  1 EUR = {stocks.eur_usd_rate || 1.137} USD
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddStockModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Acción</span>
                </button>
                <button
                  disabled={refreshingLive}
                  onClick={handleRefreshLivePrices}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingLive ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>Refrescar Precios</span>
                </button>
              </div>
            </div>

            {(!stocks.items || stocks.items.length === 0) ? (
              <div className="p-8 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  No tienes acciones en cartera todavía
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Busca cualquier valor global en tiempo real a través de Finnhub (ej. Apple, Microsoft, Tesla, Santander, etc.) y añade tus acciones y precio medio de compra.
                </p>
                <button
                  onClick={() => setIsAddStockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buscar y añadir acción</span>
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#ececeb] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#202020] text-[#787774] dark:text-[#909090] font-medium">
                        <th className="py-2.5 px-3">Símbolo & Empresa</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                        <th className="py-2.5 px-3 text-right">Precio Medio</th>
                        <th className="py-2.5 px-3 text-right">Cotización Finnhub</th>
                        <th className="py-2.5 px-3 text-right">24h</th>
                        <th className="py-2.5 px-3 text-right">Valor Total ($)</th>
                        <th className="py-2.5 px-3 text-right">Valor Total (€)</th>
                        <th className="py-2.5 px-3 text-right">P&L No Realizado</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f2f0] dark:divide-[#2c2c2c]">
                      {stocks.items.map((s) => {
                        const isPositive = s.pnl_usd >= 0;
                        const isUp24h = s.change_24h >= 0;

                        return (
                          <tr key={s.symbol} className="hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold font-mono text-neutral-900 dark:text-neutral-100">
                                {s.symbol}
                              </div>
                              {s.name && s.name !== s.symbol && (
                                <div className="text-[10px] text-neutral-400 font-sans truncate max-w-[180px]">
                                  {s.name}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                              {s.shares}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                              ${s.avg_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                              ${s.current_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${
                                isUp24h ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                              }`}>
                                {isUp24h ? `+${s.change_24h}%` : `${s.change_24h}%`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-neutral-800 dark:text-neutral-200">
                              ${s.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                              {s.value_eur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                              <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? `+${s.pnl_eur.toFixed(2)} €` : `${s.pnl_eur.toFixed(2)} €`}
                                <span className="text-[10px] ml-1 font-normal">({s.pnl_pct > 0 ? `+${s.pnl_pct}%` : `${s.pnl_pct}%`})</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeleteStock(s.symbol)}
                                className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                                title="Eliminar posición"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PLANIFICADOR DE OBJETIVOS & ADAPTACIÓN DE HÁBITOS (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'habits_goals' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  <span>Planificador de Objetivos Financieros & Adaptación de Hábitos</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                  Calcula exactamente qué gastos debes evitar para alcanzar tu objetivo patrimonial, dónde recortar sin sacrificar tu calidad de vida y cómo llegar meses antes simulando la adaptación de tus hábitos.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  Basado en tus últimos 6 meses reales
                </span>
              </div>
            </div>
          </div>

          {/* Goal Definition Controls */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target Capital Goal */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Tu Meta de Capital / Patrimonio:
                  </span>
                  <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {targetCapital.toLocaleString('es-ES')} €
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {[25000, 30000, 40000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTargetCapital(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        targetCapital === amt
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {(amt/1000).toFixed(0)}k €
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min={Math.round((habitsData?.current_capital || 20000) / 1000) * 1000}
                    max="100000"
                    step="1000"
                    value={targetCapital}
                    onChange={(e) => setTargetCapital(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Capital actual: {Math.round(goalCalculations.currentCap).toLocaleString('es-ES')} €</span>
                    <span>100.000 €</span>
                  </div>
                </div>
              </div>

              {/* Target Timeline */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Horizonte Temporal Deseado:
                  </span>
                  <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                    {targetMonths} meses ({targetMonths >= 12 ? `${(targetMonths/12).toFixed(1)} años` : `${targetMonths} meses`})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {[6, 12, 18, 24].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonths(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        targetMonths === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {m} meses
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="range"
                    min="3"
                    max="36"
                    step="1"
                    value={targetMonths}
                    onChange={(e) => setTargetMonths(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>3 meses</span>
                    <span>36 meses (3 años)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Capital Actual</span>
                <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                  {goalCalculations.currentCap.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Cartera + Liquidez</span>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Faltan para el Objetivo</span>
                <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                  {goalCalculations.gap.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Brecha a financiar con ahorro</span>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">Ahorro Requerido en Plazo</span>
                <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {goalCalculations.requiredMonthlySavings.toLocaleString('es-ES')} €/mes
                </span>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 block mt-0.5">Para cumplir en {targetMonths} meses</span>
              </div>

              <div className={`p-3 rounded-lg border ${
                goalCalculations.isTargetAchievedOnTime
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/50'
                  : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/50'
              }`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${
                  goalCalculations.isTargetAchievedOnTime ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                }`}>
                  Ahorro con Adaptación
                </span>
                <span className={`text-base font-bold font-mono ${
                  goalCalculations.isTargetAchievedOnTime ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  +{goalCalculations.totalAdaptedMonthlySavings.toLocaleString('es-ES')} €/mes
                </span>
                <span className={`text-[10px] block mt-0.5 font-medium ${
                  goalCalculations.isTargetAchievedOnTime ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {goalCalculations.isTargetAchievedOnTime
                    ? `🎯 ¡Llegas en ${goalCalculations.monthsToGoalWithAdaptation} meses!`
                    : `Aún faltan ${goalCalculations.requiredMonthlySavings - goalCalculations.totalAdaptedMonthlySavings} €/mes`}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Projection Chart: Trajectory with Habits vs Without Habits */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Proyección Matemática: Curva de Llegada al Objetivo</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Comparativa de evolución del capital: Inercia con hábitos actuales vs Con adaptación recomendada
                </p>
              </div>

              <div className="flex items-center space-x-4 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-700 dark:text-neutral-300">Con Adaptación (+{goalCalculations.extraMonthly.toFixed(0)}€/mes)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-neutral-700 dark:text-neutral-300">Meta ({targetCapital.toLocaleString('es-ES')}€)</span>
                </span>
              </div>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goalCalculations.projectionTimeline} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 10, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                    stroke={darkMode ? '#404040' : '#d4d4d4'}
                  />
                  <YAxis 
                    domain={['dataMin - 1000', 'auto']}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} 
                    tick={{ fontSize: 10, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                    stroke={darkMode ? '#404040' : '#d4d4d4'}
                  />
                  <Tooltip 
                    formatter={(val, name) => [
                      `${Number(val).toLocaleString('es-ES')} €`, 
                      name === 'conAdaptacion' ? 'Capital Con Adaptación' : name === 'target' ? 'Meta Objetivo' : 'Capital Sin Cambios'
                    ]}
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                      borderColor: darkMode ? '#383838' : '#e5e7eb', 
                      color: darkMode ? '#f3f4f6' : '#111827', 
                      borderRadius: '8px', 
                      fontSize: '11px' 
                    }}
                  />
                  <ReferenceLine y={targetCapital} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Meta', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                  <Line 
                    type="monotone" 
                    dataKey="conAdaptacion" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#10b981' }} 
                    activeDot={{ r: 5 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sinAdaptacion" 
                    stroke="#9ca3af" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3"
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Achievement notice */}
            <div className={`p-3.5 rounded-lg flex items-start gap-3 text-xs ${
              goalCalculations.isTargetAchievedOnTime
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
            }`}>
              <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${
                goalCalculations.isTargetAchievedOnTime ? 'text-emerald-600' : 'text-amber-600'
              }`} />
              <div className="space-y-0.5">
                <span className="font-bold">
                  {goalCalculations.isTargetAchievedOnTime
                    ? `¡Logras tu meta de ${targetCapital.toLocaleString('es-ES')} € en ${goalCalculations.monthsToGoalWithAdaptation} meses!`
                    : `Para alcanzar ${targetCapital.toLocaleString('es-ES')} € en ${targetMonths} meses necesitas un ajuste mayor`}
                </span>
                <p className="text-[11px] opacity-90">
                  {goalCalculations.isTargetAchievedOnTime
                    ? `Con la adaptación de hábitos seleccionada generas +${goalCalculations.extraMonthly.toLocaleString('es-ES')} € de ahorro mensual neto, llegando ${Math.max(0, targetMonths - goalCalculations.monthsToGoalWithAdaptation)} meses antes de tu plazo fijado.`
                    : `Tu ahorro actual con estos ajustes es de +${goalCalculations.totalAdaptedMonthlySavings.toLocaleString('es-ES')} €/mes, pero necesitas +${goalCalculations.requiredMonthlySavings.toLocaleString('es-ES')} €/mes. Ajusta los sliders de Restaurantes y Otras compras a continuación para cubrir los ${goalCalculations.requiredMonthlySavings - goalCalculations.totalAdaptedMonthlySavings} € restantes.`}
                </p>
              </div>
            </div>
          </div>

          {/* Section: ¿Qué gastos evitar y dónde adaptar tus hábitos? */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <span>¿Qué gastos deberías evitar? — Adaptación interactiva por categoría</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Mueve los selectores para simular cuánto dinero liberas al mes adaptando cada hábito específico
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCategoryReductions({
                    'Restaurantes': 35,
                    'Otras compras': 40,
                    'Servicios/Suscripciones': 30,
                    'Compra Ropa': 40,
                    'Entretenimiento': 35,
                    'Gastos Viajes': 25
                  })}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Plan Recomendado (Óptimo)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryReductions({
                    'Restaurantes': 0,
                    'Otras compras': 0,
                    'Servicios/Suscripciones': 0,
                    'Compra Ropa': 0,
                    'Entretenimiento': 0,
                    'Gastos Viajes': 0
                  })}
                  className="px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  Restablecer a 0%
                </button>
              </div>
            </div>

            {/* Reducible Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habitsData?.categories?.filter(c => c.is_reducible).map((cat) => {
                const currentPct = categoryReductions[cat.category] ?? 0;
                const monthlySaved = Math.round(cat.monthly_avg * (currentPct / 100));

                return (
                  <div 
                    key={cat.category} 
                    className="p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <span className="font-bold text-xs text-neutral-900 dark:text-white block">
                            {cat.category}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Media real: <strong className="text-neutral-700 dark:text-neutral-300">{cat.monthly_avg.toFixed(0)} €/mes</strong> ({cat.tx_count} cargos)
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          +{monthlySaved} €/mes
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          +{monthlySaved * 12} €/año
                        </span>
                      </div>
                    </div>

                    {/* Actionable Tip on what to avoid */}
                    <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 text-[11px] text-neutral-600 dark:text-neutral-300 flex items-start gap-2">
                      <span className="text-indigo-500 font-bold shrink-0">💡 Qué evitar:</span>
                      <span>{cat.tip}</span>
                    </div>

                    {/* Interactive Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500">Reducción del gasto:</span>
                        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          {currentPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={currentPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCategoryReductions(prev => ({
                            ...prev,
                            [cat.category]: val
                          }));
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Gastos Estructurales Fijos (Inamovibles) */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-neutral-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-neutral-400" />
                <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Gastos Fijos Estructurales (No modificables para proteger tu bienestar)
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400">
                Total Fijo: ~{habitsData?.fixed_expenses_avg?.toLocaleString('es-ES')} €/mes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {habitsData?.categories?.filter(c => !c.is_reducible).map((cat) => (
                <div key={cat.category} className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.category}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {cat.monthly_avg.toFixed(0)} €/mes
                  </div>
                  <span className="text-[10px] text-neutral-400 block truncate mt-0.5">{cat.tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: SIMULADOR DE INTERÉS COMPUESTO (FONDOS DE INVERSIÓN) */}
      {/* ========================================================================= */}
      {activeSubTab === 'simulation' && (
        !hasUserFunds ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center text-3xl">
              📈
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No tienes ningún fondo de inversión registrado
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                El simulador de interés compuesto proyecta la rentabilidad real sobre fondos de inversión indexados o de gestión activa que tengas en tu cartera. Para activar las simulaciones y proyectar aportaciones periódicas, primero da de alta un fondo de inversión.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddFundModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs inline-flex items-center space-x-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Fondo de Inversión</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-violet-500" />
                  <span>Simulador de Interés Compuesto — {activeFundForSim?.name || activeFundForSim?.isin}</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Proyección matemática de crecimiento considerando tu saldo real ({Number(activeFundForSim?.total_value_eur || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€) y aportaciones periódicas
                </p>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                {userFunds.length > 1 && (
                  <select
                    value={activeFundForSim?.isin || ''}
                    onChange={(e) => setSelectedFundIsinForSim(e.target.value)}
                    className="text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-neutral-800 dark:text-neutral-200"
                  >
                    {userFunds.map(f => (
                      <option key={f.isin} value={f.isin}>
                        {f.name || f.isin} ({Number(f.total_value_eur || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}€)
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setActiveSubTab('overview')}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  Ver Cartera Real →
                </button>
              </div>
            </div>

          {/* Interactive Simulator Controls */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contribution Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-neutral-700 dark:text-neutral-300">Aportación Mensual Sugerida:</span>
                  <span className="font-mono font-bold text-violet-600 dark:text-violet-400 text-sm">
                    {monthlyContribution} €/mes
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {[150, 300, 450, 600].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMonthlyContribution(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        monthlyContribution === amt
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {amt} €
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Rate of Return Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-neutral-700 dark:text-neutral-300">Rentabilidad Anual Compuesta Histórica:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {annualReturnRate}% anual
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {[6.0, 7.5, 9.0, 10.0].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setAnnualReturnRate(rate)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        annualReturnRate === rate
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400 pt-1">
                  *La media histórica neta del índice MSCI World en los últimos 30 años se sitúa en torno al 7,5% anual compuesto.
                </p>
              </div>
            </div>

            {/* Projection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">En 5 Años</span>
                <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
                  {Number(simulationProjection?.yr5?.total || 0).toLocaleString('es-ES')} €
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  +{Number(simulationProjection?.yr5?.interest || 0).toLocaleString('es-ES')} € de intereses
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/25 border border-violet-200/80 dark:border-violet-800/60">
                <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">En 10 Años</span>
                <div className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400 mt-1">
                  {Number(simulationProjection?.yr10?.total || 0).toLocaleString('es-ES')} €
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  +{Number(simulationProjection?.yr10?.interest || 0).toLocaleString('es-ES')} € de intereses
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">En 15 Años</span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {Number(simulationProjection?.yr15?.total || 0).toLocaleString('es-ES')} €
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  +{Number(simulationProjection?.yr15?.interest || 0).toLocaleString('es-ES')} € de intereses
                </div>
              </div>
            </div>

            {/* Projection Area Chart */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Curva de Progresión del Capital (Aportado vs Interés Ganado)
                </span>
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Total Fondo</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Capital Aportado</span>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationProjection.points} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorInvestedPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 10, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} 
                      tick={{ fontSize: 10, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <Tooltip 
                      formatter={(val, name) => [`${Number(val).toLocaleString('es-ES')} €`, name === 'total' ? 'Valor Fondo Total' : 'Capital Aportado']}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                        borderColor: darkMode ? '#383838' : '#e5e7eb', 
                        color: darkMode ? '#f3f4f6' : '#111827', 
                        borderRadius: '8px', 
                        fontSize: '11px' 
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotalPortfolio)" />
                    <Area type="monotone" dataKey="invested" stroke="#8B5CF6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInvestedPortfolio)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )
    )}

      {/* Modal to Adjust Account Balance */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#282828] border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Ajustar Saldo de Cuenta
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {editingAccount.account_name}
                </p>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Saldo Actual (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBalanceInput}
                    onChange={(e) => setNewBalanceInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-indigo-500"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-mono">EUR</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Este valor computará en tu Capital Global como liquidez disponible hasta la siguiente importación.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  {savingBalance ? 'Guardando...' : 'Guardar Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Fondo de Inversión por ISIN */}
      {isAddFundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#282828] border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🌍</span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Registrar Fondo de Inversión
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Búsqueda de cotización en tiempo real por ISIN / Referencia
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddFundModalOpen(false);
                  setFundLookupNotice(null);
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFund} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Código ISIN / Referencia del Fondo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newFundIsin}
                    onChange={(e) => setNewFundIsin(e.target.value.toUpperCase())}
                    placeholder="ej. IE00BYX5P602"
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-violet-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={lookingUpFund || !newFundIsin.trim()}
                    onClick={handleLookupFund}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {lookingUpFund ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Consultar</span>
                  </button>
                </div>
                {fundLookupNotice && (
                  <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-1.5 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{fundLookupNotice}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nombre del Fondo
                </label>
                <input
                  type="text"
                  required
                  value={newFundName}
                  onChange={(e) => setNewFundName(e.target.value)}
                  placeholder="ej. Fidelity MSCI World Index Fund"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Valor Liquidativo / NAV Inicial (€)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={newFundNav}
                  onChange={(e) => setNewFundNav(e.target.value)}
                  placeholder="ej. 12.1018"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-violet-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Se actualizará automáticamente con el valor liquidativo más reciente del mercado.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddFundModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFund || !newFundIsin.trim()}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingFund ? 'Guardando...' : 'Registrar Fondo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Añadir Acción con Búsqueda en Directo Finnhub */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#282828] border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📈</span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Añadir Posición en Acciones
                  </h3>
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-500" /> Búsqueda en tiempo real mediante Finnhub
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddStockModalOpen(false);
                  setStockSearchQuery('');
                  setStockSearchResults([]);
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-4 space-y-4">
              {/* Finnhub Live Search Input */}
              <div className="relative">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Buscar Valor / Empresa (Finnhub)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder="ej. Apple, AAPL, Microsoft, MSFT, SAN.MC..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-indigo-500"
                    autoFocus={!selectedStockSymbol}
                  />
                  {searchingStocks && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Dropdown search results */}
                {stockSearchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 shadow-lg divide-y divide-neutral-100 dark:divide-neutral-800">
                    {stockSearchResults.map((item) => (
                      <button
                        type="button"
                        key={item.symbol}
                        onClick={() => handleSelectStock(item)}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-[#2a2a2a] flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">{item.symbol}</span>
                          <span className="text-neutral-500 dark:text-neutral-400 ml-2 text-[11px] truncate">{item.description}</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {item.type || 'Stock'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Stock Banner */}
              {selectedStockSymbol ? (
                <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-indigo-900 dark:text-indigo-200">
                        {selectedStockSymbol}
                      </span>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 truncate max-w-[240px]">
                        {selectedStockName || selectedStockSymbol}
                      </p>
                    </div>
                    {currentMarketQuote && (
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-indigo-900 dark:text-indigo-200">
                          ${currentMarketQuote.price?.toFixed(2)}
                        </span>
                        <span className={`block text-[10px] font-mono ${
                          (currentMarketQuote.change_24h || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {(currentMarketQuote.change_24h || 0) >= 0 ? `+${currentMarketQuote.change_24h}%` : `${currentMarketQuote.change_24h}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400 text-center text-xs">
                  Busca y selecciona un activo para cargar su cotización
                </div>
              )}

              {/* Shares & Avg Buy Price Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Número de Acciones
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stockShares}
                    onChange={(e) => setStockShares(e.target.value)}
                    placeholder="ej. 10"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Precio Medio Compra ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={stockAvgPrice}
                    onChange={(e) => setStockAvgPrice(e.target.value)}
                    placeholder="ej. 150.00"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Divisa de Cotización
                </label>
                <select
                  value={stockCurrency}
                  onChange={(e) => setStockCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-indigo-500"
                >
                  <option value="USD">USD ($ - Dólar Estadounidense)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddStockModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStock || !selectedStockSymbol || !stockShares}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingStock ? 'Guardando...' : 'Guardar Posición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

