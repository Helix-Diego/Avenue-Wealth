import React, { useState } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  Briefcase, 
  User, 
  Sparkles, 
  BookmarkCheck,
  AlertCircle,
  Scissors,
  Link2,
  ArrowLeftRight
} from 'lucide-react';
import SplitTransactionModal from './SplitTransactionModal';

export default function ClarificationQueue({ 
  clarifications, 
  categories, 
  onResolve, 
  onRefresh,
  loading,
  enableCompanyExpenses = true
}) {
  const [selectedCategories, setSelectedCategories] = useState({});
  const [learnRules, setLearnRules] = useState({});
  const [resolvingId, setResolvingId] = useState(null);
  const [splitTx, setSplitTx] = useState(null);

  const safeCategories = (categories || []).filter(c => {
    const name = typeof c === 'string' ? c : c.name;
    if (!enableCompanyExpenses && name === 'Gastos de Empresa') return false;
    return true;
  });

  const handleResolve = async (tx, chosenCategory, isReimbursable) => {
    setResolvingId(tx.id);
    const shouldLearn = learnRules[tx.id] !== false; // Default true
    
    // Extract first keyword or commerce name for the learned pattern
    const pattern = tx.description.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');

    await onResolve({
      transaction_id: tx.id,
      category: chosenCategory,
      is_reimbursable: isReimbursable,
      learn_rule: shouldLearn,
      pattern: pattern
    });

    setResolvingId(null);
  };

  const handleConfirmTransferPair = async (tx) => {
    setResolvingId(tx.id);
    try {
      const res = await fetch('/api/transactions/find-transfer-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id })
      });
      const data = await res.json();
      if (data.candidate) {
        await fetch('/api/transactions/pair-transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_id_1: tx.id,
            tx_id_2: data.candidate.id
          })
        });
      } else {
        await onResolve({
          transaction_id: tx.id,
          category: 'Traspaso entre cuentas',
          is_reimbursable: false
        });
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error confirming transfer pair:', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
              Dudas del Agente Financiero
            </h1>
            <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
              Resuelve ambigüedades en transacciones para perfeccionar tu presupuesto y aprender reglas automáticas
            </p>
          </div>
        </div>
      </div>

      {/* Notion Explanatory Callout */}
      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-[#e5e5e3] dark:border-[#383838] flex items-start space-x-3.5 text-xs text-[#5f5e5b] dark:text-[#b4b4b4]">
        <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-neutral-800 dark:text-neutral-200">¿Por qué pregunta el agente?</strong>{' '}
          Para que tu presupuesto personal y métricas sean 100% verídicos, el agente te ayuda a clasificar movimientos ambiguos, traspasos o gastos especiales. Al confirmar estas dudas, el agente aprende el patrón para no volverte a preguntar en futuros extractos.
        </div>
      </div>

      {/* Doubts List or Empty State */}
      {clarifications.length === 0 ? (
        <div className="p-12 text-center rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            ¡Todo al día! No hay dudas pendientes
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Todas tus transacciones de Santander, Amex, Iberia Cards y N26 han sido clasificadas con alta confianza.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
            {clarifications.length} Movimientos Requieren Tu Confirmación
          </div>

          {clarifications.map((tx) => {
            const currentCat = selectedCategories[tx.id] || tx.suggested_category || tx.category || 'Otras compras';
            const isTransfer = tx.clarification_question && tx.clarification_question.toLowerCase().includes('traspaso');

            return (
              <div 
                key={tx.id}
                className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4 transition-all hover:border-neutral-400 dark:hover:border-neutral-500"
              >
                {/* Transaction Metadata Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {tx.account}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {tx.date}
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                    {Math.abs(tx.amount).toFixed(2)} €
                  </div>
                </div>

                {/* Concept and Agent Doubt Question */}
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {tx.description}
                  </div>
                  <div className="p-3 rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start space-x-2 text-xs text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {tx.clarification_question || `¿Cómo deseas clasificar este movimiento de ${Math.abs(tx.amount).toFixed(2)}€?`}
                    </span>
                  </div>
                </div>

                {/* Action Controls & Resolution Buttons */}
                <div className="pt-2 space-y-3">
                  {/* Category Selector & Learn Rule Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-700/60">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        Categoría:
                      </span>
                      <select
                        value={currentCat}
                        onChange={(e) => setSelectedCategories({ ...selectedCategories, [tx.id]: e.target.value })}
                        className="text-xs font-semibold bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md px-2.5 py-1.5 text-neutral-900 dark:text-white outline-none cursor-pointer"
                      >
                        {safeCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Learn Rule Toggle */}
                    <label className="flex items-center space-x-2 text-[11px] text-neutral-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={learnRules[tx.id] !== false}
                        onChange={(e) => setLearnRules({ ...learnRules, [tx.id]: e.target.checked })}
                        className="rounded border-neutral-300 text-indigo-600 focus:ring-0"
                      />
                      <span className="flex items-center gap-1 font-medium">
                        <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Recordar regla para futuros extractos
                      </span>
                    </label>
                  </div>

                  {/* Resolution Buttons - Always offering Empresa vs Personal vs Desglosar */}
                  <div className="flex items-center flex-wrap gap-2 pt-1">
                    {/* Transfer match prompt button if it's a transfer */}
                    {isTransfer && (
                      <button
                        disabled={resolvingId === tx.id}
                        onClick={() => handleConfirmTransferPair(tx)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Emparejar este traspaso con la cuenta correspondiente"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Confirmar Traspaso y Emparejar</span>
                      </button>
                    )}

                    {/* 💼 Empresa (Reembolsable) - Only if enabled */}
                    {enableCompanyExpenses && (
                      <button
                        disabled={resolvingId === tx.id}
                        onClick={() => handleResolve(tx, currentCat, 1)}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:scale-95 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        title="Marcar como gasto adelantado de empresa para reembolso"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Es de Empresa (Reembolsable)</span>
                      </button>
                    )}

                    {/* 👤 Personal - ALWAYS VISIBLE */}
                    <button
                      disabled={resolvingId === tx.id}
                      onClick={() => handleResolve(tx, currentCat, 0)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
                      title="Confirmar como gasto personal tuyo"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Es Personal</span>
                    </button>

                    {/* ✂️ Desglosar en partes */}
                    <button
                      type="button"
                      onClick={() => setSplitTx(tx)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                      title="Desglosar este movimiento en varias categorías o parte personal / empresa"
                    >
                      <Scissors className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Desglosar en partes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Split Transaction Modal */}
      {splitTx && (
        <SplitTransactionModal
          isOpen={!!splitTx}
          onClose={() => setSplitTx(null)}
          transaction={splitTx}
          categories={categories}
          onSuccess={async () => {
            if (onRefresh) {
              await onRefresh();
            }
          }}
        />
      )}
    </div>
  );
}
