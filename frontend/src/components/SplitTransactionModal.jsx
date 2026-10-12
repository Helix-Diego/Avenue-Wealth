import React, { useState, useEffect } from 'react';
import { 
  X, 
  Scissors, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function SplitTransactionModal({
  isOpen,
  onClose,
  transaction,
  categories = [],
  onSuccess
}) {
  if (!isOpen || !transaction) return null;

  const origAmount = Number(transaction.amount) || 0;
  const isPositive = origAmount > 0;
  const absTotal = Math.abs(origAmount);

  // Initialize splits: default to 2 parts
  const [splits, setSplits] = useState([
    {
      amount: Math.round((absTotal / 2) * 100) / 100,
      category: transaction.category || 'Restaurantes',
      is_reimbursable: transaction.is_reimbursable === 1,
      notes: ''
    },
    {
      amount: Math.round((absTotal - (Math.round((absTotal / 2) * 100) / 100)) * 100) / 100,
      category: 'Otras compras',
      is_reimbursable: false,
      notes: ''
    }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate allocated sum and remaining
  const allocatedSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const remaining = Math.round((absTotal - allocatedSum) * 100) / 100;
  const isSquared = Math.abs(remaining) < 0.005;

  const handleAddSplit = () => {
    const nextAmount = remaining > 0 ? remaining : 0;
    setSplits([
      ...splits,
      {
        amount: nextAmount,
        category: categories[0] || 'Otras compras',
        is_reimbursable: false,
        notes: ''
      }
    ]);
  };

  const handleRemoveSplit = (index) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleUpdateSplit = (index, field, value) => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setSplits(updated);
  };

  const handleSubmit = async () => {
    if (!isSquared) {
      setErrorMsg(`El desglose no cuadra. Falta o sobra ${Math.abs(remaining).toFixed(2)} €.`);
      return;
    }

    // Verify all parts have category and positive amounts
    for (let i = 0; i < splits.length; i++) {
      if (!splits[i].category) {
        setErrorMsg(`La parte #${i + 1} no tiene categoría seleccionada.`);
        return;
      }
      if (Number(splits[i].amount) <= 0) {
        setErrorMsg(`La parte #${i + 1} debe tener un importe mayor a cero.`);
        return;
      }
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      // Backend expects signed amounts matching original sign
      const payloadSplits = splits.map((s) => ({
        amount: isPositive ? Math.abs(Number(s.amount)) : -Math.abs(Number(s.amount)),
        category: s.category,
        is_reimbursable: s.is_reimbursable,
        notes: s.notes
      }));

      const res = await fetch('/api/transactions/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          splits: payloadSplits
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al desglosar la transacción');
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
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Scissors className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Desglosar Movimiento en Múltiples Categorías
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ideal para Bizums que cubren varias cosas (ej. cena + uber) o compras mixtas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[11px] px-2 py-0.5 rounded font-medium bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300">
                {transaction.account}
              </span>
              <span className="font-mono text-neutral-400">{transaction.date}</span>
            </div>
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-md">
              {transaction.description}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Importe Original</span>
            <span className={`text-base font-mono font-bold ${
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
            }`}>
              {isPositive ? `+${absTotal.toFixed(2)}` : `-${absTotal.toFixed(2)}`} €
            </span>
          </div>
        </div>

        {/* Dynamic Splits Form */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {splits.map((s, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <span>Parte #{idx + 1}</span>
                </span>
                {splits.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSplit(idx)}
                    className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                    title="Eliminar esta parte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Amount */}
                <div className="sm:col-span-3">
                  <label className="text-[10px] text-neutral-400 block mb-0.5 font-medium">Importe (€)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={s.amount}
                      onChange={(e) => handleUpdateSplit(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="sm:col-span-5">
                  <label className="text-[10px] text-neutral-400 block mb-0.5 font-medium">Categoría</label>
                  <select
                    value={s.category}
                    onChange={(e) => handleUpdateSplit(idx, 'category', e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Concept / Notes */}
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-neutral-400 block mb-0.5 font-medium">Nota / Detalle</label>
                  <input
                    type="text"
                    value={s.notes}
                    onChange={(e) => handleUpdateSplit(idx, 'notes', e.target.value)}
                    placeholder="Ej. Mi parte de la cena..."
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Is reimbursable toggle */}
              <div className="pt-1 flex items-center">
                <label className="flex items-center space-x-2 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={s.is_reimbursable}
                    onChange={(e) => handleUpdateSplit(idx, 'is_reimbursable', e.target.checked)}
                    className="rounded border-neutral-300 text-sky-600 focus:ring-0"
                  />
                  <span className="flex items-center gap-1 font-medium">
                    <Briefcase className="w-3 h-3 text-sky-600" />
                    Esta parte es gasto de empresa (reembolsable)
                  </span>
                </label>
              </div>
            </div>
          ))}

          {/* Add Split Button */}
          <button
            type="button"
            onClick={handleAddSplit}
            className="w-full py-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir otra categoría al desglose</span>
          </button>
        </div>

        {/* Real-time Math & Balance Indicator */}
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
          isSquared
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            : remaining > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {isSquared ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {isSquared
                  ? 'Desglose exacto y cuadrado'
                  : remaining > 0
                    ? `Faltan ${remaining.toFixed(2)} € por asignar`
                    : `Excede el importe por ${Math.abs(remaining).toFixed(2)} €`}
              </span>
              <span className="text-[11px] block opacity-80">
                Asignado: {allocatedSum.toFixed(2)} € de {absTotal.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="text-right font-mono font-bold text-sm">
            {remaining > 0 ? `-${remaining.toFixed(2)} €` : remaining < 0 ? `+${Math.abs(remaining).toFixed(2)} €` : '0.00 €'}
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
            disabled={!isSquared || submitting}
            onClick={handleSubmit}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
              isSquared && !submitting
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{submitting ? 'Desglosando...' : 'Aplicar Desglose'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
