import React, { useState, useEffect } from 'react';
import { authFetch } from '../supabaseClient';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  PiggyBank, 
  DollarSign, 
  Flame,
  ShieldCheck,
  Target,
  Settings2,
  Save,
  Check,
  Info
} from 'lucide-react';

export default function ForecastView({ 
  forecast, 
  onRefresh, 
  enableCompanyExpenses = true,
  selectedMonth 
}) {
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [expectedIncome, setExpectedIncome] = useState(forecast?.expected_income || 0);
  const [targetSavings, setTargetSavings] = useState(forecast?.target_savings || 0);
  const [budgetMax, setBudgetMax] = useState(forecast?.budget_max || 0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    if (forecast) {
      if (forecast.expected_income !== undefined) setExpectedIncome(forecast.expected_income);
      if (forecast.target_savings !== undefined) setTargetSavings(forecast.target_savings);
      if (forecast.budget_max !== undefined) setBudgetMax(forecast.budget_max);
    }
  }, [forecast]);

  const handleSaveForecastSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await authFetch('/api/forecast/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_income: parseFloat(expectedIncome) || 0,
          target_savings: parseFloat(targetSavings) || 0,
          budget_max: parseFloat(budgetMax) || 0
        })
      });
      if (res.ok) {
        setSaveSuccessNotice(true);
        setTimeout(() => setSaveSuccessNotice(false), 3000);
        setIsEditingSettings(false);
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      console.error('Error saving forecast settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!forecast) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        <div className="animate-pulse">Calculando pronósticos y recomendaciones...</div>
      </div>
    );
  }

  const {
    month,
    days_elapsed = 1,
    days_total = 30,
    days_remaining = 29,
    has_data = false,
    has_targets = false,
    tx_count = 0,
    total_income = 0,
    gross_expenses = 0,
    company_reimbursable_expenses = 0,
    personal_expenses = 0,
    fixed_expenses = 0,
    variable_expenses = 0,
    daily_burn_rate = 0,
    projected_total_expenses = 0,
    projected_net_savings = 0,
    projected_savings_rate = 0,
    daily_safe_spend = 0,
    recommendations = []
  } = forecast;

  const progressPercent = Math.min(100, Math.round((days_elapsed / days_total) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🔮</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
                Pronósticos & Metas Financieras
              </h1>
              <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
                Proyección de cierre de mes basada en tu velocidad real de gasto y metas establecidas
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditingSettings(!isEditingSettings)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all cursor-pointer shadow-2xs ${
            isEditingSettings
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white'
              : 'bg-white dark:bg-[#242424] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{isEditingSettings ? 'Cerrar Ajustes' : 'Establecer Metas y Presupuesto'}</span>
        </button>
      </div>

      {/* Target Configuration Panel (Collapsible or Prompted) */}
      {isEditingSettings && (
        <form 
          onSubmit={handleSaveForecastSettings}
          className="p-5 rounded-xl bg-white dark:bg-[#242424] border-2 border-indigo-500/40 dark:border-indigo-500/30 shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                <span>Configurar Metas Mensuales de Presupuesto</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Define tus expectativas de ingresos y gasto para que el motor de pronóstico compare tu ritmo de consumo en tiempo real.
              </p>
            </div>
            {saveSuccessNotice && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" /> Guardado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Sueldo / Ingreso Previsto (€/mes):
              </label>
              <input
                type="number"
                step="50"
                placeholder="Ej. 2500"
                value={expectedIncome || ''}
                onChange={(e) => setExpectedIncome(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] outline-none font-mono"
              />
              <span className="text-[10px] text-neutral-400">Si no has cobrado la nómina aún, se usará de referencia.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Presupuesto Máximo de Gasto (€/mes):
              </label>
              <input
                type="number"
                step="50"
                placeholder="Ej. 1800"
                value={budgetMax || ''}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] outline-none font-mono"
              />
              <span className="text-[10px] text-neutral-400">Límite para calcular tu ritmo diario seguro.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Objetivo de Ahorro Neto (€/mes):
              </label>
              <input
                type="number"
                step="50"
                placeholder="Ej. 500"
                value={targetSavings || ''}
                onChange={(e) => setTargetSavings(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] outline-none font-mono"
              />
              <span className="text-[10px] text-neutral-400">Meta que deseas retener a fin de mes.</span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingSettings(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Guardando...' : 'Guardar Parámetros'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Empty State when no transactions in this month */}
      {!has_data && (
        <div className="p-8 rounded-xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Pronósticos pendientes de datos
            </h3>
            <p className="text-xs text-neutral-500">
              Aún no hay movimientos importados en este mes ({month}). El agente necesita tus extractos bancarios para calcular la velocidad de gasto diario y proyectar el cierre.
            </p>
          </div>

          {!has_targets && !isEditingSettings && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsEditingSettings(true)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs inline-flex items-center space-x-2 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Establecer mis metas y sueldo previsto</span>
              </button>
            </div>
          )}

          {has_targets && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2 text-left">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Sueldo Previsto</span>
                <span className="text-sm font-bold font-mono text-neutral-900 dark:text-white">{expectedIncome} €</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Presupuesto Máx.</span>
                <span className="text-sm font-bold font-mono text-neutral-900 dark:text-white">{budgetMax} €</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 block font-medium">Meta Ahorro</span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{targetSavings} €</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Month Progress & Burn Rate Velocity (Displayed when data exists or targets set) */}
      {has_data && (
        <>
          <div className="p-5 rounded-lg bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Avance del Mes ({days_elapsed} de {days_total} días transcurridos)
              </span>
              <span className="font-mono text-neutral-500">
                Quedan {days_remaining} días
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Velocity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-md bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> Ritmo de Gasto Variable
                </span>
                <div className="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5">
                  {daily_burn_rate.toFixed(1)} € / día
                </div>
                <span className="text-[10px] text-neutral-400">Supermercado, ocio, transporte personal</span>
              </div>

              <div className="p-3 rounded-md bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                  <Target className="w-3.5 h-3.5 text-emerald-500" /> Presupuesto Diario Seguro
                </span>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {daily_safe_spend.toFixed(1)} € / día
                </div>
                <span className="text-[10px] text-neutral-400">Límite para cumplir tu objetivo de ahorro</span>
              </div>

              <div className="p-3 rounded-md bg-neutral-50 dark:bg-[#2a2a2a] border border-neutral-200/60 dark:border-neutral-700/60">
                <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                  <PiggyBank className="w-3.5 h-3.5 text-violet-500" /> Ahorro Previsto a Cierre
                </span>
                <div className="text-lg font-bold font-mono text-violet-600 dark:text-violet-400 mt-0.5">
                  {projected_net_savings.toFixed(2)} €
                </div>
                <span className="text-[10px] text-neutral-400">{projected_savings_rate}% de tasa de ahorro estimada</span>
              </div>
            </div>
          </div>

          {/* Accounting Disaggregation Box */}
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Fórmula de Proyección Sin Distorsión Contable</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
              <div>Gasto Bruto: <strong>{gross_expenses.toFixed(2)}€</strong></div>
              {enableCompanyExpenses && (
                <div className="text-sky-600">Empresa: <strong>-{company_reimbursable_expenses.toFixed(2)}€</strong></div>
              )}
              <div className="text-neutral-900 dark:text-white font-bold">Personal Real: <strong>{personal_expenses.toFixed(2)}€</strong></div>
              <div className="text-indigo-600 font-bold">Proyección Mes: <strong>{projected_total_expenses.toFixed(2)}€</strong></div>
            </div>
          </div>

          {/* Actionable Recommendations List */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#37352f] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Consejos Prácticos & Decisiones Sugeridas por el Agente</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => {
                  const borderColors = {
                    primary: "border-violet-200 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20",
                    warning: "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20",
                    success: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20",
                    info: "border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20",
                    neutral: "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#252525]"
                  };

                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border shadow-xs space-y-2 ${borderColors[rec.severity] || borderColors.neutral}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{rec.icon}</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {rec.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-[#333] shadow-xs text-neutral-800 dark:text-neutral-200">
                          {rec.impact}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
