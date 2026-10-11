import React from 'react';
import { 
  LayoutDashboard, 
  HelpCircle, 
  CreditCard, 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Upload, 
  Sun, 
  Moon,
  ExternalLink,
  Wallet,
  MessageSquare,
  Landmark,
  Settings
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  doubtsCount, 
  capitalGlobal, 
  darkMode, 
  setDarkMode,
  companyPending,
  userName = 'Mi Espacio'
}) {
  const navItems = [
    { id: 'dashboard', label: 'Visión General', icon: LayoutDashboard },
    { 
      id: 'chat', 
      label: 'Chat Asistente IA', 
      icon: MessageSquare, 
      badge: 'DeepSeek',
      badgeColor: 'bg-indigo-600 text-white'
    },
    { 
      id: 'clarifications', 
      label: 'Dudas del Agente', 
      icon: HelpCircle, 
      badge: doubtsCount > 0 ? doubtsCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    { id: 'transactions', label: 'Transacciones', icon: CreditCard },
    { id: 'loans', label: 'Préstamos & Créditos', icon: Landmark },
    { 
      id: 'company', 
      label: 'Gastos Reembolsables', 
      icon: Briefcase,
      badge: companyPending > 0 ? `${companyPending.toFixed(0)}€` : null,
      badgeColor: 'bg-sky-500 text-white'
    },
    { id: 'portfolio', label: 'Portfolio & Capital', icon: TrendingUp },
    { id: 'forecast', label: 'Pronósticos & IA', icon: Sparkles },
    { id: 'import', label: 'Importar Extractos', icon: Upload },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-[#ececeb] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#202020] select-none h-full transition-colors duration-150">
      <div>
        {/* Workspace Brand Header */}
        <div className="px-4 py-4 border-b border-[#ececeb] dark:border-[#2f2f2f]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shadow-sm">
              🏦
            </div>
            <div className="truncate">
              <h1 className="text-sm font-semibold tracking-tight text-[#37352f] dark:text-[#ebebeb] truncate">
                {userName || 'Spend Agent'}
              </h1>
              <p className="text-[11px] text-[#787774] dark:text-[#9b9b9b] truncate">
                Control Financiero • IA
              </p>
            </div>
          </div>


          {/* Quick Capital Widget */}
          <div 
            onClick={() => setActiveTab('portfolio')}
            className="mt-3 p-2.5 rounded-md bg-white dark:bg-[#282828] border border-[#e8e7e4] dark:border-[#333333] shadow-xs cursor-pointer hover:border-neutral-400 transition-all"
          >
            <div className="flex items-center justify-between text-[11px] text-[#787774] dark:text-[#9b9b9b]">
              <span className="flex items-center gap-1 font-medium">
                <Wallet className="w-3 h-3 text-emerald-600" /> Capital Global
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Neto</span>
            </div>
            <div className="text-base font-bold text-[#37352f] dark:text-white mt-0.5 tracking-tight font-mono">
              {capitalGlobal != null ? `${capitalGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '...'}
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="px-2 py-3 space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#9b9a97] dark:text-[#6e6e6e]">
            Espacio de Trabajo
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#eae8e3] text-[#37352f] dark:bg-[#2c2c2c] dark:text-white font-semibold'
                    : 'text-[#5f5e5b] dark:text-[#b4b4b4] hover:bg-[#efeee9] dark:hover:bg-[#262626] hover:text-[#37352f] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#37352f] dark:text-white' : 'text-[#787774] dark:text-[#888888]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Direct Links / Context */}
        <div className="px-2 py-2">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#9b9a97] dark:text-[#6e6e6e]">
            Inversiones & Activos
          </div>
          <div 
            onClick={() => setActiveTab('portfolio')}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-[#5f5e5b] dark:text-[#b4b4b4] hover:bg-[#efeee9] dark:hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <span className="flex items-center space-x-2 truncate">
              <span className="text-indigo-600 font-bold">📈</span>
              <span className="truncate">Cartera & Fondos</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-600">En Vivo</span>
          </div>
        </div>
      </div>

      {/* Footer / Theme toggle & System info */}
      <div className="p-3 border-t border-[#ececeb] dark:border-[#2f2f2f] text-xs text-[#787774] dark:text-[#888888]">
        <div className="flex items-center justify-between">
          <span className="text-[11px]">DeepSeek Light • Activo</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-md hover:bg-[#efeee9] dark:hover:bg-[#2b2b2b] text-[#5f5e5b] dark:text-[#b4b4b4] transition-colors cursor-pointer"
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
