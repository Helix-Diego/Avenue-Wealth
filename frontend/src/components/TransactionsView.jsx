import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  Briefcase, 
  Check, 
  AlertCircle,
  ArrowUpDown,
  CreditCard,
  Building,
  Plane,
  Sparkles,
  CheckSquare,
  Square,
  X,
  ArrowRight,
  Scissors,
  ArrowLeftRight,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Layers,
  Landmark
} from 'lucide-react';
import SplitTransactionModal from './SplitTransactionModal';
import TransferPairModal from './TransferPairModal';
import LinkedPairDetailModal from './LinkedPairDetailModal';

const CATEGORY_COLORS = {
  "Sueldo": "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  "Alimentación": "bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800/40",
  "Restaurantes": "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
  "Gasolina": "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
  "Parking/Peajes/Ubers": "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40",
  "Coche": "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
  "Vivienda": "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
  "Gastos Vivienda": "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/60",
  "Servicios/Suscripciones": "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
  "Entretenimiento": "bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/40",
  "Gastos Viajes": "bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800/40",
  "Vuelos": "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
  "Compra Ropa": "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
  "Deporte/Gimnasio": "bg-lime-100 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800/40",
  "Educación": "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/40",
  "Salud/Farmancia": "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/40",
  "Otras compras": "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
  "Prestamos familiares": "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/40",
  "Deudas y créditos": "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/40",
  "Liquidación Tarjetas": "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800/50",
  "Traspaso entre cuentas": "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800/50",
  "Inversiones y ahorros": "bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800/40",
  "Otros ingresos": "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60",
  "Gastos de Empresa": "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
};

const ACCOUNT_STYLES = {
  "Santander (*3012)": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40",
  "Santander Ahorro (*1842)": "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40",
  "Santander Tarjeta (*0871)": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40",
  "Iberia Cards (*2366)": "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
  "N26 (*7089)": "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40",
  "American Express Platinum": "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/40",
  "Santander": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40",
  "N26": "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40",
  "Iberia Cards": "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
  "American Express": "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/40",
  "MyInvestor": "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40",
};

