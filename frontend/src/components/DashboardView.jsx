import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase, 
  HelpCircle, 
  PiggyBank, 
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Fuel,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CreditCard,
  Layers,
  BarChart2,
  Table,
  DollarSign,
  CalendarDays,
  AlertTriangle,
  TrendingDown,
  Store,
  Sliders,
  CheckCircle2,
  Clock,
  Zap,
  Check,
  Calculator,
  Target,
  Search,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  ReferenceLine 
} from 'recharts';
import { authFetch } from '../supabaseClient';

export default function DashboardView({ 
  summary, 
  setActiveTab, 
  selectedMonth, 
  setSelectedMonth,
  darkMode,
  enableCompanyExpenses = true
}) {
  const [activeViewMode, setActiveViewMode] = useState('overview'); // 'overview' | 'balance_excel' | 'wealth'
  const [balanceMatrix, setBalanceMatrix] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');

  // Advanced analytics state for the selected month
  const [advancedData, setAdvancedData] = useState(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);

  // Wealth & Savings Evolution period filter state
  const [wealthRangePreset, setWealthRangePreset] = useState('6m'); // '3m' | '6m' | 'all' | 'custom'
  const [wealthStartMonth, setWealthStartMonth] = useState('');
  const [wealthEndMonth, setWealthEndMonth] = useState('');
  const [wealthChartMode, setWealthChartMode] = useState('accumulated'); // 'accumulated' | 'income_vs_expense' | 'savings_rate'

  useEffect(() => {
    setLoadingMatrix(true);
    authFetch('/api/analytics/balance-matrix')
      .then(res => res.json())
      .then(data => {
        setBalanceMatrix(data);
        if (data && data.months && data.months.length > 0) {
          const allM = data.months;
          const endM = allM[allM.length - 1];
          const startIdx = Math.max(0, allM.length - 6);
          setWealthStartMonth(allM[startIdx]);
          setWealthEndMonth(endM);
        }
      })
      .catch(err => console.error('Error fetching balance matrix:', err))
      .finally(() => setLoadingMatrix(false));
  }, []);

  const handleSelectWealthPreset = (preset) => {
    if (!balanceMatrix?.months || balanceMatrix.months.length === 0) return;
    const allM = balanceMatrix.months;
    const endM = allM[allM.length - 1];
    setWealthRangePreset(preset);
    if (preset === '3m') {
      setWealthStartMonth(allM[Math.max(0, allM.length - 3)]);
      setWealthEndMonth(endM);
    } else if (preset === '6m') {
      setWealthStartMonth(allM[Math.max(0, allM.length - 6)]);
      setWealthEndMonth(endM);
    } else if (preset === 'all') {
      setWealthStartMonth(allM[0]);
      setWealthEndMonth(endM);
    }
  };

  const filteredWealthData = useMemo(() => {
    if (!balanceMatrix?.results?.wealth_evolution) return [];
    const all = balanceMatrix.results.wealth_evolution;
    const sM = wealthStartMonth || (balanceMatrix.months ? balanceMatrix.months[0] : '');
    const eM = wealthEndMonth || (balanceMatrix.months ? balanceMatrix.months[balanceMatrix.months.length - 1] : '');
    
    const slice = all.filter(item => item.month >= sM && item.month <= eM);
    let cum = 0;
    return slice.map(item => {
      cum += (item.net_savings || 0);
      return {
        ...item,
        period_cumulative_savings: Math.round(cum * 100) / 100
      };
    });
  }, [balanceMatrix, wealthStartMonth, wealthEndMonth]);

  const periodKpis = useMemo(() => {
    if (!filteredWealthData || filteredWealthData.length === 0) {
      return { totalIncome: 0, totalExpenses: 0, totalSavings: 0, avgRate: 0, totalInvestments: 0, bestMonth: null, monthsCount: 0 };
    }
    const totalIncome = filteredWealthData.reduce((acc, curr) => acc + (curr.income || 0), 0);
    const totalExpenses = filteredWealthData.reduce((acc, curr) => acc + (curr.expenses || 0), 0);
    const totalSavings = filteredWealthData.reduce((acc, curr) => acc + (curr.net_savings || 0), 0);
    const totalInvestments = filteredWealthData.reduce((acc, curr) => acc + (curr.investments || 0), 0);
    const avgRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
    
    let best = filteredWealthData[0];
    for (const item of filteredWealthData) {
      if (item.net_savings > (best?.net_savings ?? -Infinity)) {
        best = item;
      }
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      totalInvestments: Math.round(totalInvestments * 100) / 100,
      avgRate: Math.round(avgRate * 10) / 10,
      bestMonth: best,
      monthsCount: filteredWealthData.length
    };
  }, [filteredWealthData]);

  useEffect(() => {
    setLoadingAdvanced(true);
    authFetch(`/api/analytics/advanced?month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => setAdvancedData(data))
      .catch(err => console.error('Error fetching advanced analytics:', err))
      .finally(() => setLoadingAdvanced(false));
  }, [selectedMonth]);



  // Normalize string helper for diacritic-insensitive & case-insensitive search
  const normalizeStr = (str) =>
    (str || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const searchNorm = normalizeStr(matrixSearch);

  const filteredIncomeRows = useMemo(() => {
    if (!balanceMatrix?.income?.rows) return [];
    if (!searchNorm) return balanceMatrix.income.rows;
    return balanceMatrix.income.rows.filter(r =>
      normalizeStr(r.name).includes(searchNorm)
    );
  }, [balanceMatrix, searchNorm]);

  const filteredExpenseRows = useMemo(() => {
    if (!balanceMatrix?.personal_expenses?.rows) return [];
    if (!searchNorm) return balanceMatrix.personal_expenses.rows;
    return balanceMatrix.personal_expenses.rows.filter(r =>
      normalizeStr(r.name).includes(searchNorm) ||
      (r.category && normalizeStr(r.category).includes(searchNorm))
    );
  }, [balanceMatrix, searchNorm]);

  const filteredCardRows = useMemo(() => {
    if (!balanceMatrix?.card_settlements?.rows) return [];
    if (!searchNorm) return balanceMatrix.card_settlements.rows;
    return balanceMatrix.card_settlements.rows.filter(r =>
      normalizeStr(r.name).includes(searchNorm)
    );
  }, [balanceMatrix, searchNorm]);

  const filteredTransferRows = useMemo(() => {
    if (!balanceMatrix?.internal_transfers?.rows) return [];
    if (!searchNorm) return balanceMatrix.internal_transfers.rows;
    return balanceMatrix.internal_transfers.rows.filter(r =>
      normalizeStr(r.name).includes(searchNorm)
    );
  }, [balanceMatrix, searchNorm]);

  const hasCompanyOutlaysMatch = useMemo(() => {
    if (!balanceMatrix?.company_reimbursements?.has_data) return false;
    if (!searchNorm) return true;
    const name1 = normalizeStr(balanceMatrix.company_reimbursements.outlays?.name);
    const name2 = normalizeStr(balanceMatrix.company_reimbursements.received?.name);
    return name1.includes(searchNorm) || name2.includes(searchNorm) || 'empresa'.includes(searchNorm) || 'reembolsable'.includes(searchNorm);
  }, [balanceMatrix, searchNorm]);

  const totalMatchesCount =
    filteredIncomeRows.length +
    filteredExpenseRows.length +
    filteredCardRows.length +
    filteredTransferRows.length +
    (hasCompanyOutlaysMatch && searchNorm ? 2 : 0);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <div className="animate-pulse">Cargando métricas financieras...</div>
      </div>
    );
  }

  const { forecast, portfolio, pending_doubts_count, available_months } = summary;
  const hasTransactions = forecast && (forecast.gross_expenses > 0 || forecast.total_income > 0);

  // Custom tooltip for Pie
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      return (
        <div className="bg-white dark:bg-[#252525] p-2.5 rounded-md shadow-md border border-[#e5e5e3] dark:border-[#383838] text-xs">
          <div className="font-semibold text-neutral-800 dark:text-neutral-100">{data.name || ''}</div>
          <div className="text-neutral-600 dark:text-neutral-300 font-mono mt-0.5">
            {Number(data.value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
        </div>
      );
    }
    return null;
  };

  // Export Matrix to CSV
  const handleExportCSV = () => {
    if (!balanceMatrix || !balanceMatrix.months) return;

    const months = balanceMatrix.months;
    const header = ["Concepto / Categoría", ...months, "Media Mensual", "Total Semestral"].join(";");
    const rows = [];

    const formatRow = (name, byMonth, avg, tot) => {
      const vals = months.map(m => (byMonth[m] || 0).toFixed(2).replace('.', ','));
      return [name, ...vals, (avg || 0).toFixed(2).replace('.', ','), (tot || 0).toFixed(2).replace('.', ',')].join(";");
    };

    // Income
    rows.push("=== INGRESOS ===");
    balanceMatrix.income.rows.forEach(r => rows.push(formatRow(r.name, r.by_month, r.average, r.total)));
    rows.push(formatRow(balanceMatrix.income.total.name, balanceMatrix.income.total.by_month, balanceMatrix.income.total.average, balanceMatrix.income.total.total));
    rows.push("");

    // Personal Expenses
    rows.push("=== GASTOS PERSONALES REALES ===");
    balanceMatrix.personal_expenses.rows.forEach(r => rows.push(formatRow(r.name, r.by_month, r.average, r.total)));
    rows.push(formatRow(balanceMatrix.personal_expenses.total.name, balanceMatrix.personal_expenses.total.by_month, balanceMatrix.personal_expenses.total.average, balanceMatrix.personal_expenses.total.total));
    rows.push("");

    // Card Settlements
    rows.push("=== LIQUIDACIÓN TARJETAS (DEDUPLICADO) ===");
    balanceMatrix.card_settlements.rows.forEach(r => rows.push(formatRow(r.name, r.by_month, r.average, r.total)));
    rows.push(formatRow(balanceMatrix.card_settlements.total.name, balanceMatrix.card_settlements.total.by_month, balanceMatrix.card_settlements.total.average, balanceMatrix.card_settlements.total.total));
    rows.push("");

    // Internal Transfers
    if (balanceMatrix.internal_transfers && balanceMatrix.internal_transfers.rows) {
      rows.push("=== TRASPASOS ENTRE CUENTAS Y AMEX (INFORMATIVO) ===");
      balanceMatrix.internal_transfers.rows.forEach(r => rows.push(formatRow(r.name, r.by_month, r.average, r.total)));
      rows.push(formatRow(balanceMatrix.internal_transfers.total.name, balanceMatrix.internal_transfers.total.by_month, balanceMatrix.internal_transfers.total.average, balanceMatrix.internal_transfers.total.total));
      rows.push("");
    }

    // Reimbursable Company
    if (enableCompanyExpenses && balanceMatrix.company_reimbursements?.outlays) {
      rows.push("=== GASTOS DE EMPRESA ===");
      rows.push(formatRow(balanceMatrix.company_reimbursements.outlays.name, balanceMatrix.company_reimbursements.outlays.by_month, 0, balanceMatrix.company_reimbursements.outlays.total));
      rows.push(formatRow(balanceMatrix.company_reimbursements.received.name, balanceMatrix.company_reimbursements.received.by_month, 0, balanceMatrix.company_reimbursements.received.total));
      rows.push("");
    }

    // Results
    rows.push("=== RESULTADO Y AHORRO ===");
    rows.push(formatRow(balanceMatrix.results.net_savings.name, balanceMatrix.results.net_savings.by_month, balanceMatrix.results.net_savings.average, balanceMatrix.results.net_savings.total));
    rows.push(formatRow(balanceMatrix.results.investments.name, balanceMatrix.results.investments.by_month, balanceMatrix.results.investments.average, balanceMatrix.results.investments.total));

    const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `balance_mensual_diego_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`${activeViewMode === 'balance_excel' ? 'w-full max-w-full px-1 sm:px-3' : 'max-w-6xl mx-auto'} space-y-6 pb-12 transition-all`}>
      {/* Page Header (Notion Style) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📊</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
                Dashboard Financiero & Balance
              </h1>
              <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
                Gestión patrimonial personal, balance mensual estilo Excel, hábitos y simulador de inversión
              </p>
            </div>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
            <button
              onClick={() => setActiveViewMode('overview')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeViewMode === 'overview'
                  ? 'bg-white dark:bg-[#202020] text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Visión Mensual</span>
            </button>



            <button
              onClick={() => setActiveViewMode('balance_excel')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeViewMode === 'balance_excel'
                  ? 'bg-white dark:bg-[#202020] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Balance Estilo Excel</span>
            </button>

            <button
              onClick={() => setActiveViewMode('wealth')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeViewMode === 'wealth'
                  ? 'bg-white dark:bg-[#202020] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Evolución Patrimonio</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: VISIÓN MENSUAL (DEFAULT OVERVIEW) */}
      {/* ============================================================== */}
      {activeViewMode === 'overview' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
            <div className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              <Calendar className="w-4 h-4 text-[#787774]" />
              <span>Mes en análisis:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="font-bold text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600 rounded-md px-2.5 py-1 outline-none cursor-pointer"
              >
                {available_months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-neutral-500 flex items-center space-x-2">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800/40">
                <ShieldCheck className="w-3 h-3" />
                Liquidación de tarjetas deduplicada
              </span>
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Patrimonio Neto Real */}
            <div 
              onClick={() => setActiveTab('portfolio')}
              className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs cursor-pointer hover:border-neutral-400 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9c9c9c]">
                <span className="font-medium">Patrimonio Neto Real</span>
                <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-bold text-[#37352f] dark:text-white mt-1 tracking-tight font-mono">
                {Number(portfolio?.net_worth ?? portfolio?.capital_global ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <div className="mt-2 text-[11px] text-[#787774] dark:text-[#8f8f8f] flex items-center justify-between">
                <span>Activos: {Number(portfolio?.gross_capital || portfolio?.capital_global || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Portfolio →</span>
              </div>
            </div>

            {/* 2. Deuda Viva en Financiaciones */}
            <div 
              onClick={() => setActiveTab('loans')}
              className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs cursor-pointer hover:border-amber-400 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9c9c9c]">
                <span className="font-medium">Deuda en Financiaciones</span>
                <span className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tracking-tight font-mono">
                {Number(portfolio?.total_debt || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <div className="mt-2 text-[11px] text-[#787774] dark:text-[#8f8f8f] flex items-center justify-between">
                <span>Cuotas: {Number(portfolio?.monthly_debt_burden || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/mes</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Créditos ({portfolio?.active_loans_count || 0}) →</span>
              </div>
            </div>

            {/* 3. Gasto Personal Real del Mes */}
            <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9c9c9c]">
                <span className="font-medium">Gasto Personal Real</span>
                <span className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tracking-tight font-mono">
                {Number(forecast?.personal_expenses || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <div className="mt-2 text-[11px] text-[#787774] dark:text-[#8f8f8f] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Excluye recibos de tarjeta y BMC</span>
              </div>
            </div>

            {/* 4. Ahorro Neto Proyectado */}
            <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9c9c9c]">
                <span className="font-medium">Ahorro Neto Personal</span>
                <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <PiggyBank className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight font-mono">
                {Number(forecast?.projected_net_savings || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Tasa de ahorro: {Number(forecast?.projected_savings_rate || 0)}%
              </div>
            </div>
          </div>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Expenses by Category (2 cols) */}
            <div className="lg:col-span-2 p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#37352f] dark:text-white">
                    Gastos Personales Reales por Categoría
                  </h2>
                  <p className="text-[11px] text-[#787774] dark:text-[#9c9c9c]">
                    Consumo real del mes (sin duplicar liquidaciones de tarjeta ni transferencias internas)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                >
                  Ver transacciones →
                </button>
              </div>

              {forecast.category_breakdown && forecast.category_breakdown.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={forecast.category_breakdown}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                      >
                        <XAxis 
                          type="number" 
                          tickFormatter={(v) => `${v}€`} 
                          tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                          stroke={darkMode ? '#404040' : '#d4d4d4'}
                        />
                        <YAxis 
                          dataKey="category" 
                          type="category" 
                          tick={{ fontSize: 10, fill: darkMode ? '#d4d4d4' : '#404040' }} 
                          stroke={darkMode ? '#404040' : '#d4d4d4'}
                          width={130}
                        />
                        <Tooltip 
                          formatter={(val) => [`${val.toFixed(2)} €`, 'Gasto']}
                          contentStyle={{ 
                            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                            borderColor: darkMode ? '#383838' : '#e5e7eb', 
                            color: darkMode ? '#f3f4f6' : '#111827', 
                            borderRadius: '8px', 
                            fontSize: '11px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                          }}
                          itemStyle={{ color: darkMode ? '#f3f4f6' : '#111827' }}
                          labelStyle={{ color: darkMode ? '#9ca3af' : '#4b5563', fontWeight: 600 }}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                          {forecast.category_breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#6366F1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Summary Pills */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    {forecast.category_breakdown.slice(0, 5).map((c) => (
                      <div 
                        key={c.category}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span>{c.category}:</span>
                        <span className="font-bold">{c.amount.toFixed(0)}€</span>
                        <span className="text-neutral-400">({c.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-xs text-neutral-400">
                  No hay transacciones registradas para este mes.
                </div>
              )}
            </div>

            {/* Asset Allocation Donut (1 col) */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#37352f] dark:text-white">
                  Composición del Patrimonio
                </h2>
                <p className="text-[11px] text-[#787774] dark:text-[#9c9c9c]">
                  Distribución de activos en Capital Global
                </p>
              </div>

              <div className="h-44 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolio.asset_allocation}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {Array.isArray(portfolio?.asset_allocation) && portfolio.asset_allocation.map((entry, index) => (
                        <Cell key={`alloc-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-neutral-400 font-medium">Total</span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                    {(Number(portfolio?.capital_global || 0) / 1000).toFixed(1)}k €
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                {Array.isArray(portfolio?.asset_allocation) && portfolio.asset_allocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                      {Number(item?.value || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* NEW ANALYSIS ROW 1: DÍA DE LA SEMANA & REGLA 50/30/20 */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Day of Week Habits */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                    <span>Hábitos de Consumo: Gasto por Día de la Semana</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Distribución de gastos personales entre días laborables y fin de semana
                  </p>
                </div>
              </div>

              {Array.isArray(advancedData?.day_of_week) && advancedData.day_of_week.length > 0 ? (
                <div className="space-y-3">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height={176}>
                      <BarChart data={advancedData.day_of_week} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                        <XAxis 
                          dataKey="day_short" 
                          tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                          stroke={darkMode ? '#404040' : '#d4d4d4'}
                        />
                        <YAxis 
                          tickFormatter={(v) => `${v}€`} 
                          tick={{ fontSize: 10, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                          stroke={darkMode ? '#404040' : '#d4d4d4'}
                        />
                        <Tooltip 
                          formatter={(val) => [`${Number(val || 0).toFixed(2)} €`, 'Total Gastado']}
                          labelFormatter={(l, p) => p?.[0]?.payload?.day_name || (typeof l === 'string' ? l : '')}
                          contentStyle={{ 
                            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                            borderColor: darkMode ? '#383838' : '#e5e7eb', 
                            color: darkMode ? '#f3f4f6' : '#111827', 
                            borderRadius: '8px', 
                            fontSize: '11px' 
                          }}
                        />
                        <Bar dataKey="total_spent" radius={[4, 4, 0, 0]}>
                          {advancedData.day_of_week.map((entry, idx) => (
                            <Cell 
                              key={`dow-${idx}`} 
                              fill={entry?.is_weekend ? '#8B5CF6' : '#6366F1'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                      <span>Laborables (L-V)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                      <span>Fin de Semana (S-D)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Cargando desglose semanal...
                </div>
              )}
            </div>

            {/* Budget Rule 50/30/20 */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span>Equilibrio Presupuestario (Regla 50 / 30 / 20)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Comparativa frente al estándar recomendado de finanzas personales
                  </p>
                </div>
              </div>

              {advancedData?.budget_50_30_20 ? (
                <div className="space-y-4 pt-1">
                  {/* Needs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        🏠 Necesidades Básicas (Objetivo: 50%)
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {Number(advancedData.budget_50_30_20.needs?.spent || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} € ({Number(advancedData.budget_50_30_20.needs?.percentage || 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          Number(advancedData.budget_50_30_20.needs?.percentage || 0) <= 55 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Number(advancedData.budget_50_30_20.needs?.percentage || 0))}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] text-neutral-400">
                      Alquiler, gastos de piso, supermercados, suministros, seguros y gasolina.
                    </p>
                  </div>

                  {/* Wants */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        🍽️ Deseos y Discrecional (Objetivo: 30%)
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {Number(advancedData.budget_50_30_20.wants?.spent || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} € ({Number(advancedData.budget_50_30_20.wants?.percentage || 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          Number(advancedData.budget_50_30_20.wants?.percentage || 0) <= 35 ? 'bg-indigo-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Number(advancedData.budget_50_30_20.wants?.percentage || 0))}%` }}
                      />
                    </div>
                    <p className="text-[10.5px] text-neutral-400">
                      Restaurantes, ocio, viajes, compras, pádel y suscripciones de entretenimiento.
                    </p>
                  </div>

                  {/* Savings */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        📈 Ahorro e Inversión (Objetivo: 20%)
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {Number(advancedData.budget_50_30_20.savings?.saved || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} € ({Number(advancedData.budget_50_30_20.savings?.percentage || 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, Number(advancedData.budget_50_30_20.savings?.percentage || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Cargando regla presupuestaria...
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* NEW ANALYSIS ROW 2: ANOMALÍAS DE GASTO & TOP COMERCIOS */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Spending Anomalies & Money Leaks */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Detector de Anomalías & Money Leaks del Mes</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Comparación del gasto frente a tu media histórica semestral
                  </p>
                </div>
              </div>

              {Array.isArray(advancedData?.anomalies) && advancedData.anomalies.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {advancedData.anomalies.map((a, idx) => {
                    const monthAmt = Number(a?.month_amount || 0);
                    const histAvg = Number(a?.hist_average || 0);
                    const diff = Number(a?.difference || 0);
                    const pct = Number(a?.pct_change || 0);
                    const isSpike = a?.type === 'spike';
                    return (
                      <div 
                        key={idx}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs border ${
                          isSpike
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isSpike ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-neutral-800 dark:text-neutral-100">{a?.category || 'Gasto'}</div>
                            <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                              Mes: <strong>{monthAmt.toFixed(0)}€</strong> | Media: {histAvg.toFixed(0)}€
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold">
                          <span className={isSpike ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)} €
                          </span>
                          <div className="text-[10px] font-normal text-neutral-400">
                            {pct > 0 ? `+${pct}%` : `${pct}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No se detectan desviaciones significativas este mes. ¡Gasto estable!
                </div>
              )}
            </div>

            {/* Top Merchants for the Month */}
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-indigo-500" />
                    <span>Top Comercios del Mes</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Entidades y comercios donde más capital se ha destinado
                  </p>
                </div>
              </div>

              {Array.isArray(advancedData?.top_merchants_month) && advancedData.top_merchants_month.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {advancedData.top_merchants_month.map((m, idx) => {
                    const totalVal = Number(m?.total || 0);
                    const pctVal = Number(m?.percentage || 0);
                    return (
                      <div 
                        key={idx}
                        className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-[10px] text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1 truncate">
                            <div className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{m?.name || 'Comercio'}</div>
                            <div className="text-[10.5px] text-neutral-400 flex items-center gap-1.5">
                              <span>{m?.category || 'Varios'}</span>
                              <span>•</span>
                              <span>{m?.count || 1} movimientos</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold flex-shrink-0 ml-2">
                          <span className="text-neutral-900 dark:text-white">{totalVal.toFixed(2)} €</span>
                          <div className="text-[10px] text-neutral-400 font-normal">
                            {pctVal}% del total
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Cargando comercios destacados...
                </div>
              )}
            </div>
          </div>

          {/* Recommendations & Agent Insights */}
          {forecast.recommendations && forecast.recommendations.length > 0 && (
            <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-[#37352f] dark:text-white">
                    Recomendaciones y Diagnóstico del Agente
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Consultar al Chat IA →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {forecast.recommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-md bg-[#fcfcfb] dark:bg-[#2b2b2b] border border-[#ebebe9] dark:border-[#3a3a3a] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{rec.icon}</span>
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {rec.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {rec.impact}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ============================================================== */}
      {/* MODE 3: BALANCE MENSUAL ESTILO EXCEL (FULL SPREADSHEET MATRIX) */}
      {/* ============================================================== */}
      {activeViewMode === 'balance_excel' && (
        <div className="space-y-4">
          {/* 1. Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                <span>Hoja de Balance Mensual (Estilo Excel)</span>
                {balanceMatrix?.months && (
                  <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono font-medium border border-neutral-200 dark:border-neutral-700">
                    {balanceMatrix.months.length} meses
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Visión comparativa completa mes a mes: ingresos, gastos clasificados, liquidaciones de tarjeta y saldo neto
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs cursor-pointer transition-colors flex-shrink-0"
              title="Descargar tabla en archivo CSV para abrir en Excel o Numbers"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar a Excel (CSV)</span>
            </button>
          </div>

          {/* 2. Top Search Bar & Quick Filters Bar (Parte Superior) */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* High-Contrast Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Buscar partida, gasto o ingreso en el balance (ej: Coche, Gasolina, Nómina, Alquiler, Restaurantes...)"
                  className="w-full pl-10 pr-10 py-2.5 text-sm font-medium bg-neutral-50 dark:bg-[#181818] border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#222222] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
                  autoComplete="off"
                />
                {matrixSearch && (
                  <button
                    type="button"
                    onClick={() => setMatrixSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Match Counter Badge */}
              {matrixSearch && (
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 whitespace-nowrap">
                  <span>{totalMatchesCount} {totalMatchesCount === 1 ? 'partida coincidente' : 'partidas coincidentes'}</span>
                  <button
                    onClick={() => setMatrixSearch('')}
                    className="text-xs text-indigo-500 hover:text-indigo-700 underline font-normal cursor-pointer ml-1"
                  >
                    Ver todas
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filter Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800/70 text-xs">
              <span className="text-neutral-400 text-[11px] font-medium mr-1">Filtros rápidos:</span>
              {[
                { label: 'Todo', query: '' },
                { label: '🚗 Coche', query: 'coche' },
                { label: '⛽ Gasolina', query: 'gasolina' },
                { label: '🏠 Alquiler / Hogar', query: 'hogar' },
                { label: '🛒 Supermercado', query: 'supermercado' },
                { label: '🍽️ Restaurantes', query: 'restaurante' },
                { label: '💼 Nómina', query: 'nómina' },
                { label: '💳 Tarjetas', query: 'tarjeta' },
                { label: '🔄 Traspasos', query: 'traspaso' }
              ].map((pill) => {
                const isSelected = (!matrixSearch && !pill.query) || (matrixSearch.toLowerCase() === pill.query.toLowerCase());
                return (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => setMatrixSearch(pill.query)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                        : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Executive KPI Metric Strip */}
          {balanceMatrix && balanceMatrix.income && balanceMatrix.income.total && balanceMatrix.months?.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Ingresos */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium">Total Ingresos ({balanceMatrix.months?.length || 0}m)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {(balanceMatrix.income?.total?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Media: {(balanceMatrix.income?.total?.average || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € / mes
                </div>
              </div>

              {/* Gastos Personales */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium">Gastos Personales Reales</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {(balanceMatrix.personal_expenses?.total?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Media: {(balanceMatrix.personal_expenses?.total?.average || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € / mes
                </div>
              </div>

              {/* Ahorro Neto Total */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium">Ahorro Neto Acumulado</span>
                  <span className={`w-2 h-2 rounded-full ${(balanceMatrix.results?.net_savings?.total || 0) >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                </div>
                <div className={`text-lg font-bold font-mono ${(balanceMatrix.results?.net_savings?.total || 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {(balanceMatrix.results?.net_savings?.total || 0) >= 0 ? '+' : ''}{(balanceMatrix.results?.net_savings?.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Media: {(balanceMatrix.results?.net_savings?.average || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € / mes
                </div>
              </div>

              {/* Tasa Media de Ahorro */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium">Tasa Media de Ahorro</span>
                  <span className="text-[11px] text-indigo-500 font-semibold">% retención</span>
                </div>
                <div className="text-lg font-bold text-neutral-900 dark:text-white font-mono">
                  {balanceMatrix.results?.savings_rate?.average || 0}%
                </div>
                <div className="text-[11px] text-neutral-400">
                  {balanceMatrix.personal_expenses?.rows?.length || 0} categorías de consumo
                </div>
              </div>
            </div>
          )}

          {/* 4. Full-Width Wide Table */}
          {loadingMatrix || !balanceMatrix ? (
            <div className="p-12 text-center text-xs text-neutral-400 bg-white dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800">
              Cargando matriz financiera...
            </div>
          ) : (!balanceMatrix.months || balanceMatrix.months.length === 0) ? (
            <div className="p-12 text-center bg-white dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="text-3xl">📊</div>
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Sin movimientos registrados aún</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                La matriz financiera mensual se construirá automáticamente al importar tus extractos bancarios o añadir transacciones.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <span>Importar extractos bancarios</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans min-w-[1100px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-neutral-100/95 dark:bg-[#282828] border-b border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] whitespace-nowrap">
                      <th className="py-3 px-4 min-w-[280px] xl:min-w-[340px] sticky left-0 bg-neutral-100/95 dark:bg-[#282828] z-30 border-r border-neutral-200/80 dark:border-neutral-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider text-[10.5px]">Concepto / Partida</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({balanceMatrix.personal_expenses.rows.length} categorías)</span>
                        </div>
                      </th>
                      {balanceMatrix.months.map(m => (
                        <th key={m} className="py-3 px-3.5 text-right font-mono min-w-[110px] xl:min-w-[125px]">
                          {m}
                        </th>
                      ))}
                      <th className="py-3 px-3.5 text-right font-mono min-w-[120px] xl:min-w-[135px] bg-neutral-200/40 dark:bg-neutral-700/40 font-semibold">
                        Media Mensual
                      </th>
                      <th className="py-3 px-4 text-right font-mono min-w-[135px] xl:min-w-[150px] bg-neutral-200/70 dark:bg-neutral-700/70 font-bold">
                        Total ({balanceMatrix.months.length} Meses)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800 text-[11.5px]">
                    {/* SECTION 1: INGRESOS */}
                    {filteredIncomeRows.length > 0 && (
                      <>
                        <tr className="bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            🟢 1. Ingresos {searchNorm && <span className="ml-2 font-normal text-[11px] text-emerald-700 dark:text-emerald-300 lowercase">({filteredIncomeRows.length} partidas)</span>}
                          </td>
                        </tr>
                        {filteredIncomeRows.map(r => (
                          <tr key={r.name} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center justify-between">
                                <span>{r.name}</span>
                                {searchNorm && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-normal">coincidencia</span>}
                              </div>
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-2.5 px-3.5 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {r.by_month[m] ? `${r.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-600 dark:text-neutral-400">
                              {r.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-neutral-900 dark:text-white">
                              {r.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        ))}
                        {/* Total Income Row (when no search active) */}
                        {!searchNorm && (
                          <tr className="bg-emerald-50/40 dark:bg-emerald-950/10 font-bold border-t-2 border-emerald-300/80 dark:border-emerald-800/60">
                            <td className="py-3 px-4 text-emerald-900 dark:text-emerald-300 sticky left-0 bg-emerald-50/40 dark:bg-[#202020] z-10 border-r border-neutral-200/80 dark:border-neutral-800">
                              {balanceMatrix.income.total.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-3 px-3.5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                                {balanceMatrix.income.total.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                              </td>
                            ))}
                            <td className="py-3 px-3.5 text-right font-mono bg-emerald-100/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                              {balanceMatrix.income.total.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-3 px-4 text-right font-mono bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
                              {balanceMatrix.income.total.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        )}
                      </>
                    )}

                    {/* SECTION 2: GASTOS PERSONALES REALES */}
                    {filteredExpenseRows.length > 0 && (
                      <>
                        <tr className="bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            🔴 2. Gastos Personales Reales (Consumo) {searchNorm && <span className="ml-2 font-normal text-[11px] text-rose-700 dark:text-rose-300 lowercase">({filteredExpenseRows.length} partidas)</span>}
                          </td>
                        </tr>
                        {filteredExpenseRows.map(r => (
                          <tr key={r.name} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center justify-between">
                                <span>{r.name}</span>
                                <span className="text-[10px] text-neutral-400 font-mono ml-2">({r.percentage}%)</span>
                              </div>
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-2.5 px-3.5 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {r.by_month[m] ? `${r.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-600 dark:text-neutral-400">
                              {r.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-neutral-900 dark:text-white">
                              {r.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        ))}
                        {/* Total Personal Expenses Row (when no search active) */}
                        {!searchNorm && (
                          <tr className="bg-rose-50/40 dark:bg-rose-950/10 font-bold border-t-2 border-rose-300/80 dark:border-rose-800/60">
                            <td className="py-3 px-4 text-rose-900 dark:text-rose-300 sticky left-0 bg-rose-50/40 dark:bg-[#202020] z-10 border-r border-neutral-200/80 dark:border-neutral-800">
                              {balanceMatrix.personal_expenses.total.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-3 px-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                                {balanceMatrix.personal_expenses.total.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                              </td>
                            ))}
                            <td className="py-3 px-3.5 text-right font-mono bg-rose-100/30 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                              {balanceMatrix.personal_expenses.total.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-3 px-4 text-right font-mono bg-rose-100/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200">
                              {balanceMatrix.personal_expenses.total.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        )}
                      </>
                    )}

                    {/* SECTION 3: LIQUIDACIÓN DE TARJETAS */}
                    {filteredCardRows.length > 0 && (
                      <>
                        <tr className="bg-purple-50/70 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            <div className="flex items-center justify-between">
                              <span>💳 3. Liquidación Tarjetas (Informativo — Deduplicado)</span>
                              <span className="text-[10px] lowercase font-normal italic text-purple-700 dark:text-purple-300">
                                No computa en gasto personal para no duplicar con extractos
                              </span>
                            </div>
                          </td>
                        </tr>
                        {filteredCardRows.map(r => (
                          <tr key={r.name} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              {r.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-2.5 px-3.5 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {r.by_month[m] ? `${r.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-600 dark:text-neutral-400">
                              {r.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-neutral-900 dark:text-white">
                              {r.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        ))}
                        {/* Total Card Settlements Row (when no search active) */}
                        {!searchNorm && (
                          <tr className="bg-purple-50/40 dark:bg-purple-950/10 font-bold border-t border-purple-200 dark:border-purple-800/40">
                            <td className="py-3 px-4 text-purple-900 dark:text-purple-300 sticky left-0 bg-purple-50/40 dark:bg-[#202020] z-10 border-r border-neutral-200/80 dark:border-neutral-800">
                              {balanceMatrix.card_settlements.total.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-3 px-3.5 text-right font-mono text-purple-700 dark:text-purple-400">
                                {balanceMatrix.card_settlements.total.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                              </td>
                            ))}
                            <td className="py-3 px-3.5 text-right font-mono bg-purple-100/30 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300">
                              {balanceMatrix.card_settlements.total.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-3 px-4 text-right font-mono bg-purple-100/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200">
                              {balanceMatrix.card_settlements.total.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        )}
                      </>
                    )}

                    {/* SECTION 4: TRASPASOS ENTRE CUENTAS PROPIAS Y AMEX */}
                    {filteredTransferRows.length > 0 && (
                      <>
                        <tr className="bg-violet-50/70 dark:bg-violet-950/20 text-violet-900 dark:text-violet-300 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            <div className="flex items-center justify-between">
                              <span>🔄 4. Traspasos Entre Cuentas Propias y Amex (Informativo)</span>
                              <span className="text-[10px] lowercase font-normal italic text-violet-700 dark:text-violet-300">
                                Movimientos internos de liquidez. 0 impacto en gasto ni en ingresos
                              </span>
                            </div>
                          </td>
                        </tr>
                        {filteredTransferRows.map(r => (
                          <tr key={r.name} className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              {r.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-2.5 px-3.5 text-right font-mono text-neutral-700 dark:text-neutral-300">
                                {r.by_month[m] ? `${r.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-600 dark:text-neutral-400">
                              {r.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-neutral-900 dark:text-white">
                              {r.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* SECTION 5: GASTOS DE TRABAJO REEMBOLSABLES */}
                    {enableCompanyExpenses && hasCompanyOutlaysMatch && balanceMatrix.company_reimbursements && balanceMatrix.company_reimbursements.has_data && (
                      <>
                        <tr className="bg-sky-50/70 dark:bg-sky-950/20 text-sky-900 dark:text-sky-300 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            💼 5. Gastos Reembolsables de Trabajo (Informativo)
                          </td>
                        </tr>
                        <tr className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {balanceMatrix.company_reimbursements.outlays.name}
                          </td>
                          {balanceMatrix.months.map(m => (
                            <td key={m} className="py-2.5 px-3.5 text-right font-mono text-neutral-700 dark:text-neutral-300">
                              {balanceMatrix.company_reimbursements.outlays.by_month[m] ? `${balanceMatrix.company_reimbursements.outlays.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                            </td>
                          ))}
                          <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-500">
                            —
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-sky-700 dark:text-sky-300">
                            {balanceMatrix.company_reimbursements.outlays.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                        </tr>
                        <tr className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-2.5 px-4 pl-6 font-medium text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {balanceMatrix.company_reimbursements.received.name}
                          </td>
                          {balanceMatrix.months.map(m => (
                            <td key={m} className="py-2.5 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {balanceMatrix.company_reimbursements.received.by_month[m] ? `+${balanceMatrix.company_reimbursements.received.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                            </td>
                          ))}
                          <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 text-neutral-500">
                            —
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold bg-neutral-50/90 dark:bg-neutral-800/40 text-emerald-600 dark:text-emerald-400">
                            +{balanceMatrix.company_reimbursements.received.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                        </tr>
                      </>
                    )}

                    {/* SECTION 6: RESULTADO, AHORRO Y PATRIMONIO */}
                    {(!searchNorm || ['ahorro', 'resultado', 'tasa', 'patrimonio', 'neto'].some(k => searchNorm.includes(k))) && (
                      <>
                        <tr className="bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 font-bold text-xs">
                          <td colSpan={balanceMatrix.months.length + 3} className="py-2.5 px-4 tracking-wide uppercase text-[10.5px] sticky left-0">
                            📈 6. Resultado Neto y Capacidad de Ahorro
                          </td>
                        </tr>
                        {/* Ahorro Neto Personal */}
                        <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold">
                          <td className="py-3 px-4 text-indigo-900 dark:text-indigo-200 sticky left-0 bg-indigo-50/30 dark:bg-[#202020] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {balanceMatrix.results.net_savings.name}
                          </td>
                          {balanceMatrix.months.map(m => {
                            const val = balanceMatrix.results.net_savings.by_month[m];
                            return (
                              <td key={m} className={`py-3 px-3.5 text-right font-mono font-bold ${
                                val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                              </td>
                            );
                          })}
                          <td className="py-3 px-3.5 text-right font-mono bg-indigo-100/40 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 font-bold">
                            {balanceMatrix.results.net_savings.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="py-3 px-4 text-right font-mono bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 font-bold">
                            {balanceMatrix.results.net_savings.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                        </tr>
                        {/* Tasa de Ahorro */}
                        <tr className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-2.5 px-4 pl-6 font-semibold text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {balanceMatrix.results.savings_rate.name}
                          </td>
                          {balanceMatrix.months.map(m => (
                            <td key={m} className="py-2.5 px-3.5 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                              {balanceMatrix.results.savings_rate.by_month[m]}%
                            </td>
                          ))}
                          <td className="py-2.5 px-3.5 text-right font-mono bg-neutral-50/60 dark:bg-neutral-800/20 font-bold text-neutral-800 dark:text-neutral-100">
                            {balanceMatrix.results.savings_rate.average}%
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold bg-neutral-50/90 dark:bg-neutral-800/40 text-neutral-800 dark:text-neutral-100">
                            {balanceMatrix.results.savings_rate.average}% (media)
                          </td>
                        </tr>
                        {/* Inversiones si existen */}
                        {balanceMatrix.results.investments && (
                          <tr className="group hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 px-4 pl-6 font-semibold text-neutral-800 dark:text-neutral-200 sticky left-0 bg-white dark:bg-[#202020] group-hover:bg-neutral-50 dark:group-hover:bg-[#262626] z-10 border-r border-neutral-200/80 dark:border-neutral-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              {balanceMatrix.results.investments.name}
                            </td>
                            {balanceMatrix.months.map(m => (
                              <td key={m} className="py-2.5 px-3.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {balanceMatrix.results.investments.by_month[m] ? `${balanceMatrix.results.investments.by_month[m].toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                              </td>
                            ))}
                            <td className="py-2.5 px-3.5 text-right font-mono bg-indigo-50/60 dark:bg-neutral-800/20 font-bold text-indigo-700 dark:text-indigo-300">
                              {balanceMatrix.results.investments.average.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">
                              {balanceMatrix.results.investments.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </td>
                          </tr>
                        )}
                      </>
                    )}

                    {/* EMPTY SEARCH STATE (No matches found) */}
                    {searchNorm && totalMatchesCount === 0 && (
                      <tr>
                        <td colSpan={balanceMatrix.months.length + 3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                            <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                              No se encontraron partidas que coincidan con "{matrixSearch}"
                            </p>
                            <p className="text-xs text-neutral-400">
                              Prueba con otro término (ej: "coche", "gasolina", "supermercado", "alquiler") o pulsa el botón para restablecer.
                            </p>
                            <button
                              type="button"
                              onClick={() => setMatrixSearch('')}
                              className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors cursor-pointer"
                            >
                              Limpiar filtro de búsqueda
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 4: EVOLUCIÓN DEL PATRIMONIO Y AHORRO ACUMULADO */}
      {/* ============================================================== */}
      {activeViewMode === 'wealth' && (
        <div className="space-y-6">
          {/* Header & Verification Banner */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Evolución del Ahorro y Capacidad Patrimonial</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Progresión histórica mes a mes de ingresos reales, consumo personal neto, tasa de ahorro y aportaciones a inversión
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Datos 100% Reales de Extractos Bancarios</span>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-[#252528] p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
              💡 <strong>¿Cómo se calculan estos datos?</strong> Proceden íntegramente de tus movimientos reales conciliados (Santander, N26, Iberia Cards, Amex y MyInvestor). Se deduplican los traspasos entre cuentas y liquidaciones de tarjeta para que el ahorro y el gasto mensual no estén artificialmente inflados.
            </div>
          </div>

          {/* Period Selector & View Mode Controls Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Presets & Custom Months */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  Periodo:
                </span>

                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => handleSelectWealthPreset('3m')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      wealthRangePreset === '3m'
                        ? 'bg-white dark:bg-[#2a2a2a] text-neutral-900 dark:text-white font-bold shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Últimos 3 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWealthPreset('6m')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      wealthRangePreset === '6m'
                        ? 'bg-white dark:bg-[#2a2a2a] text-neutral-900 dark:text-white font-bold shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Últimos 6 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWealthPreset('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      wealthRangePreset === 'all'
                        ? 'bg-white dark:bg-[#2a2a2a] text-neutral-900 dark:text-white font-bold shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Todo el Histórico
                  </button>
                </div>

                {/* Custom Month Range Pickers */}
                {balanceMatrix?.months && (
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-500 pl-2">
                    <span>Desde:</span>
                    <select
                      value={wealthStartMonth}
                      onChange={(e) => {
                        setWealthRangePreset('custom');
                        setWealthStartMonth(e.target.value);
                      }}
                      className="font-mono text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 outline-none text-neutral-800 dark:text-neutral-200 cursor-pointer"
                    >
                      {balanceMatrix.months.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <span>Hasta:</span>
                    <select
                      value={wealthEndMonth}
                      onChange={(e) => {
                        setWealthRangePreset('custom');
                        setWealthEndMonth(e.target.value);
                      }}
                      className="font-mono text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 outline-none text-neutral-800 dark:text-neutral-200 cursor-pointer"
                    >
                      {balanceMatrix.months.filter(m => !wealthStartMonth || m >= wealthStartMonth).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Chart Mode Selector Buttons */}
              <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setWealthChartMode('accumulated')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                    wealthChartMode === 'accumulated'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  📈 Ahorro Acumulado
                </button>
                <button
                  type="button"
                  onClick={() => setWealthChartMode('income_vs_expense')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                    wealthChartMode === 'income_vs_expense'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  ⚖️ Ingresos vs Gastos
                </button>
                <button
                  type="button"
                  onClick={() => setWealthChartMode('savings_rate')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                    wealthChartMode === 'savings_rate'
                      ? 'bg-violet-600 text-white font-bold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  🎯 Tasa de Ahorro (%)
                </button>
              </div>
            </div>
          </div>

          {/* Period Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Ingresos Totales Periodo */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500 block">Ingresos Totales ({periodKpis.monthsCount}m)</span>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                +{periodKpis.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <span className="text-[10px] text-neutral-400 block">
                Media: {(periodKpis.monthsCount > 0 ? periodKpis.totalIncome / periodKpis.monthsCount : 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €/mes
              </span>
            </div>

            {/* 2. Gastos Personales Periodo */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500 block">Gastos Personales ({periodKpis.monthsCount}m)</span>
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                -{periodKpis.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <span className="text-[10px] text-neutral-400 block">
                Media: {(periodKpis.monthsCount > 0 ? periodKpis.totalExpenses / periodKpis.monthsCount : 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €/mes
              </span>
            </div>

            {/* 3. Ahorro Neto Generado */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1 ${
              periodKpis.totalSavings >= 0 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' 
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
            }`}>
              <span className="text-[11px] font-medium text-neutral-500 block">Ahorro Neto Generado</span>
              <div className={`text-lg font-bold font-mono ${periodKpis.totalSavings >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {periodKpis.totalSavings >= 0 ? `+${periodKpis.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : periodKpis.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <span className="text-[10px] text-neutral-500 block">
                Flujo neto libre en el periodo
              </span>
            </div>

            {/* 4. Tasa Media Ahorro */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 block">Tasa Media Ahorro</span>
                {periodKpis.avgRate >= 20 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Meta ≥20%
                  </span>
                )}
              </div>
              <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {periodKpis.avgRate}%
              </div>
              <span className="text-[10px] text-neutral-400 block">
                {periodKpis.avgRate >= 20 ? 'Excelente capacidad de ahorro' : 'Por debajo del 20% objetivo'}
              </span>
            </div>

            {/* 5. Aportado a Inversión */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-neutral-500 block">Destinado a Inversión / MSCI</span>
              <div className="text-lg font-bold font-mono text-violet-600 dark:text-violet-400">
                {periodKpis.totalInvestments.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <span className="text-[10px] text-neutral-400 block">
                Fondo MSCI World y Ahorro
              </span>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {wealthChartMode === 'accumulated' && `Progresión del Ahorro Neto Acumulado (${wealthStartMonth} — ${wealthEndMonth})`}
                  {wealthChartMode === 'income_vs_expense' && `Comparativa de Ingresos vs Gastos Personales (${wealthStartMonth} — ${wealthEndMonth})`}
                  {wealthChartMode === 'savings_rate' && `Evolución Mensual de la Tasa de Ahorro (${wealthStartMonth} — ${wealthEndMonth})`}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {wealthChartMode === 'accumulated' && `Crecimiento continuo del flujo de caja positivo generado a lo largo del periodo`}
                  {wealthChartMode === 'income_vs_expense' && `Nómina e ingresos reales frente a tus gastos de consumo mes a mes`}
                  {wealthChartMode === 'savings_rate' && `Porcentaje de ingresos ahorrado en cada mes frente a la meta recomendada del 20%`}
                </p>
              </div>

              {wealthChartMode === 'accumulated' && (
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-neutral-600 dark:text-neutral-400">Ahorro Acumulado</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="text-neutral-600 dark:text-neutral-400">Ahorro Mes</span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {wealthChartMode === 'accumulated' && (
                  <AreaChart data={filteredWealthData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <Tooltip 
                      formatter={(val, name) => [
                        `${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 
                        name === 'period_cumulative_savings' ? 'Ahorro Acumulado Periodo' : 'Ahorro del Mes'
                      ]}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                        borderColor: darkMode ? '#383838' : '#e5e7eb', 
                        color: darkMode ? '#f3f4f6' : '#111827', 
                        borderRadius: '8px', 
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                      }}
                      itemStyle={{ color: darkMode ? '#f3f4f6' : '#111827' }}
                    />
                    <Area type="monotone" dataKey="period_cumulative_savings" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCum)" />
                    <Area type="monotone" dataKey="net_savings" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthly)" />
                  </AreaChart>
                )}

                {wealthChartMode === 'income_vs_expense' && (
                  <BarChart data={filteredWealthData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <Tooltip 
                      formatter={(val, name) => [
                        `${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 
                        name === 'income' ? 'Ingresos Reales' : (name === 'expenses' ? 'Gastos Personales' : 'Ahorro Neto')
                      ]}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                        borderColor: darkMode ? '#383838' : '#e5e7eb', 
                        color: darkMode ? '#f3f4f6' : '#111827', 
                        borderRadius: '8px', 
                        fontSize: '11px' 
                      }}
                    />
                    <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}

                {wealthChartMode === 'savings_rate' && (
                  <LineChart data={filteredWealthData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${v}%`} 
                      tick={{ fontSize: 11, fill: darkMode ? '#a3a3a3' : '#525252' }} 
                      stroke={darkMode ? '#404040' : '#d4d4d4'}
                      domain={[-10, 'auto']}
                    />
                    <ReferenceLine y={20} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Meta: 20%', fill: '#10B981', fontSize: 10 }} />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, 'Tasa de Ahorro']}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
                        borderColor: darkMode ? '#383838' : '#e5e7eb', 
                        color: darkMode ? '#f3f4f6' : '#111827', 
                        borderRadius: '8px', 
                        fontSize: '11px' 
                      }}
                    />
                    <Line type="monotone" dataKey="savings_rate" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#8B5CF6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Monthly Data Table (Data Transparency & Audit) */}
          <div className="bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-indigo-500" />
                  <span>Desglose Detallado Mes a Mes ({wealthStartMonth} — {wealthEndMonth})</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Auditoría completa de flujos de caja reales extraídos de tus extractos bancarios
                </p>
              </div>

              <span className="text-xs font-mono text-neutral-400">
                {filteredWealthData.length} meses analizados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans min-w-[760px]">
                <thead>
                  <tr className="bg-neutral-100/90 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] whitespace-nowrap">
                    <th className="py-2.5 px-3.5">Mes</th>
                    <th className="py-2.5 px-3 text-right">Ingresos Reales</th>
                    <th className="py-2.5 px-3 text-right">Gastos Personales</th>
                    <th className="py-2.5 px-3 text-right">Ahorro Neto</th>
                    <th className="py-2.5 px-3 text-right">Tasa Ahorro</th>
                    <th className="py-2.5 px-3 text-right">Invertido (MSCI)</th>
                    <th className="py-2.5 px-3 text-right">Ahorro Acumulado</th>
                    <th className="py-2.5 px-3.5 text-center">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800 text-[11.5px] whitespace-nowrap">
                  {filteredWealthData.map((row) => {
                    const isPositive = (row.net_savings || 0) >= 0;
                    const isBest = periodKpis.bestMonth && periodKpis.bestMonth.month === row.month && isPositive;
                    const isHighSavings = (row.savings_rate || 0) >= 20;

                    return (
                      <tr key={row.month} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                        <td className="py-2 px-3.5 font-bold font-mono text-neutral-900 dark:text-white">
                          {row.month}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          +{(row.income || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-medium">
                          -{(row.expenses || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                        }`}>
                          {isPositive ? `+${(row.net_savings || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : (row.net_savings || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-neutral-800 dark:text-neutral-200">
                          {row.savings_rate || 0}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-violet-600 dark:text-violet-400 font-medium">
                          {(row.investments || 0) > 0 ? `${row.investments.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                          +{(row.period_cumulative_savings || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-2 px-3.5 text-center">
                          {isBest ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800/60">
                              <Sparkles className="w-2.5 h-2.5" />
                              Mejor Mes
                            </span>
                          ) : isHighSavings ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                              🟢 Óptimo (≥20%)
                            </span>
                          ) : isPositive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                              🟡 Moderado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-medium">
                              🔴 Déficit
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-100/90 dark:bg-neutral-800/90 border-t-2 border-neutral-300 dark:border-neutral-700 font-bold text-[11px] whitespace-nowrap">
                    <td className="py-2.5 px-3.5 text-neutral-900 dark:text-white font-mono">
                      TOTAL ({periodKpis.monthsCount} MESES)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">
                      +{periodKpis.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 dark:text-rose-300">
                      -{periodKpis.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono ${periodKpis.totalSavings >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {periodKpis.totalSavings >= 0 ? `+${periodKpis.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : periodKpis.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-700 dark:text-indigo-300">
                      {periodKpis.avgRate}% (media)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-violet-700 dark:text-violet-300">
                      {periodKpis.totalInvestments.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-900 dark:text-white">
                      +{periodKpis.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-2.5 px-3.5 text-center text-neutral-500">
                      Período completo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Connection to Real Balance Sheet (Activos vs Pasivos) */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Foto de Balance Patrimonial Actual
                </span>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  {Number(portfolio?.net_worth ?? portfolio?.capital_global ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  <span className="text-xs text-neutral-400 font-normal ml-2">Patrimonio Neto Real</span>
                </div>
                <p className="text-xs text-neutral-300 max-w-xl pt-0.5">
                  Activos Totales: <strong>{Number(portfolio?.gross_capital || portfolio?.capital_global || 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</strong> (Fondo MSCI + Acciones + Liquidez en cuentas) — Deuda Viva Financiaciones: <strong className="text-rose-400">-{Number(portfolio?.total_debt || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong> ({portfolio?.active_loans_count || 0} préstamos activos).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('portfolio')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors border border-white/20"
                >
                  Ver Inversiones & Metas →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('loans')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold cursor-pointer transition-colors border border-amber-500/40"
                >
                  Ver Créditos ({portfolio?.active_loans_count || 0}) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
