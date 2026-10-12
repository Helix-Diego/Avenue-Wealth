import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RefreshCw, 
  TrendingUp, 
  Briefcase, 
  DollarSign, 
  Copy, 
  Check, 
  Download, 
  PieChart, 
  CreditCard,
  ChevronRight,
  ShieldAlert,
  Plus
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { authFetch } from '../supabaseClient';

export const INITIAL_CHAT_MESSAGE = {
  role: 'assistant',
  content: `# ¡Hola! 👋 Soy tu Asistente de Inteligencia Financiera Personal
Tengo acceso en tiempo real a tus cuentas bancarias conectadas, fondos de inversión registrados y cartera de acciones con cotizaciones en vivo vía Finnhub.

### 🔍 ¿En qué te puedo ayudar hoy?
- 📊 **Auditoría Semestral**: Diagnóstico de ingresos, gastos y evolución de tu tasa de ahorro (Abril - Septiembre 2026).
- 🔄 **Suscripciones y Gastos Fijos**: Detección de alquiler, gimnasio, cuotas y suscripciones digitales.
- 📈 **Simulación MSCI World**: Capacidad de aportación mensual y proyección de interés compuesto.
- 💼 **Gastos Reembolsables BMC**: Control de gastos de trabajo adelantados pendientes de liquidar.
- 🛒 **Análisis por Comercio**: Desglose exacto en supermercados (Alcampo, Mercadona), restaurantes, gasolina o viajes.

*Selecciona una de las sugerencias rápidas abajo o escribe cualquier duda.*`
};

