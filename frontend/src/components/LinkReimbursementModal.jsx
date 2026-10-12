import React, { useState, useEffect } from 'react';
import { authFetch } from '../supabaseClient';
import { 
  X, 
  Link2, 
  Check, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  Briefcase, 
  Fuel, 
  Receipt,
  Clock
} from 'lucide-react';

export default function LinkReimbursementModal({
  isOpen,
  onClose,
  settlement,
  onSuccess
}) {
  if (!isOpen || !settlement) return null;

  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const settlementAmount = Math.abs(Number(settlement.amount)) || 0;

  useEffect(() => {
    fetchPendingExpenses();
  }, [settlement.id]);

  const fetchPendingExpenses = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/company-expenses/pending-expenses');
      const data = await res.json();
      const expenses = data.pending_expenses || [];
      setPendingExpenses(expenses);

      // Pre-select exact matches if any
      const exactMatch = expenses.find(e => Math.abs(Math.abs(Number(e.amount)) - settlementAmount) < 0.05);
      if (exactMatch) {
        setSelectedIds([exactMatch.id]);
      } else {
        // Pre-select all by default if total is close, or empty
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error fetching pending company expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTotal = pendingExpenses
    .filter(e => selectedIds.includes(e.id))
    .reduce((acc, e) => acc + Math.abs(Number(e.amount) || 0), 0);

  const difference = Math.round((settlementAmount - selectedTotal) * 100) / 100;
  const isExact = Math.abs(difference) < 0.05;

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingExpenses.map(e => e.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos un gasto para vincular.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authFetch('/api/company-expenses/link-reimbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: settlement.id,
          expense_ids: selectedIds
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al vincular el reembolso');
      }

      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Vincular Devolución a Gastos de Empresa
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Asocia este ingreso de BMC con los gastos que adelantaste con tu dinero para marcarlos como cobrados.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settlement Received Summary Card */}
        <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                Devolución Recibida
              </span>
              <span className="font-mono text-neutral-400">{settlement.date}</span>
              <span className="text-neutral-500 font-mono">({settlement.account})</span>
            </div>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-md">
              {settlement.description}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
              +{settlementAmount.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Select All Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center space-x-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
          >
            {selectedIds.length === pendingExpenses.length && pendingExpenses.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            ) : (
              <Square className="w-4 h-4 text-neutral-400" />
            )}
            <span>Seleccionar todos ({selectedIds.length}/{pendingExpenses.length})</span>
          </button>
          <span className="text-[11px] text-neutral-400">
            Marca los gastos que incluye esta transferencia
          </span>
        </div>

        {/* Pending Expenses Checklist */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Cargando gastos pendientes...
            </div>
          ) : pendingExpenses.length === 0 ? (
            <div className="p-8 text-center rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-500 space-y-1">
              <Check className="w-5 h-5 mx-auto text-emerald-500" />
              <p className="font-medium">No hay gastos de empresa pendientes de cobrar.</p>
              <p className="text-[11px] text-neutral-400">Todos los gastos registrados ya han sido liquidados.</p>
            </div>
          ) : (
            pendingExpenses.map((exp) => {
              const isSelected = selectedIds.includes(exp.id);
              const expAmt = Math.abs(Number(exp.amount) || 0);

              return (
                <div
                  key={exp.id}
                  onClick={() => toggleSelect(exp.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors pt-2.5 ${
                    isSelected
                      ? 'bg-sky-50/70 dark:bg-sky-950/30'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-3">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center space-x-2 font-mono text-[10.5px] text-neutral-400">
                        <span>{exp.date}</span>
                        <span>•</span>
                        <span>{exp.account}</span>
                        <span>•</span>
                        <span className="font-medium text-neutral-600 dark:text-neutral-300">{exp.category}</span>
                      </div>
                      <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {exp.description}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 font-mono font-bold text-neutral-900 dark:text-white">
                    {expAmt.toFixed(2)} €
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Real-time Math & Balance Indicator */}
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
          isExact
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : difference > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {isExact ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {isExact
                  ? 'Reconciliación exacta'
                  : difference > 0
                    ? `Quedan ${difference.toFixed(2)} € sin vincular del abono`
                    : `Los gastos seleccionados superan el abono por ${Math.abs(difference).toFixed(2)} €`}
              </span>
              <span className="text-[11px] block opacity-80">
                Seleccionados: {selectedTotal.toFixed(2)} € de {settlementAmount.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="text-right font-mono font-bold text-sm">
            {difference > 0 ? `-${difference.toFixed(2)} €` : difference < 0 ? `+${Math.abs(difference).toFixed(2)} €` : '0.00 €'}
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0 || submitting}
            onClick={handleSubmit}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
              selectedIds.length > 0 && !submitting
                ? 'bg-sky-600 hover:bg-sky-700 active:scale-95'
                : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{submitting ? 'Vinculando...' : `Vincular (${selectedIds.length} gastos)`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
