import React from 'react';
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
  Target
} from 'lucide-react';

export default function ForecastView({ forecast }) {
  if (!forecast) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        <div className="animate-pulse">Calculando pronósticos y recomendaciones...</div>
      </div>
    );
  }

  const {
    month,
    days_elapsed,
    days_total,
    days_remaining,
    total_income,
    gross_expenses,
    company_reimbursable_expenses,
    personal_expenses,
    fixed_expenses,
    variable_expenses,
    daily_burn_rate,
    projected_total_expenses,
    projected_net_savings,
    projected_savings_rate,
    daily_safe_spend,
    recommendations
  } = forecast;

  const progressPercent = Math.min(100, Math.round((days_elapsed / days_total) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🔮</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
              Pronósticos & Recomendaciones Financieras
            </h1>
            <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
              Proyección de cierre de mes basada en tu velocidad de gasto real (excluyendo adelantos a empresa)
            </p>
          </div>
        </div>
      </div>

      {/* Month Progress & Burn Rate Velocity */}
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
          <span>Fórmula de Proyección Sin Distorsión por Gastos de BMC</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
          <div>Gasto Bruto: <strong>{gross_expenses.toFixed(2)}€</strong></div>
          <div className="text-sky-600">Empresa: <strong>-{company_reimbursable_expenses.toFixed(2)}€</strong></div>
          <div className="text-neutral-900 dark:text-white font-bold">Personal Real: <strong>{personal_expenses.toFixed(2)}€</strong></div>
          <div className="text-indigo-600 font-bold">Proyección Mes: <strong>{projected_total_expenses.toFixed(2)}€</strong></div>
        </div>
      </div>

      {/* Actionable Recommendations List */}
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
    </div>
  );
}
