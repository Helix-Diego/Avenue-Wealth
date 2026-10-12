import React, { useState, useEffect } from 'react';
import { authFetch } from '../supabaseClient';
import {
  Landmark,
  Percent,
  Calendar,
  CreditCard,
  CheckCircle2,
  Calculator,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Trash2,
  TrendingDown,
  PiggyBank,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  ShoppingBag,
  AlertCircle,
  Link2,
  Unlink,
  Search,
  CheckSquare,
  Square,
  Check
} from 'lucide-react';

export default function LoansView({ setActiveTab }) {
  const [loansData, setLoansData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [simMode, setSimMode] = useState('reduce_payment'); // 'reduce_payment' | 'reduce_term'
  const [simExtraAmortization, setSimExtraAmortization] = useState(0);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true);
  const [filterState, setFilterState] = useState('all'); // 'all' | 'disbursement' | 'installment' | 'completed'

  // Candidate Transaction Linking Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [candidateList, setCandidateList] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    entity: 'Banco Santander',
    loan_type: 'loan_disbursement', // 'loan_disbursement' | 'installment_purchase'
    financed_item: '',
    initial_principal: 1000,
    interest_rate_pct: 0,
    term_months: 12,
    monthly_installment: '',
    start_date: new Date().toISOString().split('T')[0],
    account_name: 'Santander (*3012)',
    match_pattern: '',
    disbursement_tx_id: null,
    notes: ''
  });

  const calcFrenchPayment = (principal, ratePct, months) => {
    if (!principal || !months || months <= 0) return 0;
    const p = parseFloat(principal) || 0;
    const r = ((parseFloat(ratePct) || 0) / 100) / 12;
    const n = parseInt(months, 10) || 1;
    if (r > 0) {
      const pmt = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return Math.round(pmt * 100) / 100;
    }
    return Math.round((p / n) * 100) / 100;
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/loans');
      const data = await res.json();
      setLoansData(data);
      if (data.loans && data.loans.length > 0) {
        if (!selectedLoan || !data.loans.find(l => l.id === selectedLoan.id)) {
          setSelectedLoan(data.loans[0]);
        } else {
          setSelectedLoan(data.loans.find(l => l.id === selectedLoan.id));
        }
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleOpenCreateModal = (prefill = null) => {
    if (prefill) {
      const p = prefill.amount || 1000;
      const r = 4.78;
      const m = 48;
      setCreateForm({
        name: `Préstamo ${prefill.account || 'Bancario'}`,
        entity: prefill.account?.includes('Santander') ? 'Banco Santander' : 'Entidad Financiera',
        loan_type: 'loan_disbursement',
        financed_item: 'Vehículo / Coche',
        initial_principal: p,
        interest_rate_pct: r,
        term_months: m,
        monthly_installment: calcFrenchPayment(p, r, m),
        start_date: prefill.date || new Date().toISOString().split('T')[0],
        account_name: prefill.account || 'Santander (*3012)',
        match_pattern: prefill.description?.slice(0, 15) || '',
        disbursement_tx_id: prefill.id || null,
        notes: `Detectado a partir del ingreso de abono: ${prefill.description || ''}`
      });
    } else {
      setCreateForm({
        name: '',
        entity: 'Banco Santander',
        loan_type: 'loan_disbursement',
        financed_item: '',
        initial_principal: 1000,
        interest_rate_pct: 0,
        term_months: 12,
        monthly_installment: calcFrenchPayment(1000, 0, 12),
        start_date: new Date().toISOString().split('T')[0],
        account_name: 'Santander (*3012)',
        match_pattern: '',
        disbursement_tx_id: null,
        notes: ''
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateLoan = async () => {
    if (!createForm.name && !createForm.financed_item) {
      alert('Por favor, indica qué estás financiando o el nombre del crédito.');
      return;
    }
    const finalName = createForm.name || createForm.financed_item;
    const finalItem = createForm.financed_item || createForm.name;
    const pmt = createForm.monthly_installment 
      ? parseFloat(createForm.monthly_installment) 
      : calcFrenchPayment(createForm.initial_principal, createForm.interest_rate_pct, createForm.term_months);

    try {
      const res = await authFetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          name: finalName,
          financed_item: finalItem,
          monthly_installment: pmt
        })
      });
      const data = await res.json();
      setLoansData(data);
      setIsCreateModalOpen(false);
      if (data.loans && data.loans.length > 0) {
        setSelectedLoan(data.loans[data.loans.length - 1]);
      }
    } catch (err) {
      console.error('Error creating loan:', err);
    }
  };

  const handleStartEdit = (loan) => {
    setEditingLoan(loan.id);
    setEditForm({
      name: loan.name,
      financed_item: loan.financed_item || loan.name,
      loan_type: loan.loan_type || 'loan_disbursement',
      initial_principal: loan.initial_principal,
      interest_rate_pct: loan.interest_rate_pct,
      monthly_installment: loan.monthly_installment,
      term_months: loan.term_months,
      match_pattern: loan.match_pattern || '',
      notes: loan.notes || ''
    });
  };

  const handleSaveEdit = async (loanId) => {
    try {
      const payload = {
        ...editForm,
        initial_principal: parseFloat(editForm.initial_principal) || 0,
        interest_rate_pct: parseFloat(editForm.interest_rate_pct) || 0,
        monthly_installment: parseFloat(editForm.monthly_installment) || 0,
        term_months: parseInt(editForm.term_months, 10) || 12
      };
      const res = await authFetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLoansData(data);
      setEditingLoan(null);
      const updated = data.loans.find(l => l.id === loanId);
      if (updated) setSelectedLoan(updated);
    } catch (err) {
      console.error('Error updating loan:', err);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta financiación del seguimiento?')) {
      return;
    }
    try {
      const res = await authFetch(`/api/loans/${loanId}`, { method: 'DELETE' });
      const data = await res.json();
      setLoansData(data);
      setEditingLoan(null);
      if (data.loans && data.loans.length > 0) {
        setSelectedLoan(data.loans[0]);
      } else {
        setSelectedLoan(null);
      }
    } catch (err) {
      console.error('Error deleting loan:', err);
    }
  };

  // Transaction Linking Handlers
  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setSelectedCandidateIds([]);
    setCandidateSearch('');
    fetchCandidates('');
  };

  const fetchCandidates = async (query = '') => {
    setLoadingCandidates(true);
    try {
      const res = await authFetch(`/api/loans/search-candidates?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setCandidateList(data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const toggleSelectCandidate = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLinkTransactions = async () => {
    if (!selectedLoan || selectedCandidateIds.length === 0) return;
    try {
      const res = await authFetch(`/api/loans/${selectedLoan.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: selectedCandidateIds })
      });
      const data = await res.json();
      setLoansData(data);
      const updated = data.loans.find(l => l.id === selectedLoan.id);
      if (updated) setSelectedLoan(updated);
      setIsLinkModalOpen(false);
      setSelectedCandidateIds([]);
    } catch (err) {
      console.error('Error linking transactions:', err);
    }
  };

  const handleUnlinkTransaction = async (txId) => {
    if (!selectedLoan) return;
    try {
      const res = await authFetch(`/api/loans/${selectedLoan.id}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: [txId] })
      });
      const data = await res.json();
      setLoansData(data);
      const updated = data.loans.find(l => l.id === selectedLoan.id);
      if (updated) setSelectedLoan(updated);
    } catch (err) {
      console.error('Error unlinking transaction:', err);
    }
  };

  if (loading && !loansData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-neutral-500 font-medium">Analizando créditos, amortizaciones e intereses en tiempo real...</p>
        </div>
      </div>
    );
  }

  const { global_kpis = {}, loans = [], unlinked_disbursements = [] } = loansData || {};

  const filteredLoans = loans.filter(l => {
    if (filterState === 'disbursement') return l.loan_type === 'loan_disbursement';
    if (filterState === 'installment') return l.loan_type === 'installment_purchase';
    if (filterState === 'completed') return l.outstanding_balance <= 0;
    return true;
  });

  const activeLoans = filteredLoans.filter(l => l.outstanding_balance > 0);
  const completedLoans = filteredLoans.filter(l => l.outstanding_balance <= 0);

  // Helper for formatting date strings YYYY-MM-DD to "Mes Año"
  const formatMonthYearStr = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.slice(0, 10).split('-');
      if (parts.length >= 2) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parts[2] ? parseInt(parts[2], 10) : 1);
        return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  const getFutureMonthYear = (monthsFromNow) => {
    if (monthsFromNow === undefined || monthsFromNow === null) return '';
    const d = new Date();
    d.setMonth(d.getMonth() + monthsFromNow);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Simulator calculation for selected loan
  const curPrincipal = selectedLoan ? selectedLoan.outstanding_balance : 0;
  const curRatePct = selectedLoan ? (selectedLoan.interest_rate_pct || 0) : 0;
  const curMonthlyRate = (curRatePct / 100) / 12;
  const curPmt = selectedLoan ? selectedLoan.monthly_installment : 0;
  const curMonths = selectedLoan ? (selectedLoan.months_remaining || selectedLoan.term_months || 1) : 1;

  // Extra amount to amortize (constrained by current outstanding principal)
  const effectiveExtra = Math.min(Math.max(0, simExtraAmortization), curPrincipal);
  const newBalance = Math.max(0, Math.round((curPrincipal - effectiveExtra) * 100) / 100);

  // Original projected completion date
  const originalEndDateStr = selectedLoan?.end_date 
    ? formatMonthYearStr(selectedLoan.end_date)
    : (selectedLoan?.projected_end_date ? formatMonthYearStr(selectedLoan.projected_end_date) : getFutureMonthYear(curMonths));

  // --- OPTION 1: REDUCIR CUOTA MENSUAL (Mantiene el plazo actual curMonths) ---
  let opt1NewPmt = curPmt;
  let opt1MonthlySavings = 0;
  let opt1TotalInterestSaved = 0;

  if (effectiveExtra <= 0) {
    opt1NewPmt = curPmt;
    opt1MonthlySavings = 0;
    opt1TotalInterestSaved = 0;
  } else if (curMonths > 0 && newBalance > 0) {
    if (curMonthlyRate > 0) {
      opt1NewPmt = newBalance * (curMonthlyRate * Math.pow(1 + curMonthlyRate, curMonths)) / (Math.pow(1 + curMonthlyRate, curMonths) - 1);
    } else {
      opt1NewPmt = newBalance / curMonths;
    }
    opt1NewPmt = Math.round(opt1NewPmt * 100) / 100;
    opt1MonthlySavings = Math.max(0, Math.round((curPmt - opt1NewPmt) * 100) / 100);

    const origTotalCost = curMonths * curPmt;
    const newTotalCost = (curMonths * opt1NewPmt) + effectiveExtra;
    opt1TotalInterestSaved = Math.max(0, Math.round((origTotalCost - newTotalCost) * 100) / 100);
  } else if (newBalance <= 0) {
    opt1NewPmt = 0;
    opt1MonthlySavings = curPmt;
    opt1TotalInterestSaved = Math.max(0, Math.round(((curMonths * curPmt) - effectiveExtra) * 100) / 100);
  }

  // --- OPTION 2: REDUCIR PLAZO / ADELANTAR FECHA FINAL (Mantiene la cuota curPmt) ---
  let opt2NewMonths = curMonths;
  let opt2MonthsSaved = 0;
  let opt2TotalInterestSaved = 0;
  let opt2NewEndDateStr = originalEndDateStr;

  if (effectiveExtra <= 0) {
    opt2NewMonths = curMonths;
    opt2MonthsSaved = 0;
    opt2TotalInterestSaved = 0;
    opt2NewEndDateStr = originalEndDateStr;
  } else if (curPmt > 0 && newBalance > 0) {
    if (curMonthlyRate > 0) {
      const ratio = 1 - (curMonthlyRate * newBalance / curPmt);
      if (ratio > 0) {
        opt2NewMonths = Math.ceil(-Math.log(ratio) / Math.log(1 + curMonthlyRate));
      } else {
        opt2NewMonths = 1;
      }
    } else {
      opt2NewMonths = Math.ceil(newBalance / curPmt);
    }
    opt2NewMonths = Math.min(curMonths, Math.max(1, opt2NewMonths));
    opt2MonthsSaved = Math.max(0, curMonths - opt2NewMonths);

    const origTotalCost = curMonths * curPmt;
    const newTotalCost = (opt2NewMonths * curPmt) + effectiveExtra;
    opt2TotalInterestSaved = Math.max(0, Math.round((origTotalCost - newTotalCost) * 100) / 100);

    if (opt2MonthsSaved > 0 && selectedLoan?.end_date) {
      try {
        const parts = selectedLoan.end_date.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1 - opt2MonthsSaved, 1);
        opt2NewEndDateStr = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      } catch (e) {
        opt2NewEndDateStr = getFutureMonthYear(opt2NewMonths);
      }
    } else {
      opt2NewEndDateStr = getFutureMonthYear(opt2NewMonths);
    }
  } else if (newBalance <= 0) {
    opt2NewMonths = 0;
    opt2MonthsSaved = curMonths;
    opt2TotalInterestSaved = Math.max(0, Math.round(((curMonths * curPmt) - effectiveExtra) * 100) / 100);
    opt2NewEndDateStr = 'Inmediato (Préstamo saldado)';
  }

  // Helper function to calculate capital required to reduce N months
  const calcAmortizationForMonthsReduction = (monthsToReduce) => {
    const targetRemaining = Math.max(1, curMonths - monthsToReduce);
    if (targetRemaining >= curMonths) return 0;
    if (curMonthlyRate > 0 && curPmt > 0) {
      const targetP = curPmt * (1 - Math.pow(1 + curMonthlyRate, -targetRemaining)) / curMonthlyRate;
      const extraNeeded = Math.max(0, curPrincipal - targetP);
      return Math.round(extraNeeded);
    } else {
      const targetP = curPmt * targetRemaining;
      return Math.max(0, Math.round(curPrincipal - targetP));
    }
  };

  const renderLoanCard = (loan) => {
    const isSelected = selectedLoan?.id === loan.id;
    const isCompleted = loan.outstanding_balance <= 0;
    const isDisbursement = loan.loan_type === 'loan_disbursement';

    return (
      <div
        key={loan.id}
        onClick={() => setSelectedLoan(loan)}
        className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs relative ${
          isSelected
            ? 'bg-white dark:bg-[#282828] border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
            : isCompleted
            ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700'
            : 'bg-white dark:bg-[#222222] border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                {loan.name}
              </span>
              {isCompleted ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Saldado
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                  isDisbursement 
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  {loan.interest_rate_pct > 0 ? `${loan.interest_rate_pct}% TIN` : '0% Sin interés'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-neutral-500 mt-1">
              <span className="px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                {isDisbursement ? '🏦 Préstamo Ingreso' : '💳 Pago en Cuotas'}
              </span>
              {loan.financed_item && (
                <span className="text-neutral-400 truncate">· {loan.financed_item}</span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className={`text-sm font-bold font-mono ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
              {loan.outstanding_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
            <span className="text-[10px] text-neutral-400">{isCompleted ? 'total saldado' : 'pendiente'}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-500">
              Financiado: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{loan.initial_principal.toLocaleString('es-ES')} €</strong>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{loan.progress_pct}%</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted 
                  ? 'bg-emerald-500' 
                  : isDisbursement 
                  ? 'bg-indigo-600 dark:bg-indigo-500' 
                  : 'bg-purple-600 dark:bg-purple-500'
              }`}
              style={{ width: `${loan.progress_pct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          {isCompleted ? (
            <>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 100% amortizado ({loan.amortized_amount.toLocaleString('es-ES')} €)
              </span>
              <span className="text-neutral-400 font-mono text-[10px]">Sin deuda</span>
            </>
          ) : (
            <>
              <span>Cuota mensual: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{loan.monthly_installment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></span>
              <span>Quedan: <strong className="text-neutral-800 dark:text-neutral-200">{loan.months_remaining} mes.</strong></span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e5e5e3] dark:border-[#2f2f2f] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
              Créditos, Préstamos & Pagos Financiados
            </h1>
          </div>
          <p className="text-xs text-[#787774] dark:text-[#9c9c9c] mt-1">
            Gestión integral de deuda: préstamos con ingreso a cuenta (vehículo, personal) y compras en cuotas (Apple, Klarna, tarjetas).
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Financiación</span>
          </button>

          <button
            onClick={fetchLoans}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#252525] border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Unlinked Loan Disbursements Detected Banner */}
      {unlinked_disbursements.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-indigo-50/60 dark:from-amber-950/30 dark:to-indigo-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Ingreso por préstamo detectado en tus extractos ({unlinked_disbursements.length})</span>
            </div>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            Hemos encontrado abonos positivos correspondientes a préstamos o créditos concedidos en tus cuentas que aún no tienen ficha de amortización asociada:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {unlinked_disbursements.map((tx) => (
              <div 
                key={tx.id} 
                className="p-2.5 rounded-lg bg-white dark:bg-[#252525] border border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                    {tx.description}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {tx.date} · {tx.account}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{tx.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                  <button
                    onClick={() => handleOpenCreateModal(tx)}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                  >
                    Dar de alta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Debt */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Deuda Viva Total
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono">
              {global_kpis.active_loans_count} activos
            </span>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono tracking-tight">
            {(global_kpis.outstanding_debt || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Capital total financiado:</span>
            <span className="font-mono font-medium">{(global_kpis.total_borrowed || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
          </div>
        </div>

        {/* Total Amortized */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" /> Capital Devuelto
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
              {global_kpis.global_progress_pct}% pagado
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {(global_kpis.total_amortized || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${global_kpis.global_progress_pct || 0}%` }}
            />
          </div>
        </div>

        {/* Monthly Burden */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Carga Mensual
            </span>
            <span className="text-[10px] text-neutral-400">Cuotas activas</span>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono tracking-tight">
            {(global_kpis.monthly_burden || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            <span className="text-xs font-normal text-neutral-400 ml-1">/mes</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Suma de cuotas periódicas de préstamos y pagos en cuotas.
          </p>
        </div>

        {/* Interest & Fees Paid */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-amber-500" /> Coste Financiero Pagado
            </span>
            <span className="text-[10px] text-neutral-400">Intereses & Comisiones</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {(global_kpis.total_interest_fees || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <p className="text-[11px] text-neutral-500">
            Intereses y comisiones bancarias abonadas hasta la fecha.
          </p>
        </div>
      </div>

      {/* Main Grid: Loans List & Detailed Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Loan Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Contratos & Financiaciones ({filteredLoans.length})
            </h2>
            <div className="flex items-center space-x-1 text-[11px] bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg flex-wrap">
              <button
                onClick={() => setFilterState('all')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${filterState === 'all' ? 'bg-white dark:bg-neutral-700 shadow-2xs font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterState('disbursement')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${filterState === 'disbursement' ? 'bg-white dark:bg-neutral-700 shadow-2xs font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
              >
                Préstamos
              </button>
              <button
                onClick={() => setFilterState('installment')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${filterState === 'installment' ? 'bg-white dark:bg-neutral-700 shadow-2xs font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
              >
                Cuotas BNPL
              </button>
              <button
                onClick={() => setFilterState('completed')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${filterState === 'completed' ? 'bg-white dark:bg-neutral-700 shadow-2xs font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
              >
                Saldados
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Active Loans Section */}
            {filterState !== 'completed' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-0.5">
                  <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Financiaciones en Curso ({activeLoans.length})
                  </span>
                  <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 font-bold">
                    {activeLoans.reduce((acc, l) => acc + l.outstanding_balance, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € pendientes
                  </span>
                </div>
                {activeLoans.length > 0 ? (
                  activeLoans.map((loan) => renderLoanCard(loan))
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-400">
                    No hay financiaciones activas en este filtro.
                  </div>
                )}
              </div>
            )}

            {/* Dedicated Completed Loans Section */}
            {(filterState === 'all' || filterState === 'completed') && completedLoans.length > 0 && (
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                <div
                  onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
                  className="flex items-center justify-between cursor-pointer p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Financiaciones Finalizadas ({completedLoans.length})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                    <span className="text-[11px] font-semibold">100% saldadas</span>
                    {isCompletedSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isCompletedSectionOpen && (
                  <div className="space-y-2.5">
                    {completedLoans.map((loan) => renderLoanCard(loan))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Loan Detail, Amortization Schedule & Simulator (7 cols) */}
        {selectedLoan && (
          <div className="lg:col-span-7 space-y-4">
            {/* Card Header & Controls */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {selectedLoan.loan_type === 'loan_disbursement' ? '🏦' : '💳'}
                    </span>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {selectedLoan.name}
                    </h2>
                    <button
                      onClick={() => handleStartEdit(selectedLoan)}
                      className="p-1 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                      title="Editar parámetros del préstamo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLoan(selectedLoan.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                      title="Eliminar financiación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {selectedLoan.loan_type === 'loan_disbursement' ? 'Préstamo con Abono en Cuenta' : 'Compra / Pago Financiado en Cuotas'}
                    </span>
                    <span>Entidad: <strong className="text-neutral-700 dark:text-neutral-300">{selectedLoan.entity}</strong></span>
                    <span>Cuenta de cargo: <strong className="text-neutral-700 dark:text-neutral-300">{selectedLoan.account_name}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-neutral-400">Total Inicial Financiado</span>
                  <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                    {selectedLoan.initial_principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  {selectedLoan.financed_item && (
                    <span className="text-[11px] text-neutral-500 font-medium">Financia: {selectedLoan.financed_item}</span>
                  )}
                </div>
              </div>

              {/* Edit Mode Inline */}
              {editingLoan === selectedLoan.id && (
                <div className="p-4 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Ajustar Parámetros Financieros & Cuota
                    </span>
                    <button onClick={() => setEditingLoan(null)} className="text-neutral-400 hover:text-neutral-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Concepto / Nombre:</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full mt-1 p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">¿Qué estás financiando?:</label>
                      <input
                        type="text"
                        placeholder="Ej. Coche Audi, iPhone 16..."
                        value={editForm.financed_item || ''}
                        onChange={(e) => setEditForm({ ...editForm, financed_item: e.target.value })}
                        className="w-full mt-1 p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Importe Financiado (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.initial_principal ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const p = parseFloat(val) || 0;
                          const r = parseFloat(editForm.interest_rate_pct) || 0;
                          const m = parseInt(editForm.term_months, 10) || 1;
                          setEditForm({
                            ...editForm,
                            initial_principal: val,
                            monthly_installment: calcFrenchPayment(p, r, m)
                          });
                        }}
                        className="w-full mt-1 p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tipo Interés (TIN %):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.interest_rate_pct ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const r = parseFloat(val) || 0;
                          const p = parseFloat(editForm.initial_principal) || 0;
                          const m = parseInt(editForm.term_months, 10) || 1;
                          setEditForm({
                            ...editForm,
                            interest_rate_pct: val,
                            monthly_installment: calcFrenchPayment(p, r, m)
                          });
                        }}
                        className="w-full mt-1 p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Plazo (Meses / Cuotas):</label>
                      <input
                        type="number"
                        value={editForm.term_months ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const m = parseInt(val, 10) || 1;
                          const p = parseFloat(editForm.initial_principal) || 0;
                          const r = parseFloat(editForm.interest_rate_pct) || 0;
                          setEditForm({
                            ...editForm,
                            term_months: val,
                            monthly_installment: calcFrenchPayment(p, r, m)
                          });
                        }}
                        className="w-full mt-1 p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Cuota Mensual (€):</label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.monthly_installment ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, monthly_installment: e.target.value })}
                          className="w-full p-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const autoPmt = calcFrenchPayment(editForm.initial_principal, editForm.interest_rate_pct, editForm.term_months);
                        setEditForm({ ...editForm, monthly_installment: autoPmt });
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Recalcular cuota automática según TIN y plazo</span>
                    </button>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingLoan(null)}
                        className="px-3 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(selectedLoan.id)}
                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Saldo Vivo</span>
                  <div className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {selectedLoan.outstanding_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Cuota Mensual</span>
                  <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedLoan.monthly_installment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">TIN Anual</span>
                  <div className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {selectedLoan.interest_rate_pct}%
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Meses Restantes</span>
                  <div className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {selectedLoan.months_remaining} mes.
                  </div>
                </div>
              </div>

              {/* Total repayable and interest summary */}
              <div className="p-3 rounded-lg bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                <div>
                  <span>Total estimado a pagar: </span>
                  <strong className="font-mono text-neutral-900 dark:text-white">
                    {(selectedLoan.total_repayable || selectedLoan.monthly_installment * selectedLoan.term_months).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </strong>
                </div>
                <div>
                  <span>Intereses totales estimados: </span>
                  <strong className="font-mono text-amber-600 dark:text-amber-400">
                    {(selectedLoan.total_interest_expected || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </strong>
                </div>
              </div>

              {/* Finished / Completed Loan Celebratory Banner */}
              {selectedLoan.outstanding_balance <= 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[#1e2220] border border-emerald-200 dark:border-emerald-800/80 shadow-xs flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      🎉 Financiación Completada y Saldada al 100%
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                      Este crédito se encuentra totalmente liquidado. Todo el capital ({selectedLoan.initial_principal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €) ha sido devuelto con éxito y no quedan cuotas pendientes.
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Early Payoff Simulator */}
              {selectedLoan.outstanding_balance > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-[#1e1e22] border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          Simulador de Amortización Anticipada
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                          Comprueba el ahorro y el impacto de amortizar capital extraordinario
                        </p>
                      </div>
                    </div>
                    <div className="self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Ahorro: +{(simMode === 'reduce_payment' ? opt1TotalInterestSaved : opt2TotalInterestSaved).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>

                  {/* 2 Selectable Options (Radio / Tab Cards) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                      Selecciona la opción de amortización:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Option 1: Reducir cuota */}
                      <button
                        type="button"
                        onClick={() => setSimMode('reduce_payment')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex items-start gap-3 ${
                          simMode === 'reduce_payment'
                            ? 'bg-white dark:bg-[#202026] border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white/60 dark:bg-[#1a1a1f]/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                          simMode === 'reduce_payment' ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-400'
                        }`}>
                          {simMode === 'reduce_payment' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            Opción 1: Reducir Cuota Mensual
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                            Mantienes la fecha fin ({originalEndDateStr}) y tu cuota mensual disminuye.
                          </span>
                        </div>
                      </button>

                      {/* Option 2: Reducir plazo */}
                      <button
                        type="button"
                        onClick={() => setSimMode('reduce_term')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex items-start gap-3 ${
                          simMode === 'reduce_term'
                            ? 'bg-white dark:bg-[#202026] border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white/60 dark:bg-[#1a1a1f]/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                          simMode === 'reduce_term' ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-400'
                        }`}>
                          {simMode === 'reduce_term' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                            Opción 2: Reducir Plazo / Adelantar Fecha Final
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                            Mantienes la cuota fija ({curPmt.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €) y acabas antes el préstamo.
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Capital to Amortize Controls */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1d] border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Capital a amortizar extraordinariamente:
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={curPrincipal}
                            step="50"
                            value={simExtraAmortization}
                            onChange={(e) => setSimExtraAmortization(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-28 py-1 px-2 pr-6 text-right font-mono font-bold text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#252528] text-neutral-900 dark:text-white focus:outline-indigo-500"
                          />
                          <span className="absolute right-2 top-1 text-xs text-neutral-400 font-bold">€</span>
                        </div>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={curPrincipal}
                      step="50"
                      value={effectiveExtra}
                      onChange={(e) => setSimExtraAmortization(parseFloat(e.target.value) || 0)}
                      className="w-full cursor-pointer accent-indigo-600"
                    />

                    <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-0.5">
                      <span>Mín: 0 €</span>
                      <span className="text-neutral-600 dark:text-neutral-300">
                        Nuevo saldo vivo tras amortizar: <strong className="font-mono font-bold text-neutral-900 dark:text-white">{newBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
                      </span>
                      <span>Máx: {curPrincipal.toLocaleString('es-ES')} €</span>
                    </div>

                    {/* Quick amount buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-neutral-400 flex items-center pr-1">Aportar:</span>
                      <button
                        type="button"
                        onClick={() => setSimExtraAmortization(0)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                          effectiveExtra === 0
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        0 € (Actual)
                      </button>
                      {[500, 1000, 2000, 3000].filter(amt => amt < curPrincipal).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSimExtraAmortization(amt)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                            effectiveExtra === amt
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          +{amt.toLocaleString('es-ES')} €
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSimExtraAmortization(curPrincipal)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                          effectiveExtra === curPrincipal
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        Saldar Total ({curPrincipal.toLocaleString('es-ES')} €)
                      </button>
                    </div>

                    {/* If in Option 2 (Reduce Term): Offer quick target months reduction presets */}
                    {simMode === 'reduce_term' && curMonths > 3 && (
                      <div className="pt-2.5 mt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 mb-1.5">
                          <span className="font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            O selecciona cuántos meses deseas recortar:
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Adelanta tu fecha final
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[6, 12, 18, 24].filter(m => m < curMonths).map((m) => {
                            const reqExtra = calcAmortizationForMonthsReduction(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setSimExtraAmortization(reqExtra)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  opt2MonthsSaved === m
                                    ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                                }`}
                              >
                                <span>-{m} meses</span>
                                <span className="opacity-80 font-mono text-[10px]">({reqExtra.toLocaleString('es-ES')} €)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Impact Results Comparison Cards */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                      Resultado de la simulación ({simMode === 'reduce_payment' ? 'Reducción de Cuota' : 'Reducción de Plazo'}):
                    </span>

                    {simMode === 'reduce_payment' ? (
                      /* Mode 1 Results: Reducir Cuota */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Nueva Cuota Mensual
                          </span>
                          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {opt1NewPmt.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <span>- {opt1MonthlySavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € / mes</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Cuota anterior: {curPmt.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-neutral-200 dark:border-neutral-800 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Fecha Finalización
                          </span>
                          <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 capitalize">
                            {originalEndDateStr}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-1">
                            Plazo inalterado ({curMonths} meses)
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Mismo calendario pactado
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Ahorro Total en Intereses
                          </span>
                          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +{opt1TotalInterestSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                            Dinero directo no pagado al banco
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Durante la vida restante del crédito
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Mode 2 Results: Reducir Plazo */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-purple-200 dark:border-purple-900/60 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Nueva Fecha Finalización
                          </span>
                          <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5 capitalize">
                            {opt2NewEndDateStr}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <span>¡Adelanto de {opt2MonthsSaved} meses!</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Fecha original: {originalEndDateStr}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-neutral-200 dark:border-neutral-800 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Cuota Mensual Mantenida
                          </span>
                          <div className="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                            {curPmt.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-1">
                            Pagas {opt2NewMonths} cuotas en vez de {curMonths}
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            Te ahorras {opt2MonthsSaved} cuotas completas
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1d] border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Ahorro Total en Intereses
                          </span>
                          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            +{opt2TotalInterestSaved.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                            Máxima optimización financiera
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {opt2TotalInterestSaved > opt1TotalInterestSaved
                              ? `(+${(opt2TotalInterestSaved - opt1TotalInterestSaved).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € más que reduciendo cuota)`
                              : 'Intereses bancarios evitados'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* French Amortization Schedule Table */}
              {selectedLoan.amortization_schedule && selectedLoan.amortization_schedule.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Cuadro de Amortización Francesa (Próximos 12 meses)
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono">Cuota fija = Principal + Interés</span>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="p-2">Mes</th>
                          <th className="p-2">Fecha Cuota</th>
                          <th className="p-2 text-right">Cuota Total</th>
                          <th className="p-2 text-right">Amort. Capital</th>
                          <th className="p-2 text-right">Intereses</th>
                          <th className="p-2 text-right">Deuda Restante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono text-[11px]">
                        {selectedLoan.amortization_schedule.map((row) => (
                          <tr key={row.month_index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="p-2 text-neutral-500 font-sans">#{row.month_index}</td>
                            <td className="p-2 text-neutral-700 dark:text-neutral-300 font-sans">{row.date}</td>
                            <td className="p-2 text-right font-bold text-neutral-900 dark:text-white">{row.payment.toFixed(2)} €</td>
                            <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">+{row.principal.toFixed(2)} €</td>
                            <td className="p-2 text-right text-amber-600 dark:text-amber-400">{row.interest.toFixed(2)} €</td>
                            <td className="p-2 text-right text-neutral-600 dark:text-neutral-300">{row.remaining_balance.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Matching Transactions History in DB */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    Movimientos Detectados en Extractos ({selectedLoan.payments_count})
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenLinkModal}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Vincular movimientos a mano</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedLoan.payments_history.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-sm" title={tx.description}>
                            {tx.description}
                          </span>
                          {tx.is_manually_linked ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[9px] font-bold">
                              🔗 Vinculado a mano
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[9px] font-medium">
                              🔍 Auto-detectado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {tx.date} · {tx.account} · Categoría: <strong className="text-neutral-600 dark:text-neutral-300">{tx.category}</strong>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="text-right">
                          <span className={`font-bold font-mono ${
                            tx.amount > 0 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-neutral-900 dark:text-white'
                          }`}>
                            {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} €
                          </span>
                          <div className="text-[10px] text-neutral-400 capitalize">
                            {tx.type === 'disbursement' ? 'Disposición' : (tx.type === 'interest_fee' ? 'Interés / Comisión' : 'Amortización')}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnlinkTransaction(tx.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                          title="Desvincular este extracto de este crédito"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Manual Transaction Linking */}
      {isLinkModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#242424] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Vincular Movimientos a "{selectedLoan.name}"
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Selecciona extractos de tus cuentas para asignarlos manualmente como amortizaciones o cuotas de este préstamo.
                </p>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por concepto (ej. cuota, fraccionar, préstamo, comercio...)"
                value={candidateSearch}
                onChange={(e) => {
                  setCandidateSearch(e.target.value);
                  fetchCandidates(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none text-neutral-900 dark:text-white focus:border-indigo-500"
              />
            </div>

            {/* Candidate List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              {loadingCandidates ? (
                <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Buscando movimientos en tus cuentas...</span>
                </div>
              ) : candidateList.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No se encontraron movimientos candidatos con ese criterio de búsqueda.
                </div>
              ) : (
                candidateList.map((tx) => {
                  const isSelected = selectedCandidateIds.includes(tx.id);
                  const isAlreadyThisLoan = tx.loan_id === selectedLoan.id;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => !isAlreadyThisLoan && toggleSelectCandidate(tx.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                        isAlreadyThisLoan 
                          ? 'bg-neutral-50/60 dark:bg-neutral-800/20 opacity-60 cursor-default'
                          : isSelected 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="flex-shrink-0">
                          {isAlreadyThisLoan ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-900 dark:text-white truncate max-w-md">
                            {tx.description}
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                            <span>{tx.date}</span>
                            <span>·</span>
                            <span className="truncate">{tx.account}</span>
                            {tx.loan_name && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-semibold">
                                Ya en: {tx.loan_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-mono font-bold">
                        <span className={tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}>
                          {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                {selectedCandidateIds.length} movimientos seleccionados para vincular
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedCandidateIds.length === 0}
                  onClick={handleLinkTransactions}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Vincular {selectedCandidateIds.length > 0 ? `(${selectedCandidateIds.length})` : ''} al Crédito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Loan / Financing / Installment Plan */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#242424] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {createForm.loan_type === 'loan_disbursement' ? '🏦' : '💳'}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Dar de Alta Nueva Financiación o Crédito
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  const p = createForm.initial_principal || 1000;
                  setCreateForm({
                    ...createForm,
                    loan_type: 'loan_disbursement',
                    interest_rate_pct: 4.78,
                    monthly_installment: calcFrenchPayment(p, 4.78, createForm.term_months || 48),
                    term_months: createForm.term_months || 48
                  });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  createForm.loan_type === 'loan_disbursement'
                    ? 'bg-white dark:bg-[#303030] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Préstamo de Ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = createForm.initial_principal || 600;
                  setCreateForm({
                    ...createForm,
                    loan_type: 'installment_purchase',
                    interest_rate_pct: 0.0,
                    monthly_installment: calcFrenchPayment(p, 0.0, 6),
                    term_months: 6
                  });
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  createForm.loan_type === 'installment_purchase'
                    ? 'bg-white dark:bg-[#303030] text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Compra en Cuotas (BNPL)</span>
              </button>
            </div>

            <div className="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-lg">
              {createForm.loan_type === 'loan_disbursement' ? (
                <span>💡 <strong>Préstamo con Abono</strong>: Recibes un ingreso inicial en cuenta (+) y se pagan cuotas mensuales para devolverlo (ej. coche, préstamo personal).</span>
              ) : (
                <span>💡 <strong>Compra Fraccionada en Cuotas</strong>: Pagas una compra o servicio aplazado mes a mes en tarjeta o pasarela (ej. Apple en 6 meses, Klarna, Amazon).</span>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    ¿Qué estás financiando?: *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Coche Audi A3, iPhone 16..."
                    value={createForm.financed_item}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateForm({ 
                        ...createForm, 
                        financed_item: val,
                        name: createForm.name ? createForm.name : `Financiación ${val}`
                      });
                    }}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Entidad / Comercio:
                  </label>
                  <input
                    type="text"
                    placeholder="Banco Santander, Apple, Klarna..."
                    value={createForm.entity}
                    onChange={(e) => setCreateForm({ ...createForm, entity: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f]"
                  />
                </div>
              </div>

              {/* Financial Parameters */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Importe Financiado (€): *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.initial_principal}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setCreateForm({
                        ...createForm,
                        initial_principal: p,
                        monthly_installment: calcFrenchPayment(p, createForm.interest_rate_pct, createForm.term_months)
                      });
                    }}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    TIN Anual (%):
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.interest_rate_pct}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 0;
                        setCreateForm({
                          ...createForm,
                          interest_rate_pct: r,
                          monthly_installment: calcFrenchPayment(createForm.initial_principal, r, createForm.term_months)
                        });
                      }}
                      className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Plazo (Meses / Cuotas):
                  </label>
                  <input
                    type="number"
                    value={createForm.term_months}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10) || 1;
                      setCreateForm({
                        ...createForm,
                        term_months: m,
                        monthly_installment: calcFrenchPayment(createForm.initial_principal, createForm.interest_rate_pct, m)
                      });
                    }}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Live Calculation Card */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-500 block">Cuota mensual resultante:</span>
                  <div className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    {(createForm.monthly_installment || calcFrenchPayment(createForm.initial_principal, createForm.interest_rate_pct, createForm.term_months)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    <span className="text-xs font-normal text-neutral-500 ml-1">/mes</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-500">
                  <div>Total a devolver: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{((createForm.monthly_installment || calcFrenchPayment(createForm.initial_principal, createForm.interest_rate_pct, createForm.term_months)) * (createForm.term_months || 1)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
                  <div>Intereses totales: <strong className="font-mono text-amber-600 dark:text-amber-400">{Math.max(0, ((createForm.monthly_installment || calcFrenchPayment(createForm.initial_principal, createForm.interest_rate_pct, createForm.term_months)) * (createForm.term_months || 1)) - (createForm.initial_principal || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
                </div>
              </div>

              {/* Advanced optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Patrón para vincular cargos automáticos:
                  </label>
                  <input
                    type="text"
                    placeholder="Texto en extracto (ej. 0001557, Apple...)"
                    value={createForm.match_pattern}
                    onChange={(e) => setCreateForm({ ...createForm, match_pattern: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Cuenta de cargo habitual:
                  </label>
                  <select
                    value={createForm.account_name}
                    onChange={(e) => setCreateForm({ ...createForm, account_name: e.target.value })}
                    className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f]"
                  >
                    <option value="Santander (*3012)">Santander (*3012)</option>
                    <option value="Santander Ahorro (*1842)">Santander Ahorro (*1842)</option>
                    <option value="Santander Tarjeta (*0871)">Santander Tarjeta (*0871)</option>
                    <option value="N26 (*7089)">N26 (*7089)</option>
                    <option value="American Express Platinum">American Express Platinum</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateLoan}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Guardar Financiación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
