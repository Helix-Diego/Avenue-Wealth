import React, { useState } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Link2,
  Calendar,
  Building
} from 'lucide-react';

export default function TransferPairModal({
  isOpen,
  onClose,
  targetTx,
  pairData,
  onPairSuccess,
  onSingleCategoryUpdate
}) {
  if (!isOpen || !targetTx || !pairData) return null;

  const { candidate, candidates = [], confidence, message } = pairData;
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidate ? candidate.id : null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentCandidate = candidates.find(c => c.id === selectedCandidateId) || candidate;

  const handleConfirmPair = async () => {
    if (!currentCandidate) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/transactions/pair-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_id_1: targetTx.id,
          tx_id_2: currentCandidate.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al emparejar los movimientos');
      }

      if (onPairSuccess) {
        await onPairSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnlyTarget = async () => {
    setSubmitting(true);
    try {
      if (onSingleCategoryUpdate) {
        await onSingleCategoryUpdate(targetTx.id, 'Traspaso entre cuentas');
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Emparejar Traspaso Entre Cuentas
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Se ha detectado automáticamente el movimiento espejo de entrada/salida en otra de tus cuentas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Both Sides Cards */}
        <div className="space-y-3">
          {/* Target Tx */}
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {targetTx.amount < 0 ? 'Salida de dinero (Origen)' : 'Entrada de dinero (Destino)'}
              </span>
              <span className="font-mono text-neutral-400 text-[11px]">{targetTx.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 dark:text-white">
                {targetTx.account}
              </span>
              <span className={`font-mono font-bold text-sm ${
                targetTx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
              }`}>
                {targetTx.amount > 0 ? `+${targetTx.amount.toFixed(2)}` : targetTx.amount.toFixed(2)} €
              </span>
            </div>
            <div className="text-neutral-600 dark:text-neutral-300 text-[11px] truncate">
              {targetTx.description}
            </div>
          </div>

          {/* Connection Link Graphic */}
          <div className="flex items-center justify-center my-1">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
              <Link2 className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {currentCandidate ? `Espejo encontrado (${Math.round((confidence || 1) * 100)}% certeza)` : 'Sin pareja'}
              </span>
            </div>
          </div>

          {/* Candidate Tx */}
          {currentCandidate ? (
            <div className="p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {currentCandidate.amount < 0 ? 'Salida de dinero (Origen)' : 'Entrada de dinero (Destino)'}
                </span>
                <span className="font-mono text-neutral-400 text-[11px]">{currentCandidate.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-900 dark:text-white">
                  {currentCandidate.account}
                </span>
                <span className={`font-mono font-bold text-sm ${
                  currentCandidate.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
                }`}>
                  {currentCandidate.amount > 0 ? `+${currentCandidate.amount.toFixed(2)}` : currentCandidate.amount.toFixed(2)} €
                </span>
              </div>
              <div className="text-neutral-600 dark:text-neutral-300 text-[11px] truncate">
                {currentCandidate.description}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-800 dark:text-amber-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>No se ha encontrado ninguna transacción con importe recíproco en otras cuentas dentro de ±3 días.</span>
            </div>
          )}

          {/* Candidates selector if multiple */}
          {candidates.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-neutral-500">
                Se encontraron {candidates.length} posibles coincidencias:
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {candidates.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all ${
                      selectedCandidateId === c.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="candidateTx"
                        checked={selectedCandidateId === c.id}
                        onChange={() => setSelectedCandidateId(c.id)}
                        className="text-indigo-600"
                      />
                      <span>{c.account} ({c.date})</span>
                    </div>
                    <span className="font-mono font-bold">
                      {c.amount > 0 ? `+${c.amount.toFixed(2)}` : c.amount.toFixed(2)} €
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleOnlyTarget}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-left sm:text-center"
          >
            Solo marcar esta sin emparejar
          </button>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!currentCandidate || submitting}
              onClick={handleConfirmPair}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                currentCandidate && !submitting
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                  : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Vinculando...' : 'Emparejar Ambos Lados'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
