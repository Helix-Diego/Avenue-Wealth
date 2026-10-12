import React, { useState, useEffect } from 'react';
import { authFetch } from '../supabaseClient';
import { 
  Briefcase, 
  Fuel, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  FileText,
  User,
  ArrowLeftRight,
  Edit3,
  X,
  Link2
} from 'lucide-react';
import LinkReimbursementModal from './LinkReimbursementModal';

const COMMON_PERSONAL_CATEGORIES = [
  "Gasolina",
  "Restaurantes",
  "Parking/Peajes/Ubers",
  "Gastos Viajes",
  "Vuelos",
  "Alimentación",
  "Otras compras"
];

export default function CompanyExpensesView({ onRefreshSummary }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [convertingTx, setConvertingTx] = useState(null); // transaction being converted to personal
  const [targetCategory, setTargetCategory] = useState("Gasolina");
  const [linkingSettlement, setLinkingSettlement] = useState(null); // settlement being reconciled with outlays

  const fetchCompanyData = async () => {
    try {
      const res = await authFetch('/api/company-expenses');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleSettleAll = async () => {
    try {
      await authFetch('/api/company-expenses/settle-all', { method: 'POST' });
      await fetchCompanyData();
      if (onRefreshSummary) onRefreshSummary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (txId, currentStatus) => {
    const newStatus = currentStatus === 'reimbursed' ? 'pending' : 'reimbursed';
    try {
      await authFetch(`/api/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reimbursement_status: newStatus })
      });
      await fetchCompanyData();
      if (onRefreshSummary) onRefreshSummary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvertToPersonal = async (txId, chosenCategory) => {
    try {
      await authFetch(`/api/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_reimbursable: 0,
          reimbursement_status: 'none',
          category: chosenCategory || 'Otras compras'
        })
      });
      setConvertingTx(null);
      await fetchCompanyData();
      if (onRefreshSummary) onRefreshSummary();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        <div className="animate-pulse">Cargando gastos de empresa...</div>
      </div>
    );
  }

  const { total_paid_out, total_reimbursed_received, pending_balance, reimbursable_transactions, settlements } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">💼</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
                Gastos Reembolsables de Empresa
              </h1>
              <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
                Gestión de importes adelantados con tu tarjeta personal pendientes de recuperar o a reclasificar a gasto personal
              </p>
            </div>
          </div>
        </div>

        {pending_balance > 0 && (
          <button
            onClick={handleSettleAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-xs cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Marcar Todo como Cobrado ({pending_balance.toFixed(2)} €)</span>
          </button>
        )}
      </div>

      {/* Explanatory Notion Callout */}
      <div className="p-4 rounded-lg bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 flex items-start space-x-3.5 text-xs text-sky-950 dark:text-sky-200">
        <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Protección de tu Presupuesto Personal:</strong> Los gastos marcados como reembolsables{' '}
          <span className="font-semibold underline decoration-sky-400">no se computan en tus gastos personales ni inflan tu consumo</span>. Si alguno de ellos fue en realidad un gasto personal tuyo (ej. gasolina personal o comida propia), pulsa en <strong>"Cambiar a Personal"</strong> para reintegrarlo en tu presupuesto.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Adelantado */}
        <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
          <div className="text-xs text-[#787774] dark:text-[#9c9c9c] font-medium flex items-center justify-between">
            <span>Total Adelantado de tu Bolsillo</span>
            <Fuel className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mt-1 font-mono">
            {total_paid_out.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Histórico de gastos adelantados
          </div>
        </div>

        {/* Total Reembolsado */}
        <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
          <div className="text-xs text-[#787774] dark:text-[#9c9c9c] font-medium flex items-center justify-between">
            <span>Reembolsos Ya Cobrados</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {total_reimbursed_received.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            Transferencias de liquidación recibidas
          </div>
        </div>

        {/* Saldo Pendiente */}
        <div className="p-4 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
          <div className="text-xs text-[#787774] dark:text-[#9c9c9c] font-medium flex items-center justify-between">
            <span>Saldo Pendiente de Cobro</span>
            <Clock className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {pending_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-medium">
            {pending_balance > 0 ? '⚠️ Dinero tuyo pendiente de recuperar' : '✅ Saldo al día'}
          </div>
        </div>
      </div>

      {/* Modal / Quick Dialog to change to personal */}
      {convertingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#242424] border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Revertir a Gasto Personal</span>
              </h3>
              <button 
                onClick={() => setConvertingTx(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
              <p>
                Este movimiento dejará de ser considerado como adelanto a la empresa y se computará en tus gastos personales:
              </p>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-1">
                <div className="font-semibold text-neutral-900 dark:text-white">{convertingTx.description}</div>
                <div className="font-mono text-neutral-500">{convertingTx.date} • {Math.abs(convertingTx.amount).toFixed(2)} € • {convertingTx.account}</div>
              </div>
              <div className="space-y-1 pt-2">
                <label className="font-medium text-neutral-700 dark:text-neutral-300">
                  ¿A qué categoría personal pertenece?
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-[#2a2a2a] border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none"
                >
                  {COMMON_PERSONAL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setConvertingTx(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConvertToPersonal(convertingTx.id, targetCategory)}
                className="px-4 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 shadow-xs"
              >
                Confirmar Gasto Personal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table: Reimbursable Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#37352f] dark:text-white">
            Detalle de Gastos Adelantados ({reimbursable_transactions.length})
          </h2>
          <span className="text-[11px] text-[#787774]">
            Pulsa el estado para marcar como cobrado, o cambia a gasto personal si fue propio
          </span>
        </div>

        <div className="bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#ececeb] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#202020] text-[#787774] dark:text-[#909090] font-medium">
                  <th className="py-2.5 px-3 w-28">Fecha</th>
                  <th className="py-2.5 px-3 w-36">Tarjeta / Cuenta</th>
                  <th className="py-2.5 px-3">Concepto / Motivo</th>
                  <th className="py-2.5 px-3 text-right w-28">Importe</th>
                  <th className="py-2.5 px-3 text-center w-36">Estado Liquidación</th>
                  <th className="py-2.5 px-3 text-center w-36">¿Gasto Personal?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0] dark:divide-[#2c2c2c]">
                {reimbursable_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      No hay gastos marcados como reembolsables.
                    </td>
                  </tr>
                ) : (
                  reimbursable_transactions.map((tx) => {
                    const isReimbursed = tx.reimbursement_status === 'reimbursed';
                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {tx.account}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {tx.description}
                          </div>
                          {tx.notes && (
                            <div className="text-[10px] text-neutral-400">
                              {tx.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          {Math.abs(tx.amount).toFixed(2)} €
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(tx.id, tx.reimbursement_status)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                              isReimbursed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            }`}
                          >
                            {isReimbursed ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Reembolsado</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pendiente de cobro</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              // Infer reasonable category
                              const d = (tx.description || '').toUpperCase();
                              let guess = 'Otras compras';
                              if (d.includes('REPSOL') || d.includes('CEPSA') || d.includes('GASOLINA')) guess = 'Gasolina';
                              else if (d.includes('PARKING') || d.includes('PEAJE') || d.includes('UBER')) guess = 'Parking/Peajes/Ubers';
                              else if (d.includes('REST') || d.includes('BAR') || d.includes('CAFE')) guess = 'Restaurantes';
                              setTargetCategory(guess);
                              setConvertingTx(tx);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                            title="Cambiar este gasto a gasto personal normal"
                          >
                            <User className="w-3 h-3 text-neutral-500" />
                            <span>Pasar a Personal</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settlements received */}
      {settlements.length > 0 && (
        <div className="space-y-3 pt-3">
          <h2 className="text-sm font-semibold text-[#37352f] dark:text-white">
            Abonos y Liquidaciones Recibidas de la Empresa
          </h2>
          <div className="bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] rounded-lg shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#ececeb] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#202020] text-[#787774] dark:text-[#909090] font-medium">
                  <th className="py-2.5 px-3 w-28">Fecha</th>
                  <th className="py-2.5 px-3 w-36">Cuenta</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3 text-right w-28">Importe Recibido</th>
                  <th className="py-2.5 px-3 text-center w-36">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f0] dark:divide-[#2c2c2c]">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/70 dark:hover:bg-[#2a2a2a]/50">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500">{s.date}</td>
                    <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">{s.account}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-800 dark:text-neutral-200">{s.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      +{s.amount.toFixed(2)} €
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setLinkingSettlement(s)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                        title="Vincular con los gastos adelantados correspondientes para marcarlos como reembolsados"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Vincular Gastos</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reconcile Reimbursement Modal */}
      {linkingSettlement && (
        <LinkReimbursementModal
          isOpen={!!linkingSettlement}
          onClose={() => setLinkingSettlement(null)}
          settlement={linkingSettlement}
          onSuccess={async () => {
            await fetchCompanyData();
            if (onRefreshSummary) {
              await onRefreshSummary();
            }
          }}
        />
      )}
    </div>
  );
}
