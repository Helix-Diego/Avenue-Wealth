import React, { useState, useEffect } from 'react';
import { authFetch } from '../supabaseClient';
import { 
  X, 
  ArrowLeftRight, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  Building, 
  Tag, 
  DollarSign,
  FileText
} from 'lucide-react';

export default function LinkedPairDetailModal({
  isOpen,
  onClose,
  txId,
  onUnpairSuccess
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unpairing, setUnpairing] = useState(false);
  const [confirmUnpair, setConfirmUnpair] = useState(false);

  useEffect(() => {
    if (isOpen && txId) {
      setLoading(true);
      setErrorMsg('');
      setConfirmUnpair(false);
      authFetch(`/api/transactions/${txId}/linked-pair`)
        .then(res => {
          if (!res.ok) throw new Error('No se pudo cargar el traspaso vinculado');
          return res.json();
        })
        .then(resData => setData(resData))
        .catch(err => {
          console.error(err);
          setErrorMsg(err.message || 'Error al obtener datos');
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, txId]);

  if (!isOpen) return null;

  const handleUnpair = async () => {
    setUnpairing(true);
    try {
      const res = await authFetch('/api/transactions/unpair-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId })
      });
      if (!res.ok) throw new Error('Error al desvincular traspaso');
      if (onUnpairSuccess) {
        await onUnpairSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setUnpairing(false);
    }
  };

  const source = data?.source_tx;
  const dest = data?.dest_tx;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#222222] border border-neutral-200 dark:border-neutral-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Detalle del Traspaso Vinculado
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Conciliación bilateral entre cuentas propias
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-neutral-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Cargando movimientos vinculados...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!loading && data && data.is_paired && source && dest && (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {/* Source Card (Salida / Origen) */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  source.id === txId
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/70 shadow-xs'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Origen • Salida
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      ID #{source.id}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                      {source.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300 font-semibold mt-1">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{source.account}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Fecha: <strong className="text-neutral-800 dark:text-neutral-200">{source.date}</strong></span>
                    </div>
                    <div className="text-[11.5px] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded border border-neutral-100 dark:border-neutral-800 line-clamp-2">
                      {source.description}
                    </div>
                    {source.balance !== null && source.balance !== undefined && (
                      <div className="text-[11px] text-neutral-400 font-mono pt-0.5">
                        Saldo posterior: {source.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Card (Entrada / Destino) */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  dest.id === txId
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70 shadow-xs'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Destino • Entrada
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      ID #{dest.id}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      +{dest.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300 font-semibold mt-1">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{dest.account}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Fecha: <strong className="text-neutral-800 dark:text-neutral-200">{dest.date}</strong></span>
                    </div>
                    <div className="text-[11.5px] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded border border-neutral-100 dark:border-neutral-800 line-clamp-2">
                      {dest.description}
                    </div>
                    {dest.balance !== null && dest.balance !== undefined && (
                      <div className="text-[11px] text-neutral-400 font-mono pt-0.5">
                        Saldo posterior: {dest.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Zero-Impact Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Traspaso interno compensado (Neto: {data.net_difference.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €)
                  </span>
                  <p className="text-emerald-800/80 dark:text-emerald-300/80 text-[11px]">
                    Al estar enlazadas, estas transacciones quedan totalmente neutralizadas en tus métricas de consumo e ingresos. No inflan tus gastos ni alteran tu cálculo de ahorro.
                  </p>
                </div>
              </div>
            </>
          )}

          {!loading && data && !data.is_paired && (
            <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
              <p>{data.message || 'El movimiento no tiene un traspaso enlazado actualmente.'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between">
          <div>
            {data?.is_paired && (
              confirmUnpair ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400">¿Confirmar desvinculación?</span>
                  <button
                    onClick={handleUnpair}
                    disabled={unpairing}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
                  >
                    {unpairing ? 'Desvinculando...' : 'Sí, desvincular'}
                  </button>
                  <button
                    onClick={() => setConfirmUnpair(false)}
                    className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmUnpair(true)}
                  className="flex items-center space-x-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Desvincular Traspaso</span>
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
