import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Sparkles } from 'lucide-react';

export default function MsciContributionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentNav = 12.10 
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [investedAmount, setInvestedAmount] = useState('1000');
  const [navPrice, setNavPrice] = useState(currentNav ? currentNav.toString() : '12.10');
  const [notes, setNotes] = useState('Aportación periódica mensual');

  useEffect(() => {
    if (currentNav) {
      setNavPrice(currentNav.toString());
    }
  }, [currentNav]);

  if (!isOpen) return null;

  const numAmount = parseFloat(investedAmount) || 0;
  const numNav = parseFloat(navPrice) || 12.10;
  const calculatedShares = numNav > 0 ? (numAmount / numNav) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numAmount <= 0) return;

    onSave({
      date,
      invested_amount: numAmount,
      nav_price: numNav,
      shares: calculatedShares,
      notes: notes || 'Aportación MSCI World'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#222222] border border-[#e5e5e3] dark:border-[#353535] rounded-xl shadow-xl w-full max-w-md overflow-hidden text-xs text-neutral-800 dark:text-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">📈</span>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                Aportación al Fondo MSCI World
              </h3>
              <p className="text-[10px] text-neutral-400">
                Fidelity MSCI World Index • ISIN: IE00BYX5P602
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Fecha de la Aportación</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">Importe Invertido (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">NAV / Valor Liq. (€)</label>
              <input
                type="number"
                step="0.001"
                value={navPrice}
                onChange={(e) => setNavPrice(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none font-mono"
              />
            </div>
          </div>

          {/* Computed shares preview */}
          <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 flex items-center justify-between">
            <span className="text-[11px] text-violet-900 dark:text-violet-300 font-medium">
              Participaciones Calculadas:
            </span>
            <span className="text-sm font-bold font-mono text-violet-700 dark:text-violet-400">
              +{calculatedShares.toFixed(4)} títulos
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Concepto / Nota</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md font-semibold bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-xs"
            >
              Registrar Aportación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