export default function TransactionsView({
  transactions,
  categories,
  onUpdateTransaction,
  onDeleteTransaction,
  onBatchUpdateSuccess,
  onOpenNewModal,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  darkMode,
  onTriggerUndo
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reimbursementFilter, setReimbursementFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  // Multi-selection state
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [batchCategory, setBatchCategory] = useState('');
  const [batchOperating, setBatchOperating] = useState(false);

  // Non-intrusive smart suggestion toast (bottom-right floating card)
  const [similarSuggestion, setSimilarSuggestion] = useState(null);
  const [applyingSimilarBatch, setApplyingSimilarBatch] = useState(false);

  // Modals state for splitting and transfer pairing
  const [splitModalTx, setSplitModalTx] = useState(null);
  const [transferPairData, setTransferPairData] = useState(null);
  const [selectedLinkedTxId, setSelectedLinkedTxId] = useState(null);

  const handleUnpair = async (txId) => {
    try {
      await fetch('/api/transactions/unpair-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId })
      });
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
    } catch (err) {
      console.error('Error unpairing transfer:', err);
    }
  };

  const handleSearchTransferPair = async (tx) => {
    try {
      const res = await fetch('/api/transactions/find-transfer-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id })
      });
      const data = await res.json();
      setTransferPairData({ targetTx: tx, pairData: data });
    } catch (err) {
      console.error('Error finding transfer counterpart:', err);
    }
  };

  // Bank list & aliases state
  const [banksList, setBanksList] = useState([]);
  useEffect(() => {
    fetch('/api/settings/banks')
      .then(res => res.json())
      .then(data => {
        if (data?.banks) setBanksList(data.banks);
      })
      .catch(err => console.error('Error fetching banks in transactions view:', err));
  }, []);

  // Loan linking modal state
  const [loanModalData, setLoanModalData] = useState(null); // { txs: [...] }
  const [loansList, setLoansList] = useState([]);
  const [isCreatingNewLoan, setIsCreatingNewLoan] = useState(false);
  const [newLoanForm, setNewLoanForm] = useState({
    name: '',
    entity: 'Banco Santander',
    loan_type: 'installment_purchase',
    financed_item: '',
    initial_principal: 100,
    interest_rate_pct: 0,
    term_months: 6,
    monthly_installment: 16.67
  });
  const [selectedTargetLoanId, setSelectedTargetLoanId] = useState('');

  const fetchLoansList = async () => {
    try {
      const res = await fetch('/api/loans');
      const data = await res.json();
      if (data && data.loans) {
        setLoansList(data.loans);
        if (data.loans.length > 0) {
          setSelectedTargetLoanId(data.loans[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching loans for linking:', err);
    }
  };

  const handleOpenLoanModal = (txOrTxs) => {
    const txs = Array.isArray(txOrTxs) ? txOrTxs : [txOrTxs];
    fetchLoansList();
    setIsCreatingNewLoan(false);
    const firstTx = txs[0] || {};
    const defaultPrincipal = Math.abs(txs.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0)) || 100;
    const roundedPrincipal = Math.round(defaultPrincipal * 100) / 100;
    setNewLoanForm({
      name: firstTx.description ? `Financiación: ${firstTx.description.slice(0, 30)}` : 'Nueva Financiación',
      entity: firstTx.account?.includes('Santander') ? 'Banco Santander' : 'Entidad Financiera',
      loan_type: firstTx.amount > 0 ? 'loan_disbursement' : 'installment_purchase',
      financed_item: firstTx.description || '',
      initial_principal: roundedPrincipal,
      interest_rate_pct: 0,
      term_months: 6,
      monthly_installment: Math.round((roundedPrincipal / 6) * 100) / 100
    });
    setLoanModalData({ txs });
  };

  const handleConfirmLinkLoan = async () => {
    if (!loanModalData || !loanModalData.txs || loanModalData.txs.length === 0) return;
    const txIds = loanModalData.txs.map(t => t.id);

    try {
      let targetLoanId = selectedTargetLoanId;

      if (isCreatingNewLoan) {
        if (!newLoanForm.name) {
          alert('Por favor, indica un nombre o concepto para la financiación.');
          return;
        }
        const p = parseFloat(newLoanForm.initial_principal) || 0;
        const r = parseFloat(newLoanForm.interest_rate_pct) || 0;
        const m = parseInt(newLoanForm.term_months, 10) || 6;
        const pmt = newLoanForm.monthly_installment ? parseFloat(newLoanForm.monthly_installment) : (p / m);

        const createRes = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newLoanForm,
            initial_principal: p,
            interest_rate_pct: r,
            term_months: m,
            monthly_installment: pmt,
            start_date: loanModalData.txs[0]?.date || new Date().toISOString().split('T')[0],
            account_name: loanModalData.txs[0]?.account || 'Santander (*3012)'
          })
        });
        const createdData = await createRes.json();
        if (createdData && createdData.loans && createdData.loans.length > 0) {
          targetLoanId = createdData.loans[createdData.loans.length - 1].id;
        }
      }

      if (targetLoanId) {
        await fetch(`/api/loans/${targetLoanId}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_ids: txIds })
        });
      }

      setLoanModalData(null);
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
    } catch (err) {
      console.error('Error linking transaction to loan:', err);
    }
  };

  const handleUnlinkLoan = async (txId, loanId) => {
    try {
      await fetch(`/api/loans/${loanId}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: [txId] })
      });
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
    } catch (err) {
      console.error('Error unlinking loan:', err);
    }
  };

  // Extract bank alias options and distinct accounts present in transactions
  const presentAccounts = Array.from(new Set(transactions.map(t => t.account_alias || t.account).filter(Boolean)));
  
  // Build account tab options using bank aliases if available
  const bankOptions = banksList
    .filter(b => Boolean(b.enabled))
    .map(b => b.alias || b.name);

  const allAccountTabs = ['all', ...Array.from(new Set([...bankOptions, ...presentAccounts]))];

  // Filter transactions with alias and account matching
  const filtered = transactions.filter((t) => {
    if (selectedAccount !== 'all') {
      const sel = selectedAccount.toLowerCase();
      const tAcc = (t.account || '').toLowerCase();
      const tAlias = (t.account_alias || '').toLowerCase();

      const directMatch = tAcc === sel || tAlias === sel || t.account === selectedAccount || t.account_alias === selectedAccount;

      const matchedBank = banksList.find(b => 
        (b.alias && b.alias.toLowerCase() === sel) ||
        b.name.toLowerCase() === sel ||
        b.id.toLowerCase() === sel
      );

      let bankMatch = false;
      if (matchedBank) {
        const bId = matchedBank.id.toLowerCase();
        const bName = matchedBank.name.toLowerCase();
        const bAlias = (matchedBank.alias || '').toLowerCase();
        bankMatch = tAcc.includes(bId) || tAcc.includes(bName) || (bAlias && (tAlias === bAlias || tAcc.includes(bAlias)));
      }

      if (!directMatch && !bankMatch) {
        return false;
      }
    }
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    
    // Filter by reimbursement type: personal vs company
    if (reimbursementFilter === 'personal_only') {
      const isComp = t.is_reimbursable === 1 || 
                     t.category === 'Gastos de Empresa' || 
                     t.reimbursement_status === 'pending' || 
                     t.reimbursement_status === 'reimbursed';
      if (isComp) return false;
    } else if (reimbursementFilter === 'company_all') {
      const isComp = t.is_reimbursable === 1 || 
                     t.category === 'Gastos de Empresa' || 
                     t.reimbursement_status === 'pending' || 
                     t.reimbursement_status === 'reimbursed';
      if (!isComp) return false;
    } else if (reimbursementFilter === 'company_pending') {
      if (t.is_reimbursable !== 1 || t.reimbursement_status !== 'pending') return false;
    } else if (reimbursementFilter === 'company_reimbursed') {
      if (t.is_reimbursable !== 1 || t.reimbursement_status !== 'reimbursed') return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const inDesc = t.description?.toLowerCase().includes(q);
      const inNotes = t.notes?.toLowerCase().includes(q);
      const inCat = t.category?.toLowerCase().includes(q);
      const inAcc = t.account?.toLowerCase().includes(q);
      const inAmt = String(Math.abs(t.amount || 0)).includes(q) || String(t.amount || 0).includes(q);
      if (!inDesc && !inNotes && !inCat && !inAcc && !inAmt) return false;
    }
    return true;
  });

  // Multi-select helpers
  const isAllSelected = filtered.length > 0 && filtered.every(t => selectedTxIds.includes(t.id));
  const isSomeSelected = filtered.some(t => selectedTxIds.includes(t.id)) && !isAllSelected;

  const toggleSelectTx = (id) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filtered.map(t => t.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedTxIds.includes(id));
    if (allSelected) {
      setSelectedTxIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTxIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const selectedTxs = transactions.filter(t => selectedTxIds.includes(t.id));
  const selectedSum = selectedTxs.reduce((acc, t) => acc + t.amount, 0);

  // Batch actions on multiple selections
  const handleApplyBatchCategory = async () => {
    if (!batchCategory || selectedTxIds.length === 0) return;
    if (batchCategory === 'Deudas y créditos') {
      const selectedTxs = transactions.filter(t => selectedTxIds.includes(t.id));
      handleOpenLoanModal(selectedTxs);
      return;
    }
    const count = selectedTxIds.length;
    setBatchOperating(true);
    try {
      const res = await fetch('/api/transactions/batch-update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ids: selectedTxIds,
          new_category: batchCategory,
          save_rule: false
        })
      });
      const data = await res.json();
      setSelectedTxIds([]);
      setBatchCategory('');
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
      if (onTriggerUndo && data.previous_states && data.previous_states.length > 0) {
        onTriggerUndo({
          message: `Categoría cambiada a "${batchCategory}"`,
          count: count,
          actionType: 'update',
          previousStates: data.previous_states
        });
      }
    } catch (err) {
      console.error('Error in batch category update:', err);
    } finally {
      setBatchOperating(false);
    }
  };

  const handleApplyBatchReimbursable = async (isReimb, status = 'pending') => {
    if (selectedTxIds.length === 0) return;
    const count = selectedTxIds.length;
    setBatchOperating(true);
    try {
      const res = await fetch('/api/transactions/batch-update-reimbursable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ids: selectedTxIds,
          is_reimbursable: isReimb,
          reimbursement_status: isReimb === 1 ? status : 'none'
        })
      });
      const data = await res.json();
      setSelectedTxIds([]);
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
      if (onTriggerUndo && data.previous_states && data.previous_states.length > 0) {
        onTriggerUndo({
          message: isReimb === 1 ? 'Marcadas como Gasto de Empresa' : 'Marcadas como Gasto Personal',
          count: count,
          actionType: 'update',
          previousStates: data.previous_states
        });
      }
    } catch (err) {
      console.error('Error in batch reimbursable update:', err);
    } finally {
      setBatchOperating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTxIds.length === 0) return;
    if (!window.confirm(`¿Seguro que deseas eliminar las ${selectedTxIds.length} transacciones seleccionadas? Podrás deshacerlo en los próximos segundos.`)) {
      return;
    }
    const count = selectedTxIds.length;
    setBatchOperating(true);
    try {
      const res = await fetch('/api/transactions/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ids: selectedTxIds
        })
      });
      const data = await res.json();
      setSelectedTxIds([]);
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
      if (onTriggerUndo && data.deleted_transactions && data.deleted_transactions.length > 0) {
        onTriggerUndo({
          message: `Eliminadas ${count} transacciones`,
          count: count,
          actionType: 'delete',
          deletedTransactions: data.deleted_transactions
        });
      }
    } catch (err) {
      console.error('Error in batch delete:', err);
    } finally {
      setBatchOperating(false);
    }
  };

  // Instant single category change + non-blocking similar search
  const changeCategory = async (tx, newCat) => {
    setEditingId(null);
    if (!newCat || tx.category === newCat) return;

    if (newCat === 'Traspaso entre cuentas') {
      try {
        const res = await fetch('/api/transactions/find-transfer-pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: tx.id })
        });
        const data = await res.json();
        if (data && data.candidate) {
          setTransferPairData({ targetTx: tx, pairData: data });
          return;
        }
      } catch (err) {
        console.error('Error finding transfer counterpart:', err);
      }
    }

    if (newCat === 'Deudas y créditos') {
      handleOpenLoanModal(tx);
      return;
    }

    // 1. Inmediatamente actualizar la transacción sin bloquear al usuario
    onUpdateTransaction(tx.id, { category: newCat });

    // 2. Buscar en segundo plano si hay similares para mostrar recomendación inferior no intrusiva
    try {
      const res = await fetch('/api/transactions/find-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id, new_category: newCat })
      });
      const data = await res.json();

      if (data.matches && data.matches.length > 0) {
        setSimilarSuggestion({
          targetTx: tx,
          newCategory: newCat,
          pattern: data.pattern,
          matches: data.matches,
          selectedIds: data.matches.map(m => m.id),
          isExpanded: false
        });
      }
    } catch (err) {
      console.error('Error finding similar transactions:', err);
    }
  };

  // Apply similar suggestion batch
  const handleApplySimilarSuggestion = async (applyToAll = true) => {
    if (!similarSuggestion) return;
    setApplyingSimilarBatch(true);
    const { targetTx, newCategory, pattern, matches, selectedIds } = similarSuggestion;
    const idsToUpdate = applyToAll ? matches.map(m => m.id) : selectedIds;

    if (idsToUpdate.length === 0) {
      setSimilarSuggestion(null);
      setApplyingSimilarBatch(false);
      return;
    }

    try {
      const res = await fetch('/api/transactions/batch-update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_ids: idsToUpdate,
          new_category: newCategory,
          save_rule: true,
          pattern: pattern
        })
      });
      const data = await res.json();
      if (onBatchUpdateSuccess) {
        await onBatchUpdateSuccess();
      }
      if (onTriggerUndo && data.previous_states && data.previous_states.length > 0) {
        onTriggerUndo({
          message: `Recomendación aplicada a "${newCategory}" (${pattern})`,
          count: idsToUpdate.length,
          actionType: 'update',
          previousStates: data.previous_states,
          rulePattern: pattern
        });
      }
    } catch (err) {
      console.error('Error updating similar batch:', err);
    } finally {
      setApplyingSimilarBatch(false);
      setSimilarSuggestion(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">💳</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
                Base de Datos de Transacciones
              </h1>
              <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
                Santander (*3012), Ahorro (*1842), Tarjeta Iberia Cards (*2366), N26 (*7089) y American Express
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] rounded-md px-3 py-1.5 shadow-xs outline-none text-[#37352f] dark:text-[#e0e0e0] cursor-pointer"
          >
            <option value="all">Todos los meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button
            onClick={onOpenNewModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Movimiento</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3.5">
        {/* Row 1: Full-Width Prominent Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por concepto, comercio, importe o tarjeta (ej: Mercadona, Nómina, Gasolina, Coche, Bizum...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm font-medium bg-neutral-50 dark:bg-[#181818] border border-neutral-300 dark:border-neutral-700 rounded-xl outline-none text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#222222] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchTerm && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 whitespace-nowrap">
              <span>{filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline font-normal cursor-pointer ml-1"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-neutral-400 text-[11px] font-medium mr-1">Filtros rápidos:</span>
          {[
            { label: 'Todo', query: '' },
            { label: '🚗 Coche', query: 'coche' },
            { label: '⛽ Gasolina', query: 'gasolina' },
            { label: '🛒 Supermercado', query: 'supermercado' },
            { label: '🍽️ Restaurantes', query: 'restaurante' },
            { label: '💼 Nómina', query: 'nómina' },
            { label: '🏠 Hogar', query: 'hogar' },
            { label: '📱 Suscripciones', query: 'suscripcion' },
            { label: '⚡ Suministros', query: 'suministros' }
          ].map((pill) => {
            const isSelected = (!searchTerm && !pill.query) || (searchTerm.toLowerCase() === pill.query.toLowerCase());
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setSearchTerm(pill.query)}
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

        {/* Row 3: Account Filter Pills */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/70">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-neutral-400 text-[11px] font-medium mr-1 whitespace-nowrap">Cuenta:</span>
            {allAccountTabs.map((acc) => (
              <button
                key={acc}
                onClick={() => setSelectedAccount(acc)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedAccount === acc
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {acc === 'all' ? 'Todas las cuentas' : acc}
              </button>
            ))}
          </div>
        </div>

        {/* Second Row Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex items-center space-x-3">
            {/* Category select */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#787774]">Categoría:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 text-xs outline-none text-neutral-700 dark:text-neutral-300"
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter Tipo: Personal vs Empresa */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[#787774]">Tipo:</span>
              <select
                value={reimbursementFilter}
                onChange={(e) => setReimbursementFilter(e.target.value)}
                className={`text-xs px-2.5 py-1 rounded-md border outline-none font-medium cursor-pointer transition-colors ${
                  reimbursementFilter === 'all'
                    ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    : reimbursementFilter === 'personal_only'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 font-semibold'
                    : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-semibold'
                }`}
              >
                <option value="all">🌐 Todos (Extracto banco)</option>
                <option value="personal_only">👤 Solo Personales (Ocultar Empresa)</option>
                <option value="company_all">💼 Gastos de Empresa (Todos)</option>
                <option value="company_pending">⏳ Empresa (Solo Pendientes de Cobro)</option>
                <option value="company_reimbursed">✅ Empresa (Solo Cobrados / Reembolsados)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-[#787774]">
            {selectedTxIds.length > 0 && (
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {selectedTxIds.length} seleccionados
              </span>
            )}
            <span>
              Mostrando <strong>{filtered.length}</strong> transacciones
            </span>
          </div>
        </div>
      </div>

      {/* Notion Database Table */}
      <div className="bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[#ececeb] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#202020] text-[#787774] dark:text-[#909090] font-medium whitespace-nowrap">
                {/* Select All Checkbox */}
                <th className="py-2.5 px-3 w-9 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    title={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos los visibles"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : isSomeSelected ? (
                      <div className="w-3.5 h-3.5 rounded-xs border-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3 w-28">Fecha</th>
                <th className="py-2.5 px-3 w-40">Cuenta / Tarjeta</th>
                <th className="py-2.5 px-3">Concepto / Comercio</th>
                <th className="py-2.5 px-3 w-48">Categoría</th>
                <th className="py-2.5 px-3 w-36">Gasto Empresa</th>
                <th className="py-2.5 px-3 text-right w-28">Importe</th>
                <th className="py-2.5 px-3 text-center w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f2f0] dark:divide-[#2c2c2c]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const catStyle = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["Otras compras"];
                  const accStyle = ACCOUNT_STYLES[tx.account] || "bg-neutral-100 text-neutral-700 border-neutral-200";
                  const isExpense = tx.amount < 0;
                  const isSelected = selectedTxIds.includes(tx.id);

                  return (
                    <tr 
                      key={tx.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50 transition-colors group ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/25' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectTx(tx.id)}
                          className="flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400" />
                          )}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Cuenta */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border truncate max-w-[150px] ${accStyle}`} title={tx.account_alias ? `${tx.account_alias} (${tx.account})` : tx.account}>
                          {tx.account_alias || tx.account}
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-sm">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-neutral-400 italic truncate max-w-sm">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center flex-wrap gap-1">
                          {editingId === tx.id ? (
                            <select
                              defaultValue={tx.category}
                              autoFocus
                              onBlur={() => setEditingId(null)}
                              onChange={(e) => changeCategory(tx, e.target.value)}
                              className="text-xs p-1 bg-white dark:bg-[#333] border border-neutral-300 dark:border-neutral-600 rounded outline-none"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              onClick={() => setEditingId(tx.id)}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${catStyle}`}
                              title="Haz clic para cambiar categoría"
                            >
                              {tx.category}
                            </span>
                          )}

                          {/* Transfer Pairing Badge / Action */}
                          {tx.category === 'Traspaso entre cuentas' && (
                            tx.linked_tx_id ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLinkedTxId(tx.id);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer transition-all"
                                title={`Hacer clic para ver detalle del traspaso vinculado #${tx.linked_tx_id}`}
                              >
                                <Link2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                <span className="underline decoration-indigo-400/50 underline-offset-2">#{tx.linked_tx_id}</span>
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnpair(tx.id);
                                  }}
                                  className="text-neutral-400 hover:text-rose-500 ml-0.5 font-bold cursor-pointer"
                                  title="Desvincular traspaso"
                                >
                                  ×
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSearchTransferPair(tx);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer transition-colors"
                                title="Buscar automáticamente movimiento espejo en otra cuenta"
                              >
                                <ArrowLeftRight className="w-2.5 h-2.5" />
                                <span>Emparejar</span>
                              </button>
                            )
                          )}

                          {/* Loan / Credit Linking Badge / Action */}
                          {(tx.category === 'Deudas y créditos' || tx.loan_id) && (
                            tx.loan_id ? (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                title={`Vinculado a: ${tx.loan_name || 'Crédito #' + tx.loan_id}`}
                              >
                                <Landmark className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                                <span className="truncate max-w-[110px]">{tx.loan_name || `#${tx.loan_id}`}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkLoan(tx.id, tx.loan_id);
                                  }}
                                  className="text-neutral-400 hover:text-rose-500 ml-0.5 font-bold cursor-pointer"
                                  title="Desvincular de este crédito"
                                >
                                  ×
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLoanModal(tx);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer transition-colors"
                                title="Vincular a un crédito existente o crear uno nuevo"
                              >
                                <Landmark className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                                <span>Vincular Crédito</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Gasto de Empresa vs Personal */}
                      <td className="py-2.5 px-3">
                        <select
                          value={tx.is_reimbursable === 1 ? (tx.reimbursement_status === 'reimbursed' ? 'reimbursed' : 'pending') : 'personal'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'personal') {
                              onUpdateTransaction(tx.id, { is_reimbursable: 0, reimbursement_status: 'none' });
                            } else if (val === 'pending') {
                              onUpdateTransaction(tx.id, { is_reimbursable: 1, reimbursement_status: 'pending' });
                            } else if (val === 'reimbursed') {
                              onUpdateTransaction(tx.id, { is_reimbursable: 1, reimbursement_status: 'reimbursed' });
                            }
                          }}
                          className={`text-[10.5px] font-medium px-2 py-1 rounded-md border outline-none cursor-pointer transition-colors ${
                            tx.is_reimbursable === 1
                              ? (tx.reimbursement_status === 'reimbursed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 font-semibold')
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-400 dark:border-neutral-700'
                          }`}
                        >
                          <option value="personal">👤 Personal</option>
                          <option value="pending">💼 Empresa (Pendiente)</option>
                          <option value="reimbursed">✅ Empresa (Cobrado)</option>
                        </select>
                      </td>

                      {/* Importe */}
                      <td className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        isExpense 
                          ? 'text-neutral-800 dark:text-neutral-200' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} €
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setSplitModalTx(tx)}
                            className="p-1 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Desglosar movimiento en varias categorías (ej. Bizums mixtos)"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1 text-neutral-400 hover:text-rose-500 transition-all cursor-pointer rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING BATCH ACTION BAR (FOR MULTIPLE SELECTED TRANSACTIONS) */}
      {/* ============================================================== */}
      {selectedTxIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[92%] sm:w-auto bg-neutral-900/95 dark:bg-[#1f1f1f]/95 text-white backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center justify-between sm:justify-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-150">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/25 text-indigo-300 font-bold text-xs border border-indigo-500/40 font-mono">
              {selectedTxIds.length} seleccionados
            </span>
            <span className="text-xs text-neutral-300 font-mono font-medium hidden md:inline">
              (Total: {selectedSum >= 0 ? `+${selectedSum.toFixed(2)}` : selectedSum.toFixed(2)} €)
            </span>
          </div>

          <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

          {/* Category Change Dropdown & Apply */}
          <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
            <select
              value={batchCategory}
              onChange={(e) => setBatchCategory(e.target.value)}
              className="bg-neutral-800 dark:bg-neutral-900 border border-neutral-700 text-xs rounded-lg px-2.5 py-1.5 text-white outline-none cursor-pointer focus:border-indigo-400"
            >
              <option value="">Cambiar categoría a...</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyBatchCategory}
              disabled={!batchCategory || batchOperating}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap"
            >
              {batchOperating ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>

          <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

          {/* Quick Mark Empresa / Personal */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleApplyBatchReimbursable(1, 'pending')}
              disabled={batchOperating}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 border border-sky-700/60 text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Marcar como gasto reembolsable de empresa pendiente de cobro"
            >
              <Briefcase className="w-3 h-3 text-sky-400" />
              <span>Empresa (Pendiente)</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyBatchReimbursable(1, 'reimbursed')}
              disabled={batchOperating}
              className="px-2 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Marcar como gasto de empresa ya cobrado/reembolsado"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Cobrado</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyBatchReimbursable(0, 'none')}
              disabled={batchOperating}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              title="Marcar como gasto personal"
            >
              <span>Personal</span>
            </button>
          </div>

          <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

          {/* Quick Link to Loan / Financing */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                const selectedTxs = transactions.filter(t => selectedTxIds.includes(t.id));
                handleOpenLoanModal(selectedTxs);
              }}
              disabled={batchOperating}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-700/60 text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Vincular movimientos seleccionados a un préstamo o crédito"
            >
              <Landmark className="w-3 h-3 text-purple-400" />
              <span>Vincular a Crédito</span>
            </button>
          </div>

          <div className="h-5 w-px bg-neutral-700 hidden sm:block" />

          {/* Delete & Deselect */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={batchOperating}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-900/40 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              title="Eliminar seleccionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedTxIds([])}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer px-1 py-1"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NON-INTRUSIVE SIMILAR TRANSACTIONS FLOATING POPUP (BOTTOM-RIGHT) */}
      {/* ============================================================== */}
      {similarSuggestion && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm sm:max-w-md w-[92%] sm:w-[420px] bg-white dark:bg-[#222222] border-2 border-indigo-500/50 dark:border-indigo-500/40 rounded-xl shadow-2xl p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>¿Actualizar gastos similares?</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                    {similarSuggestion.matches.length}
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                  Patrón: <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">"{similarSuggestion.pattern}"</span> → <span className="font-semibold text-indigo-600 dark:text-indigo-400">{similarSuggestion.newCategory}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setSimilarSuggestion(null)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              title="Ignorar sugerencia"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expandable Match Details */}
          {similarSuggestion.isExpanded && (
            <div className="mt-3 pt-3 border-t border-neutral-150 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (similarSuggestion.selectedIds.length === similarSuggestion.matches.length) {
                      setSimilarSuggestion(prev => ({ ...prev, selectedIds: [] }));
                    } else {
                      setSimilarSuggestion(prev => ({ ...prev, selectedIds: prev.matches.map(m => m.id) }));
                    }
                  }}
                  className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer"
                >
                  {similarSuggestion.selectedIds.length === similarSuggestion.matches.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span>Seleccionar todos ({similarSuggestion.selectedIds.length}/{similarSuggestion.matches.length})</span>
                </button>
                <span className="text-[10px] text-neutral-400">Puedes desmarcar alguno</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                {similarSuggestion.matches.map(m => {
                  const isChecked = similarSuggestion.selectedIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSimilarSuggestion(prev => ({
                          ...prev,
                          selectedIds: isChecked
                            ? prev.selectedIds.filter(id => id !== m.id)
                            : [...prev.selectedIds, m.id]
                        }));
                      }}
                      className={`p-1.5 rounded flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1 truncate">
                          <span className="text-[10px] text-neutral-400 font-mono mr-1.5">{m.date}</span>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{m.description}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold flex-shrink-0 ml-2">
                        {m.amount > 0 ? `+${m.amount.toFixed(2)}` : m.amount.toFixed(2)} €
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3 pt-2.5 border-t border-neutral-150 dark:border-neutral-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSimilarSuggestion(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>{similarSuggestion.isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
              {similarSuggestion.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSimilarSuggestion(null)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-xs px-2 py-1 cursor-pointer"
              >
                Ignorar
              </button>
              <button
                type="button"
                onClick={() => handleApplySimilarSuggestion(!similarSuggestion.isExpanded)}
                disabled={applyingSimilarBatch || (similarSuggestion.isExpanded && similarSuggestion.selectedIds.length === 0)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {applyingSimilarBatch
                    ? 'Aplicando...'
                    : similarSuggestion.isExpanded
                      ? `Aplicar (${similarSuggestion.selectedIds.length})`
                      : `Aplicar a todos (${similarSuggestion.matches.length})`
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Transaction Modal */}
      {splitModalTx && (
        <SplitTransactionModal
          isOpen={!!splitModalTx}
          onClose={() => setSplitModalTx(null)}
          transaction={splitModalTx}
          categories={categories}
          onSuccess={async () => {
            if (onBatchUpdateSuccess) {
              await onBatchUpdateSuccess();
            }
          }}
        />
      )}

      {/* Transfer Pairing Modal */}
      {transferPairData && (
        <TransferPairModal
          isOpen={!!transferPairData}
          onClose={() => setTransferPairData(null)}
          targetTx={transferPairData.targetTx}
          pairData={transferPairData.pairData}
          onPairSuccess={async () => {
            if (onBatchUpdateSuccess) {
              await onBatchUpdateSuccess();
            }
          }}
          onSingleCategoryUpdate={async (txId, cat) => {
            await onUpdateTransaction(txId, { category: cat });
          }}
        />
      )}

      {/* Linked Pair Detail Popup Modal */}
      {selectedLinkedTxId && (
        <LinkedPairDetailModal
          isOpen={!!selectedLinkedTxId}
          onClose={() => setSelectedLinkedTxId(null)}
          txId={selectedLinkedTxId}
          onUnpairSuccess={async () => {
            if (onBatchUpdateSuccess) {
              await onBatchUpdateSuccess();
            }
          }}
        />
      )}

      {/* Loan / Credit Linking Modal */}
      {loanModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#242424] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Vincular a Crédito o Financiación
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {loanModalData.txs.length === 1 
                      ? 'Asigna este movimiento a un préstamo existente o da de alta uno nuevo' 
                      : `Asigna ${loanModalData.txs.length} movimientos seleccionados a un préstamo`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLoanModalData(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Transaction Summary Preview */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-neutral-800 dark:text-neutral-200">
                <span className="truncate max-w-xs">{loanModalData.txs[0]?.description}</span>
                <span className="font-mono">{loanModalData.txs[0]?.amount > 0 ? `+${loanModalData.txs[0]?.amount}` : loanModalData.txs[0]?.amount} €</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                {loanModalData.txs[0]?.date} · {loanModalData.txs[0]?.account}
                {loanModalData.txs.length > 1 && ` (+${loanModalData.txs.length - 1} movimientos más)`}
              </div>
            </div>

            {/* Mode Selector Tabs: Existing Loan vs Create New Loan */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setIsCreatingNewLoan(false)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  !isCreatingNewLoan
                    ? 'bg-white dark:bg-[#303030] text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Financiación Existente</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNewLoan(true)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  isCreatingNewLoan
                    ? 'bg-white dark:bg-[#303030] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Nueva Financiación</span>
              </button>
            </div>

            {!isCreatingNewLoan ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Selecciona el Préstamo o Crédito de destino:
                </label>
                {loansList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center text-xs text-neutral-500">
                    No tienes financiaciones activas dadas de alta. Puedes crear una nueva en la pestaña de al lado.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {loansList.map((loan) => (
                      <div
                        key={loan.id}
                        onClick={() => setSelectedTargetLoanId(loan.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedTargetLoanId === loan.id
                            ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40'
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <span>{loan.loan_type === 'loan_disbursement' ? '🏦' : '💳'}</span>
                            <span>{loan.name}</span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {loan.entity} · Financia: {loan.financed_item || 'General'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            {loan.outstanding_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </div>
                          <span className="text-[10px] text-neutral-400">pendiente</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs max-h-72 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">Nombre / Concepto:</label>
                    <input
                      type="text"
                      placeholder="Ej. iPhone 16 Pro, Sofá..."
                      value={newLoanForm.name}
                      onChange={(e) => setNewLoanForm({ ...newLoanForm, name: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">Entidad Financiera:</label>
                    <input
                      type="text"
                      placeholder="Ej. Santander Consumer, Klarna..."
                      value={newLoanForm.entity}
                      onChange={(e) => setNewLoanForm({ ...newLoanForm, entity: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">Importe Financiado (€):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLoanForm.initial_principal}
                      onChange={(e) => {
                        const p = parseFloat(e.target.value) || 0;
                        const m = parseInt(newLoanForm.term_months, 10) || 1;
                        setNewLoanForm({
                          ...newLoanForm,
                          initial_principal: e.target.value,
                          monthly_installment: Math.round((p / m) * 100) / 100
                        });
                      }}
                      className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">Plazo (Meses):</label>
                    <input
                      type="number"
                      value={newLoanForm.term_months}
                      onChange={(e) => {
                        const m = parseInt(e.target.value, 10) || 1;
                        const p = parseFloat(newLoanForm.initial_principal) || 0;
                        setNewLoanForm({
                          ...newLoanForm,
                          term_months: e.target.value,
                          monthly_installment: Math.round((p / m) * 100) / 100
                        });
                      }}
                      className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300">Cuota Mes (€):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLoanForm.monthly_installment}
                      onChange={(e) => setNewLoanForm({ ...newLoanForm, monthly_installment: e.target.value })}
                      className="w-full mt-1 p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  if (loanModalData.txs.length === 1) {
                    onUpdateTransaction(loanModalData.txs[0].id, { category: 'Deudas y créditos' });
                  }
                  setLoanModalData(null);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
              >
                Solo categorizar sin vincular
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setLoanModalData(null)}
                  className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!isCreatingNewLoan && !selectedTargetLoanId}
                  onClick={handleConfirmLinkLoan}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {isCreatingNewLoan ? 'Crear y Vincular' : 'Vincular al Crédito'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