export default function ChatView({ 
  selectedMonth, 
  summary,
  messages: externalMessages,
  setMessages: externalSetMessages,
  onResetChat
}) {
  const [internalMessages, setInternalMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('bank_agent_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading chat history from localStorage:', e);
    }
    return [INITIAL_CHAT_MESSAGE];
  });

  const messages = externalMessages || internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;

  useEffect(() => {
    if (messages && messages.length > 0) {
      try {
        localStorage.setItem('bank_agent_chat_history', JSON.stringify(messages));
      } catch (e) {
        console.warn('Error saving chat to localStorage:', e);
      }
    }
  }, [messages]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch live financial analytics profile for the top ribbon
  useEffect(() => {
    authFetch('/api/analytics/profile')
      .then(res => res.json())
      .then(data => setProfileData(data))
      .catch(err => console.error('Error fetching analytics profile:', err));
  }, []);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          selected_month: selectedMonth
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al conectar con DeepSeek');
      }

      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ Lo siento Diego, ha ocurrido un error al consultar con el agente: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const exportChatMarkdown = () => {
    const header = `# Informe de Inteligencia Financiera - Diego Hernández\nGenerado: ${new Date().toLocaleString('es-ES')}\n\n---\n\n`;
    const body = messages.map(m => {
      const author = m.role === 'user' ? '### 👤 Diego Hernández' : '### 🤖 Agente Financiero DeepSeek';
      return `${author}\n\n${m.content}\n\n---\n`;
    }).join('\n');

    const blob = new Blob([header + body], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `informe_financiero_diego_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewChat = () => {
    if (messages.length > 1) {
      if (!window.confirm('¿Deseas iniciar un nuevo chat? La conversación actual se reiniciará.')) {
        return;
      }
    }
    try {
      localStorage.removeItem('bank_agent_chat_history');
    } catch (e) {}

    if (onResetChat) {
      onResetChat();
    } else {
      setMessages([INITIAL_CHAT_MESSAGE]);
    }
  };

  const promptSuggestions = [
    {
      category: "Semestral",
      label: "📊 Análisis de los 6 meses y fugas",
      query: "¿Cuál es mi situación financiera global en los últimos 6 meses y qué fugas de dinero detectas?"
    },
    {
      category: "Fijos",
      label: "🔄 Suscripciones y gastos fijos",
      query: "¿Cuáles son mis gastos fijos y suscripciones recurrentes detectadas?"
    },
    {
      category: "Inversión",
      label: "📈 Simular aportación al MSCI World",
      query: "¿Cuánto me recomiendas aportar al fondo MSCI World este mes y cómo crecería mi patrimonio a 5 y 10 años?"
    },
    {
      category: "Empresa",
      label: "💼 Gastos BMC pendientes de cobro",
      query: "¿Qué gastos de trabajo tengo pendientes de recuperar de BMC Software y cuánto suman?"
    },
    {
      category: "Supermercados",
      label: "🛒 Gastos en Alcampo y Mercadona",
      query: "¿Cuánto he gastado en Alcampo y Mercadona en total durante estos meses?"
    },
    {
      category: "Comparativa",
      label: "⚖️ Comparar Agosto vs Septiembre",
      query: "Compara detalladamente mis gastos de agosto y septiembre por categoría e identifica las principales variaciones."
    }
  ];

  const capitalGlobal = profileData?.portfolio?.capital_global || 0;
  const liquidCash = profileData?.portfolio?.liquid_cash || 0;
  const msciValue = (profileData?.portfolio?.funds_summary?.total_value_eur ?? profileData?.portfolio?.fund?.total_value_eur) || 0;
  const pendingReimb = profileData?.reimbursements?.pending_total || 0;

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-4.5rem)] space-y-3">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800 gap-2 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base">
            💬
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Chat Financiero Inteligente</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-900/40">
                DeepSeek Light
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500">
              Análisis holístico semestral, suscripciones, inversiones y recomendaciones patrimoniales
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportChatMarkdown}
            className="text-xs px-2.5 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center space-x-1.5 transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-700"
            title="Descargar conversación en formato Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar .md</span>
          </button>

          <button
            onClick={handleNewChat}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/50 font-semibold shadow-2xs"
            title="Iniciar un nuevo chat (borra la conversación actual e inicia una nueva)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Chat</span>
          </button>
        </div>
      </div>

      {/* Financial Health Snapshot Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        <div className="p-2.5 rounded-lg bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Capital Global</span>
            <DollarSign className="w-3 h-3 text-neutral-400" />
          </div>
          <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono mt-0.5">
            {capitalGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Liquidez Bancos</span>
            <CreditCard className="w-3 h-3 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {liquidCash.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Fondo MSCI World</span>
            <TrendingUp className="w-3 h-3 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
            {msciValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-[#202020] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>BMC Reembolsos</span>
            <Briefcase className="w-3 h-3 text-sky-500" />
          </div>
          <div className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
            {pendingReimb.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1.5">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start space-x-3 text-xs leading-relaxed ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-xs mt-0.5">
                  🤖
                </div>
              )}

              <div
                className={`relative group max-w-3xl px-4 py-3 rounded-xl shadow-xs transition-all ${
                  isUser
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-br-xs font-medium'
                    : 'bg-white dark:bg-[#202020] border border-[#e5e5e3] dark:border-[#353535] text-neutral-800 dark:text-neutral-200 rounded-bl-xs w-full'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div>
                    <MarkdownRenderer content={msg.content} />
                    <button
                      onClick={() => copyToClipboard(msg.content, index)}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-opacity cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-600"
                      title="Copiar respuesta"
                    >
                      {copiedIdx === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-[11px] shadow-xs mt-0.5">
                  DH
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3 text-xs text-neutral-500 pl-1">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
              🤖
            </div>
            <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-[#e5e5e3] dark:border-[#353535] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-[11px] text-neutral-500 font-medium">
                DeepSeek analizando base de datos, transacciones y simulando recomendaciones...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1 flex-shrink-0 no-scrollbar">
        <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Sugerencias:</span>
        </span>
        {promptSuggestions.map((s, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleSend(s.query)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700 whitespace-nowrap flex-shrink-0 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-600"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <div className="relative flex-shrink-0">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre tus gastos personales, suscripciones, fondo MSCI o simulaciones... (Enter para enviar)"
          className="w-full pl-3.5 pr-12 py-2.5 text-xs bg-white dark:bg-[#202020] border border-[#d6d6d4] dark:border-[#3d3d3d] rounded-xl outline-none text-neutral-800 dark:text-neutral-200 focus:border-indigo-500 dark:focus:border-indigo-400 resize-none shadow-xs transition-colors"
        />
        <button
          disabled={!input.trim() || loading}
          onClick={() => handleSend()}
          className="absolute right-3 top-3 p-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer transition-colors shadow-xs"
          title="Enviar consulta"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
