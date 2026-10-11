import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Plus,
  Trash2,
  Building,
  Landmark,
  FileSpreadsheet,
  FileText,
  User,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Check,
  X,
  Shield,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Ámbar', hex: '#F59E0B' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Índigo', hex: '#6366F1' },
  { name: 'Púrpura', hex: '#8B5CF6' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Turquesa', hex: '#14B8A6' },
  { name: 'Cian', hex: '#06B6D4' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Lima', hex: '#84CC16' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Pizarra', hex: '#64748B' },
];

export default function SettingsView({ 
  onCategoriesUpdated, 
  onSettingsUpdated, 
  darkMode, 
  isOnboarding = false, 
  onCompleteOnboarding 
}) {
  const [activeSubTab, setActiveSubTab] = useState('ai'); // 'ai' | 'categories' | 'banks' | 'general'
  
  // AI Settings State
  const [aiConfig, setAiConfig] = useState({
    provider: 'deepseek',
    has_api_key: false,
    api_key_masked: '',
    model: 'deepseek-chat',
    enabled: true
  });
  const [inputApiKey, setInputApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null); // { success: bool, message: str, latency_ms?: int }

  // Categories State
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#64748B');
  const [categoryError, setCategoryError] = useState(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState(null);

  // Supported Banks State
  const [supportedBanks, setSupportedBanks] = useState([]);
  const [bankAliases, setBankAliases] = useState({});
  const [savingBankAliasId, setSavingBankAliasId] = useState(null);
  const [savedAliasBankId, setSavedAliasBankId] = useState(null);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    user_name: 'Mi Espacio',
    company_name: '',
    enable_company_expenses: true,
    currency: 'EUR'
  });
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSavedNotice, setGeneralSavedNotice] = useState(false);

  // Danger Zone Reset State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);

  // Load data on mount
  useEffect(() => {
    fetchAISettings();
    fetchCategories();
    fetchBanks();
    fetchGeneralSettings();
  }, []);

  const fetchAISettings = async () => {
    try {
      const res = await fetch('/api/settings/ai');
      const data = await res.json();
      setAiConfig(data);
      setSelectedModel(data.model || 'deepseek-chat');
      setAiEnabled(data.enabled ?? true);
    } catch (err) {
      console.error('Error fetching AI settings:', err);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await fetch('/api/settings/banks');
      const data = await res.json();
      const banks = data.banks || [];
      setSupportedBanks(banks);
      const aliases = {};
      banks.forEach(b => {
        aliases[b.id] = b.alias || '';
      });
      setBankAliases(aliases);
    } catch (err) {
      console.error('Error fetching banks:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchGeneralSettings = async () => {
    try {
      const res = await fetch('/api/settings/general');
      const data = await res.json();
      setGeneralSettings({
        user_name: data.user_name || 'Mi Espacio',
        company_name: data.company_name || '',
        enable_company_expenses: data.enable_company_expenses ?? true,
        currency: data.currency || 'EUR'
      });
    } catch (err) {
      console.error('Error fetching general settings:', err);
    }
  };

  // --- Handlers: AI ---
  const handleSaveAISettings = async () => {
    setAiSaving(true);
    setAiTestResult(null);
    try {
      const payload = {
        model: selectedModel,
        enabled: aiEnabled
      };
      if (inputApiKey.trim()) {
        payload.api_key = inputApiKey.trim();
      }
      const res = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setAiConfig({
        provider: 'deepseek',
        has_api_key: data.has_api_key,
        api_key_masked: data.api_key_masked,
        model: data.model,
        enabled: data.enabled
      });
      setInputApiKey('');
      setAiTestResult({ success: true, message: 'Configuración de DeepSeek guardada correctamente.' });
      setTimeout(() => setAiTestResult(null), 4000);
    } catch (err) {
      setAiTestResult({ success: false, message: 'Error al guardar configuración: ' + err.message });
    } finally {
      setAiSaving(false);
    }
  };

  const handleTestAIConnection = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const payload = {
        model: selectedModel
      };
      if (inputApiKey.trim()) {
        payload.api_key = inputApiKey.trim();
      }
      const res = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch (err) {
      setAiTestResult({ success: false, message: 'Error al conectar con DeepSeek: ' + err.message });
    } finally {
      setAiTesting(false);
    }
  };

  // --- Handlers: Categories ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          icon: 'Tag'
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al crear la categoría');
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
      await fetchCategories();
    } catch (err) {
      setCategoryError(err.message);
    }
  };

  const handleDeleteCategory = async (catName) => {
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catName)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error al eliminar la categoría');
      }
      setDeleteConfirmCat(null);
      await fetchCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Handlers: Supported Banks ---
  const handleToggleBank = async (bankId, currentEnabled) => {
    const nextState = !currentEnabled;
    // Optimistic UI update
    setSupportedBanks(prev => prev.map(b => b.id === bankId ? { ...b, enabled: nextState ? 1 : 0 } : b));
    try {
      await fetch(`/api/settings/banks/${bankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
    } catch (err) {
      console.error('Error toggling bank:', err);
      // Revert
      setSupportedBanks(prev => prev.map(b => b.id === bankId ? { ...b, enabled: currentEnabled ? 1 : 0 } : b));
    }
  };

  const handleUpdateBankAlias = async (bankId) => {
    setSavingBankAliasId(bankId);
    const aliasVal = (bankAliases[bankId] || '').trim();
    try {
      const res = await fetch(`/api/settings/banks/${bankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: aliasVal })
      });
      const data = await res.json();
      setSupportedBanks(prev => prev.map(b => b.id === bankId ? { ...b, alias: data.alias } : b));
      setSavedAliasBankId(bankId);
      setTimeout(() => setSavedAliasBankId(null), 2500);
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      console.error('Error updating bank alias:', err);
    } finally {
      setSavingBankAliasId(null);
    }
  };

  // --- Handlers: General Settings ---
  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setGeneralSaving(true);
    try {
      await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalSettings)
      });
      setGeneralSavedNotice(true);
      if (onSettingsUpdated) onSettingsUpdated(generalSettings);
      setTimeout(() => setGeneralSavedNotice(false), 3000);
    } catch (err) {
      alert('Error al guardar ajustes generales: ' + err.message);
    } finally {
      setGeneralSaving(false);
    }
  };

  // --- Handlers: Reset Data ---
  const handleExecuteResetData = async () => {
    setResettingData(true);
    try {
      const res = await fetch('/api/settings/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_settings: true })
      });
      const data = await res.json();
      setIsResetConfirmOpen(false);
      setResetSuccessMessage('Base de datos vaciada con éxito. Se han eliminado todas las transacciones, cuentas y créditos.');
      await fetchCategories();
      setTimeout(() => setResetSuccessMessage(null), 5000);
    } catch (err) {
      alert('Error al reiniciar los datos: ' + err.message);
    } finally {
      setResettingData(false);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">⚙️</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f0f0f0]">
              Ajustes & Configuración
            </h1>
            <p className="text-xs text-[#787774] dark:text-[#9c9c9c]">
              Personaliza los modelos de IA, bancos soportados para extractos y categorías de gasto para tu instalación local.
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Welcome Banner */}
      {isOnboarding && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <h2 className="text-base font-bold text-indigo-950 dark:text-indigo-200">
                  ¡Bienvenido a Spend Agent! Vamos a configurar tu espacio
                </h2>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                Esta es la primera vez que abres la aplicación. Configura aquí tu modelo de <strong>Inteligencia Artificial (DeepSeek)</strong>, comprueba qué <strong>bancos</strong> necesitas para tus extractos y revisa tus <strong>categorías</strong> de gasto. Podrás ajustar todo en cualquier momento.
              </p>
            </div>
            {onCompleteOnboarding && (
              <button
                type="button"
                onClick={onCompleteOnboarding}
                className="flex-shrink-0 px-4 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <span>Comenzar a usar Spend Agent</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 pt-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex-wrap">
            <span className="flex items-center gap-1">1️⃣ Añade tu API Key de DeepSeek</span>
            <span className="flex items-center gap-1">2️⃣ Comprueba tus bancos activos</span>
            <span className="flex items-center gap-1">3️⃣ Pulsa "Comenzar" para importar tus extractos</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#e5e5e3] dark:border-[#333] space-x-1">
        <button
          onClick={() => setActiveSubTab('ai')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'ai'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Modelo de IA (DeepSeek)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categorías ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('banks')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'banks'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Bancos Soportados</span>
        </button>

        <button
          onClick={() => setActiveSubTab('general')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Perfil & General</span>
        </button>
      </div>

      {/* Global Success / Reset Banner */}
      {resetSuccessMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* SUBTAB 1: AI MODEL (DEEPSEEK) */}
      {activeSubTab === 'ai' && (
        <div className="space-y-6">
          {/* Card: DeepSeek Connection */}
          <div className="p-6 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🐋
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                      DeepSeek AI
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      Proveedor Activo
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Utiliza la API oficial de DeepSeek para clasificar movimientos bancarios desconocidos y responder preguntas financieras complejas en el chat.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                {aiConfig.has_api_key ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clave Configurada</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sin Clave API</span>
                  </span>
                )}
              </div>
            </div>

            {/* AI Enable Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Habilitar Asistente y Categorización con IA
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Si se desactiva, el sistema solo usará reglas exactas y dejará las transacciones desconocidas para confirmación manual.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Clave de API de DeepSeek (API Key)</span>
                </label>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Obtener clave en platform.deepseek.com ↗
                </a>
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder={aiConfig.has_api_key ? `Guardada actualmente (${aiConfig.api_key_masked}) — Escribe para cambiar` : 'sk-...'}
                  className="w-full text-xs font-mono px-3 py-2.5 pr-20 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  title={showApiKey ? 'Ocultar' : 'Mostrar'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                Tu clave se almacena de forma segura exclusivamente en tu base de datos SQLite local en este ordenador.
              </p>
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                <span>Modelo a utilizar</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedModel('deepseek-chat')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedModel === 'deepseek-chat'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">deepseek-chat (V3)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Ultrarrápido, excelente comprensión de transacciones en español y coste ínfimo (~0,001€ / 100 clasificaciones).
                  </p>
                </div>

                <div
                  onClick={() => setSelectedModel('deepseek-reasoner')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedModel === 'deepseek-reasoner'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">deepseek-reasoner (R1)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      Razonamiento
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Modelo de cadena de pensamiento profunda. Ideal para auditorías financieras y proyecciones de ahorro complejas.
                  </p>
                </div>
              </div>
            </div>

            {/* Test Connection Banner */}
            {aiTestResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
                aiTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {aiTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{aiTestResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestAIConnection}
                disabled={aiTesting}
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Probando conexión...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Probar Conexión con DeepSeek</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveAISettings}
                disabled={aiSaving}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {aiSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Configuración IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Categorías de Transacciones
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Gestiona las categorías que utiliza el agente para clasificar tus gastos e ingresos. Puedes añadir nuevas o eliminar las que no uses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Categoría</span>
              </button>
            </div>

            {/* Add Category Form Modal / Inline */}
            {isAddingCategory && (
              <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-indigo-200 dark:border-indigo-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Añadir Nueva Categoría</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setIsAddingCategory(false); setCategoryError(null); }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {categoryError && (
                  <p className="text-xs text-rose-600 font-medium">{categoryError}</p>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre de la categoría:
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej. Mascotas & Veterinario, Cursos & Formación..."
                    className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Color de identificación:
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRESET_COLORS.map(col => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setNewCategoryColor(col.hex)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          newCategoryColor === col.hex ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      >
                        {newCategoryColor === col.hex && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                  >
                    Guardar Categoría
                  </button>
                </div>
              </form>
            )}

            {/* Search Input */}
            <div className="pt-1">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full text-xs px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-hidden"
              />
            </div>

            {/* Categories List */}
            {loadingCategories ? (
              <div className="py-8 flex justify-center items-center text-xs text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Cargando categorías...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id || cat.name}
                    className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-850 flex items-center justify-between group hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#64748B' }}
                      />
                      <div className="truncate">
                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate block">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {cat.tx_count || 0} movimientos
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmCat(cat.name)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Category Confirmation Dialog */}
          {deleteConfirmCat && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-[#252525] p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 max-w-sm w-full space-y-3 shadow-xl">
                <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>¿Eliminar categoría?</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  ¿Estás seguro de que deseas eliminar la categoría <strong>"{deleteConfirmCat}"</strong>? Las transacciones asociadas que existan se reasignarán a <em>"Otras compras"</em>.
                </p>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCat(null)}
                    className="px-3 py-1.5 rounded-md text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(deleteConfirmCat)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
                  >
                    Confirmar y Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SUPPORTED BANKS */}
      {activeSubTab === 'banks' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Bancos y Formatos Soportados
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Activa o desactiva los bancos con los que trabajas. Los parsers específicos manejan automáticamente formatos complejos como fechas de Excel, cargos sin signo o convención de extractos de tarjetas.
              </p>
            </div>

            {loadingBanks ? (
              <div className="py-8 flex justify-center items-center text-xs text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Cargando bancos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {supportedBanks.map((bank) => {
                  const isEnabled = Boolean(bank.enabled);
                  return (
                    <div
                      key={bank.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isEnabled
                          ? 'bg-neutral-50/60 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700'
                          : 'bg-neutral-100/50 dark:bg-neutral-900/40 border-neutral-200/50 dark:border-neutral-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            bank.id === 'santander' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                            bank.id === 'amex' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' :
                            bank.id === 'iberia_cards' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                            bank.id === 'n26' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400' :
                            bank.id === 'myinvestor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' :
                            'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}>
                            <Landmark className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                              {bank.name}
                            </h3>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {bank.file_formats}
                            </span>
                          </div>
                        </div>

                        {/* Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleBank(bank.id, isEnabled)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {bank.description}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                        <span>Estado:</span>
                        <span className={isEnabled ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-neutral-400'}>
                          {isEnabled ? 'Parser Activo' : 'Desactivado'}
                        </span>
                      </div>

                      {/* Bank Custom Alias */}
                      <div className="pt-2.5 border-t border-neutral-200/70 dark:border-neutral-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                            Alias en transacciones & filtros
                          </label>
                          {savedAliasBankId === bank.id && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Guardado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            placeholder={`Ej. ${bank.name} Nómina`}
                            value={bankAliases[bank.id] ?? (bank.alias || '')}
                            onChange={(e) => setBankAliases(prev => ({ ...prev, [bank.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateBankAlias(bank.id);
                              }
                            }}
                            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1e1e1e] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateBankAlias(bank.id)}
                            disabled={savingBankAliasId === bank.id}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                          >
                            {savingBankAliasId === bank.id ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: GENERAL & PROFILE */}
      {activeSubTab === 'general' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGeneralSettings} className="p-6 rounded-xl bg-white dark:bg-[#242424] border border-[#e5e5e3] dark:border-[#353535] shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Perfil del Espacio de Trabajo
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configura tu nombre de usuario, moneda y reglas de gastos de empresa reembolsables.
              </p>
            </div>

            {generalSavedNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Ajustes guardados correctamente.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Nombre o Alias de Usuario:
                </label>
                <input
                  type="text"
                  value={generalSettings.user_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, user_name: e.target.value })}
                  placeholder="Ej. Diego, Carlos, María..."
                  className="w-full text-xs px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden"
                />
                <p className="text-[10px] text-neutral-400">
                  El Asistente IA te llamará por este nombre en las recomendaciones y chat.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Moneda Principal:
                </label>
                <select
                  value={generalSettings.currency}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="USD">USD ($) — Dólar estadounidense</option>
                  <option value="GBP">GBP (£) — Libra esterlina</option>
                  <option value="MXN">MXN ($) — Peso mexicano</option>
                </select>
              </div>
            </div>

            {/* Corporate Expenses Module */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Módulo de Gastos de Empresa Reembolsables
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generalSettings.enable_company_expenses}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, enable_company_expenses: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-hidden rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Aísla los gastos de trabajo (gasolina, comidas con clientes, peajes o billetes) pagados de tu bolsillo para que no inflen tu coste de vida personal, computándolos como crédito pendiente de cobrar.
              </p>

              {generalSettings.enable_company_expenses && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre de tu empresa (opcional para auto-detección):
                  </label>
                  <input
                    type="text"
                    value={generalSettings.company_name}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, company_name: e.target.value })}
                    placeholder="Ej. Acme Corp, Google, Deloitte, Freelance..."
                    className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="submit"
                disabled={generalSaving}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {generalSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Preferencias</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Danger Zone: Reset Data */}
          <div className="p-6 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Zona de Peligro</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Si deseas reiniciar el libro de cuentas para un usuario nuevo, puedes vaciar todas las transacciones, balances de cuentas, préstamos y aportaciones. Tu configuración de categorías y clave de IA se conservarán.
            </p>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Transacciones y Datos</span>
            </button>
          </div>

          {/* Reset Confirmation Modal */}
          {isResetConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-[#252525] p-6 rounded-xl border border-rose-200 dark:border-rose-800 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center space-x-2.5 text-rose-600 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>¿Confirmar vaciado completo de datos?</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Esta acción eliminará de forma irreversible todas las transacciones bancarias, cuentas registradas, préstamos y posiciones de inversión de tu base de datos local.
                </p>
                <div className="flex justify-end space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(false)}
                    disabled={resettingData}
                    className="px-3.5 py-1.5 rounded-md text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteResetData}
                    disabled={resettingData}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {resettingData ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Vaciando datos...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Sí, Vaciar Todo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onboarding Sticky Bottom Action Bar */}
      {isOnboarding && onCompleteOnboarding && (
        <div className="sticky bottom-4 p-4 rounded-xl bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border border-indigo-300 dark:border-indigo-700 shadow-xl flex items-center justify-between z-20 transition-all">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>✨</span> ¿Listo con tu configuración inicial?
            </h4>
            <p className="text-[11px] text-neutral-500">
              Al hacer clic irás a tu espacio de trabajo y podrás empezar a importar tus extractos.
            </p>
          </div>
          <button
            type="button"
            onClick={onCompleteOnboarding}
            className="px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>Guardar y Comenzar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
