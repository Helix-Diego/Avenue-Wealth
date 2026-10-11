import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Upload, 
  CreditCard, 
  HelpCircle, 
  Briefcase, 
  TrendingUp, 
  Settings, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  FileSpreadsheet, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  ExternalLink, 
  Lightbulb,
  Zap,
  Target,
  Layers,
  Building
} from 'lucide-react';

export default function GuideView({ setActiveTab }) {
  const [activeSection, setActiveSection] = useState('getting_started');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      id: 'getting_started',
      title: '1. Primeros Pasos & Configuración',
      icon: Sparkles,
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800'
    },
    {
      id: 'banks_aliases',
      title: '2. Bancos Soportados & Alias',
      icon: Building,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'importing',
      title: '3. Importación (CSV, XLSX, XLS)',
      icon: Upload,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 'transactions',
      title: '4. Transacciones & Filtros',
      icon: CreditCard,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'doubts',
      title: '5. Cola de Dudas & Aprendizaje',
      icon: HelpCircle,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800'
    },
    {
      id: 'company',
      title: '6. Gastos Reembolsables (Empresa)',
      icon: Briefcase,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
    },
    {
      id: 'investments',
      title: '7. Acciones Finnhub & Fondos ISIN',
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
    },
    {
      id: 'goals',
      title: '8. Planificador & Objetivos',
      icon: Target,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    },
    {
      id: 'chat',
      title: '9. Chat con el Asistente IA',
      icon: MessageSquare,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📖</span>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
                Manual de Usuario • Spend Agent Local
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Guía Completa de la Aplicación
            </h1>
            <p className="text-xs text-neutral-300 max-w-xl">
              Aprende a configurar tus bancos con alias, importar extractos en cualquier formato, supervisar inversiones en tiempo real y aprovechar la inteligencia financiera.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Abrir Ajustes</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ir a Importar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {sections.map((s) => {
          const Icon = s.icon;
          const isSelected = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#202020] text-neutral-900 dark:text-white shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: PRIMEROS PASOS */}
        {/* ========================================================================= */}
        {activeSection === 'getting_started' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Primeros Pasos & Puesta en Marcha
                </h2>
                <p className="text-xs text-neutral-500">
                  Todo se ejecuta de forma 100% privada y local en tu propio ordenador
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Inicio Rápido</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Ejecuta <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono text-[11px]">./run.sh</code> o haz doble clic en <strong>Iniciar Spend Agent.command</strong>. Se abrirá automáticamente en tu navegador (<code className="text-[11px] font-mono">http://localhost:8000</code>).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Asistente de Bienvenida</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  La primera vez verás el asistente de onboarding para configurar tu nombre, moneda, empresa reembolsable y bancos habituales.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Conexión con IA</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  En Ajustes puedes conectar tu clave de <strong>DeepSeek</strong> (u otros modelos) para análisis financiero inteligente y categorización automática.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Privacidad Total:</span>
                <p>
                  Tus datos bancarios se almacenan en una base de datos local SQLite (<code className="font-mono">data/bank_agent.db</code>) en tu máquina. Ningún dato sensible viaja a servidores externos salvo las consultas de cotización de mercado (Finnhub y FT) o llamadas a tu modelo de IA si lo habilitas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: BANCOS & ALIAS */}
        {/* ========================================================================= */}
        {activeSection === 'banks_aliases' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Bancos Soportados & Alias Personalizados
                </h2>
                <p className="text-xs text-neutral-500">
                  Personaliza cómo llamas a tus cuentas y mantén tus filtros organizados
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Bancos Compatibles Nativamente:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {[
                  { name: 'Banco Santander', desc: 'Cuentas y Tarjetas', color: 'red' },
                  { name: 'CaixaBank', desc: 'Extractos con saldo y divisa', color: 'blue' },
                  { name: 'Revolut', desc: 'Multidivisa EUR/CHF/USD', color: 'teal' },
                  { name: 'ING Direct', desc: 'Extractos Excel y CSV', color: 'orange' },
                  { name: 'BBVA', desc: 'Cuentas y tarjetas', color: 'indigo' },
                  { name: 'Openbank', desc: 'Cuentas y ahorro', color: 'rose' },
                  { name: 'American Express', desc: 'Amex Platinum/Gold', color: 'blue' },
                  { name: 'Iberia Cards', desc: 'Tarjetas Iberia Icon', color: 'amber' },
                  { name: 'N26', desc: 'Cuentas móviles y viajes', color: 'teal' },
                  { name: 'MyInvestor', desc: 'Fondos e inversión', color: 'purple' },
                  { name: 'Formato Genérico', desc: 'Fecha, Concepto, Importe', color: 'gray' },
                ].map((b) => (
                  <div key={b.name} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-white block">{b.name}</span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">{b.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
              <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>¿Cómo funcionan los Alias de Banco?</span>
              </h4>
              <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                Si tienes por ejemplo <em>Banco Santander</em>, en la pestaña de <strong>Ajustes &gt; Bancos Soportados</strong> puedes escribir un alias como <strong>"Santander Nómina"</strong> o <strong>"Cuenta Conjunta"</strong> y pulsar en Guardar.
              </p>
              <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                Ese alias se reflejará automáticamente en:
              </p>
              <ul className="list-disc list-inside text-xs text-blue-900 dark:text-blue-300 space-y-1 pl-2">
                <li>Las pestañas superiores de filtro de transacciones.</li>
                <li>Las etiquetas de cuenta en cada movimiento.</li>
                <li>El selector de cuenta origen al hacer aportaciones a fondos de inversión.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: IMPORTACION CSV / XLSX / XLS */}
        {/* ========================================================================= */}
        {activeSection === 'importing' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Importación de Extractos Multi-Banco (CSV, XLSX, XLS)
                </h2>
                <p className="text-xs text-neutral-500">
                  Arrastra tus extractos descargados de tu banca online sin preocuparte por el formato
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Formatos Soportados
                </span>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">CSV, XLSX y XLS</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Soporta archivos Excel modernos (.xlsx), hojas de cálculo binarias clásicas (.xls), tablas HTML exportadas como .xls y archivos CSV con cualquier delimitador (; , o tabuladores).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Arrastrar Lotes
                </span>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Cola de Archivos</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Puedes seleccionar o soltar varios extractos a la vez. El sistema procesará cada uno de forma secuencial mostrando el progreso y estadísticas combinadas.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Anti-Duplicados
                </span>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Detección Inteligente</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Si vuelves a subir el extracto de un mes anterior o con días solapados, el motor descarta los movimientos ya existentes sin duplicar saldos.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Paso a paso para importar:
              </h4>
              <ol className="list-decimal list-inside text-xs text-neutral-600 dark:text-neutral-400 space-y-2 pl-2">
                <li>Ve a la pestaña <strong>Importar Extractos</strong> en la barra lateral.</li>
                <li>Deja la opción recomendada <strong>✨ Auto-detectar Banco</strong> (o selecciona tu banco manualmente si lo prefieres).</li>
                <li>Arrastra tus archivos descargados a la caja de subida.</li>
                <li>El agente procesará y categorizará tus gastos, avisándote si encuentra movimientos con dudas para revisar.</li>
              </ol>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: TRANSACCIONES & FILTROS */}
        {/* ========================================================================= */}
        {activeSection === 'transactions' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Transacciones, Filtros por Alias & Edición
                </h2>
                <p className="text-xs text-neutral-500">
                  Controla al detalle cada céntimo con herramientas de edición masiva y emparejamiento
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Filtros por Alias y Período</h4>
                <p>
                  En la parte superior de la tabla puedes cambiar de mes y hacer clic en las pestañas de cuenta (Santander Nómina, Revolut, CaixaBank...) para ver únicamente los gastos de esa cuenta específica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/20 space-y-1.5">
                  <span className="font-bold text-neutral-900 dark:text-white block">✂️ Dividir Gasto (Split)</span>
                  <p>
                    Si pagaste una compra en el supermercado que incluía productos de casa y cosas de trabajo, puedes hacer clic en el botón de división para separar el ticket en dos categorías independientes.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/20 space-y-1.5">
                  <span className="font-bold text-neutral-900 dark:text-white block">🔗 Emparejamiento de Traspasos</span>
                  <p>
                    Cuando transfieres dinero de ING a Revolut, el sistema identifica automáticamente el par (salida y entrada) para no computarlo erróneamente como gasto ni como ingreso ficticio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: COLA DE DUDAS */}
        {/* ========================================================================= */}
        {activeSection === 'doubts' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Cola de Dudas del Agente & Aprendizaje Continuo
                </h2>
                <p className="text-xs text-neutral-500">
                  Cómo resolver transacciones ambiguas y enseñar al agente tus preferencias
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              <p>
                A veces, un pago en una gasolinera (Repsol, Cepsa), un billete de tren o una comida de trabajo no es evidente si se trata de un gasto personal o de un desplazamiento profesional que tu empresa te va a reembolsar.
              </p>

              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 space-y-2 text-orange-900 dark:text-orange-200">
                <span className="font-bold block">Resolución en 1 solo clic:</span>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>💼 Es Gasto de Empresa</strong>: Se aísla automáticamente y se añade a tu saldo pendiente de cobrar a la empresa.</li>
                  <li><strong>👤 Es Gasto Personal</strong>: Se computa en tus gastos mensuales normales.</li>
                  <li><strong>Casilla "Recordar regla"</strong>: Al marcarla, el agente memoriza el comercio para categorizarlo solo la próxima vez.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 6: GASTOS REEMBOLSABLES */}
        {/* ========================================================================= */}
        {activeSection === 'company' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Control de Gastos Reembolsables de Empresa
                </h2>
                <p className="text-xs text-neutral-500">
                  Evita que los adelantos con tarjetas personales inflen tu coste de vida real
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              <p>
                Si viajas o compras material para tu empresa con tu tarjeta particular (Santander, Amex, Iberia Cards, etc.), ese dinero es deuda viva que la empresa te debe devolver.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[11px] text-neutral-500 block">Total Adelantado</span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white mt-1 block">Gastos aprobados</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[11px] text-neutral-500 block">Reembolsos Cobrados</span>
                  <span className="text-sm font-bold text-emerald-600 mt-1 block">Transferencias recibidas</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
                  <span className="text-[11px] text-neutral-500 block">Saldo Pendiente</span>
                  <span className="text-sm font-bold text-sky-600 mt-1 block">Lo que la empresa te debe</span>
                </div>
              </div>

              <p>
                Cuando recibas la transferencia de tu empresa liquidando los gastos, el sistema te sugerirá vincularla para saldar los movimientos pendientes con un clic.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 7: INVERSIONES, FINNHUB & FONDOS ISIN */}
        {/* ========================================================================= */}
        {activeSection === 'investments' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Cartera de Acciones (Finnhub) & Fondos de Inversión por ISIN
                </h2>
                <p className="text-xs text-neutral-500">
                  Cotizaciones en vivo de activos globales sin depender de hojas de cálculo
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📈</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Acciones en Vivo (Finnhub)</h4>
                </div>
                <p>
                  En la pestaña <strong>Portfolio & Capital</strong> puedes pulsar en <strong>+ Añadir Acción</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Escribe el nombre o ticker (ej. <em>Apple, AAPL, Tesla, Microsoft, SAN.MC</em>).</li>
                  <li>Selecciona el resultado para traer automáticamente su cotización en vivo.</li>
                  <li>Introduce el número de acciones y tu precio medio de compra para calcular tu P&L (ganancia/pérdida no realizada).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🌍</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Fondos por Código ISIN</h4>
                </div>
                <p>
                  Pulsa en <strong>+ Registrar Fondo (ISIN)</strong> para añadir cualquier fondo indexado o activo.
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Introduce su código ISIN (ej. <code className="font-mono">IE00BYX5P602</code>).</li>
                  <li>Pulsa en <strong>Consultar</strong> para obtener su nombre y NAV oficial actualizado en tiempo real.</li>
                  <li>Registra tus aportaciones periódicas seleccionando la cuenta de origen (con tus alias de banco).</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 8: PLANIFICADOR & OBJETIVOS */}
        {/* ========================================================================= */}
        {activeSection === 'goals' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Planificador de Objetivos & Hábitos de Ahorro
                </h2>
                <p className="text-xs text-neutral-500">
                  Simulación de metas patrimoniales basada en tus datos de gasto de los últimos 6 meses
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              <p>
                Dentro de <strong>Portfolio &gt; Planificador de Objetivos</strong> puedes simular qué pasaría si reduces un porcentaje de tus gastos en restaurantes, ocio o compras hormiga.
              </p>

              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2 text-rose-950 dark:text-rose-200">
                <h4 className="font-bold text-xs flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-rose-600" />
                  <span>Cálculo de Meses Ahorrados:</span>
                </h4>
                <p>
                  El planificador te indica con exactitud cuántos meses antes alcanzarás tu meta de capital si aplicas esos ajustes, mostrándote una gráfica proyectada del antes y el después.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 9: CHAT CON EL ASISTENTE IA */}
        {/* ========================================================================= */}
        {activeSection === 'chat' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Chat con tu Asistente Financiero
                </h2>
                <p className="text-xs text-neutral-500">
                  Hazle preguntas en lenguaje natural sobre tus cuentas, patrones de gasto y ahorro
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                Ejemplos de preguntas que puedes hacerle:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  '¿Cuánto he gastado este mes en supermercados y restaurantes?',
                  '¿Qué suscripciones o pagos recurrentes tengo activos?',
                  '¿Cuál es mi velocidad de gasto diaria comparada con el mes anterior?',
                  '¿Cuánto dinero tengo pendiente de cobrar de la empresa?',
                  '¿Cómo está distribuido mi patrimonio entre acciones, fondos y efectivo?',
                  'Dame 3 consejos para mejorar mi tasa de ahorro este mes.'
                ].map((prompt, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                    "{prompt}"
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
