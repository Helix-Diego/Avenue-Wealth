import React, { useState } from 'react';
import { X, Briefcase, Plus } from 'lucide-react';

export default function NewTransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories 
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState('Banco Santander');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [notes, setNotes] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [accountOptions, setAccountOptions] = useState([
    "Banco Santander",
    "American Express",
    "Iberia Cards",
    "N26",
    "MyInvestor",
    "Cuenta Bancaria"
  ]);

  React.useEffect(() => {
    fetch('/api/settings/banks')
      .then(res => res.json())
      .then(data => {
        if (data?.banks) {
          const enabledNames = data.banks.filter(b => b.enabled).map(b => b.name);
          if (enabledNames.length > 0) {
            setAccountOptions(enabledNames);
            setAccount(enabledNames[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;

    const numAmt = parseFloat(amount.replace(',', '.'));
    const finalAmt = isIncome ? Math.abs(numAmt) : -Math.abs(numAmt);

    onSave({
      date,
      account,
      description,
      amount: finalAmt,
      category: category || null,
      is_reimbursable: isReimbursable ? 1 : 0,
      notes: notes || null
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#222222] border border-[#e5e5e3] dark:border-[#353535] rounded-xl shadow-xl w-full max-w-md overflow-hidden text-xs text-neutral-800 dark:text-neutral-200">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">💳</span>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              Nuevo Movimiento Bancario
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Income vs Expense Toggle */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all cursor-pointer ${
                !isIncome ? 'bg-white dark:bg-[#333] shadow-xs text-rose-600 dark:text-rose-400' : 'text-neutral-500'
              }`}
            >
              Gasto / Pago
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-all cursor-pointer ${
                isIncome ? 'bg-white dark:bg-[#333] shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'
              }`}
            >
              Ingreso / Reembolso
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">Cuenta / Tarjeta</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
              >
                {accountOptions.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Concepto o Comercio</label>
            <input
              type="text"
              placeholder="Ej. Alcampo, Repsol Waylet, Alquiler Agustín, Iberia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">Importe (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="45.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-[#2b2b2b] border border-neutral-200 dark:border-neutral-700 outline-none"
              >
                <option value="">(Auto clasificar por Knowledge Base / IA)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Company reimbursable toggle */}
          <label className="flex items-center space-x-2 p-2.5 rounded-md bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 cursor-pointer">
            <input
              type="checkbox"
              checked={isReimbursable}
              onChange={(e) => setIsReimbursable(e.target.checked)}
              className="rounded border-sky-400 text-sky-600 focus:ring-0"
            />
            <div className="text-[11px]">
              <span className="font-semibold text-sky-900 dark:text-sky-300 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Gasto Reembolsable de Empresa (BMC)
              </span>
              <span className="text-sky-800 dark:text-sky-400 block">
                No computará como gasto personal ni inflará tu consumo de gasolina; quedará como saldo a cobrar de BMC.
              </span>
            </div>
          </label>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Nota adicional</label>
            <input
              type="text"
              placeholder="Opcional: Viaje cliente BMC, reunión..."
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
              className="px-4 py-1.5 rounded-md font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 cursor-pointer shadow-xs"
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
