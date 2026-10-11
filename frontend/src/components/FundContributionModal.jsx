import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Sparkles, Building, Landmark } from 'lucide-react';

export default function FundContributionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  funds = [],
  selectedFundIsin = '',
  banksList = [],
  accountsList = []
}) {
  const [isin, setIsin] = useState(selectedFundIsin || (funds[0]?.isin || 'IE00BYX5P602'));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [investedAmount, setInvestedAmount] = useState('1000');
  const [navPrice, setNavPrice] = useState('');
  const [fundingAccount, setFundingAccount] = useState('Santander');
  const [notes, setNotes] = useState('Aportación periódica');

  // Update selected fund and NAV when modal opens or funds list change
  useEffect(() => {
    const targetIsin = selectedFundIsin || (funds.length > 0 ? funds[0].isin : 'IE00BYX5P602');
    setIsin(targetIsin);

    const f = funds.find(x => x.isin === targetIsin);
    if (f && f.latest_nav > 0) {
      setNavPrice(f.latest_nav.toString());
      setNotes(`Aportación ${f.name}`);
    } else {
      setNavPrice('12.10');
    }
  }, [isOpen, selectedFundIsin, funds]);

  // When user changes the selected fund in dropdown
  const handleFundChange = (newIsin) => {
    setIsin(newIsin);
    const f = funds.find(x => x.isin === newIsin);
    if (f && f.latest_nav > 0) {
      setNavPrice(f.latest_nav.toString());
      setNotes(`Aportación ${f.name}`);
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(investedAmount) || 0;
  const numNav = parseFloat(navPrice) || 12.10;
  const calculatedShares = numNav > 0 ? (numAmount / numNav) : 0;

  const currentFund = funds.find(x => x.isin === isin);

  // Build account options using bank aliases
  const accountOptions = [];
  banksList.forEach(b => {
    if (b.enabled) {
      accountOptions.push({
        id: b.id,
        label: b.alias || b.name,
        value: b.alias || b.name
      });
    }
  });
  accountsList.forEach(acc => {
    if (!accountOptions.some(o => o.value === acc.account_name)) {
      accountOptions.push({
        id: acc.account_name,
        label: acc.account_name,
        value: acc.account_name
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numAmount <= 0) return;

    onSave({
      isin,
      date,
      invested_amount: numAmount,
      nav_price: numNav,
      shares: calculatedShares,
      funding_account: fundingAccount || 'Santander',
      notes: notes || `Aportación fondo ${isin}`
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                Nueva Aportación a Fondo de Inversión
              </h3>
              <p className="text-[10px] text-neutral-400">
                Registra tu aportación periódica o extraordinaria
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Fund selection */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Fondo de Inversión Destino
            </label>
            {funds.length > 0 ? (
              <select
                value={isin}
                onChange={(e) => handleFundChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 font-medium text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500"
              >
                {funds.map((f) => (
                  <option key={f.isin} value={f.isin}>
                    {f.name} ({f.isin})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Código ISIN (ej. IE00BYX5P602)"
                value={isin}
                onChange={(e) => setIsin(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 font-mono text-neutral-900 dark:text-white outline-none"
              />
            )}
          </div>

          {/* Date & Funding Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 outline-none text-neutral-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Cuenta de Origen
              </label>
              <select
                value={fundingAccount}
                onChange={(e) => setFundingAccount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 outline-none text-neutral-900 dark:text-white truncate"
              >
                {accountOptions.length > 0 ? (
                  accountOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Santander">Santander</option>
                    <option value="American Express">American Express</option>
                    <option value="N26">N26</option>
                    <option value="MyInvestor">MyInvestor</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Amount & NAV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Importe Invertido (€)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 outline-none font-mono text-neutral-900 dark:text-white focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                NAV / Valor Liq. (€)
              </label>
              <input
                type="number"
                step="0.0001"
                value={navPrice}
                onChange={(e) => setNavPrice(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 outline-none font-mono text-neutral-900 dark:text-white focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Computed shares preview */}
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 flex items-center justify-between">
            <span className="text-[11px] text-violet-900 dark:text-violet-300 font-medium">
              Participaciones Calculadas:
            </span>
            <span className="text-sm font-bold font-mono text-violet-700 dark:text-violet-300">
              +{calculatedShares.toFixed(4)} títulos
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">
              Concepto / Nota (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200 dark:border-neutral-700 outline-none text-neutral-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-xs transition-colors"
            >
              Registrar Aportación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
