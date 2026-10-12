import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  Landmark, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  CreditCard,
  Lock,
  Mail,
  Zap,
  Check,
  Building2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { supabase, authFetch } from '../supabaseClient';

const SUPPORTED_BANKS_DEFAULT = [
  { id: 'santander', name: 'Banco Santander', color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/40' },
  { id: 'bbva', name: 'BBVA', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/40' },
  { id: 'caixabank', name: 'CaixaBank', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-900/40' },
  { id: 'openbank', name: 'Openbank', color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/40' },
  { id: 'amex', name: 'American Express', color: 'bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-900/40' },
  { id: 'iberia_cards', name: 'Iberia Cards', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/40' },
  { id: 'n26', name: 'N26', color: 'bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-900/40' },
  { id: 'revolut', name: 'Revolut', color: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-900/40' },
  { id: 'myinvestor', name: 'MyInvestor', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900/40' },
  { id: 'ing', name: 'ING Direct', color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/40' },
  { id: 'generic', name: 'Formato Genérico CSV', color: 'bg-neutral-500/10 text-neutral-600 border-neutral-200 dark:border-neutral-700' }
];

export default function OnboardingModal({ 
  isOpen, 
  onComplete, 
  currentUser, 
  onUserUpdate 
}) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Auth State
  const [authMode, setAuthMode] = useState('google'); // 'google' | 'email' | 'guest'
  const [emailTab, setEmailTab] = useState('login'); // 'login' | 'register'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [sessionUser, setSessionUser] = useState(null);

  // Step 2: Regional & Identity
  const [name, setName] = useState('Mi Espacio');
  const [currency, setCurrency] = useState('EUR');
  const [language, setLanguage] = useState('es');

  // Step 3: Bank Selection
  const [selectedBanks, setSelectedBanks] = useState({
    santander: true,
    bbva: true,
    n26: false,
    revolut: false,
    amex: false,
    myinvestor: true,
    generic: true
  });
  const [bankAliases, setBankAliases] = useState({});

  // Step 4: Budget & Goals
  const [estimatedIncome, setEstimatedIncome] = useState(2500);
  const [targetSavingsPct, setTargetSavingsPct] = useState(20);
  const [enableCompanyExpenses, setEnableCompanyExpenses] = useState(true);

  // Step 5: AI & Finalizing state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishingMessageIndex, setFinishingMessageIndex] = useState(0);

  const finishingMessages = [
    'Preparando tu espacio financiero...',
    'Asegurando cifrado y aislamiento en memoria RAM...',
    'Sincronizando bancos e indicadores clave...',
    '¡Todo listo para comenzar!'
  ];

  // Listen to Supabase session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user);
        if (session.user.user_metadata?.full_name) {
          setName(session.user.user_metadata.full_name);
        } else if (session.user.email) {
          setName(session.user.email.split('@')[0]);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
        if (session.user.user_metadata?.full_name) {
          setName(session.user.user_metadata.full_name);
        }
      } else {
        setSessionUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Animation ticker for finishing step
  useEffect(() => {
    if (isFinishing) {
      const interval = setInterval(() => {
        setFinishingMessageIndex(prev => {
          if (prev < finishingMessages.length - 1) return prev + 1;
          return prev;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isFinishing]);

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message || 'Error al conectar con Google.');
      setAuthLoading(false);
    }
  };

  // Email / Password Handler
  const handleEmailAuth = async (isSignUp = false) => {
    setAuthError('');
    setAuthSuccess('');

    const ALLOWED_BETA_EMAILS = ['diegotcach@gmail.com', 'carla.garcia.faya@gmail.com', 'hidesinoquizas@gmail.com'];
    const cleanEmail = email.toLowerCase().trim();
    if (!ALLOWED_BETA_EMAILS.includes(cleanEmail) && !cleanEmail.endsWith('@avenue.wealth')) {
      setAuthError(`Acceso restringido: Avenue Wealth está en fase beta privada. El correo '${cleanEmail}' no tiene acceso autorizado.`);
      return;
    }

    if (isSignUp) {
      if (!firstName.trim()) {
        setAuthError('Por favor introduce tu nombre.');
        return;
      }
      if (!lastName.trim()) {
        setAuthError('Por favor introduce tus apellidos.');
        return;
      }
      if (!email || !password) {
        setAuthError('Por favor introduce email y contraseña.');
        return;
      }
      if (password.length < 6) {
        setAuthError('La contraseña debe tener al menos 6 caracteres por seguridad.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
      }
    } else {
      if (!email || !password) {
        setAuthError('Por favor introduce tu email y contraseña.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      if (isSignUp) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        setName(fullName);
        setAuthSuccess('¡Cuenta creada con éxito! Continuando con la configuración inicial...');
        if (data?.user) setSessionUser(data.user);
        setTimeout(() => {
          setStep(2);
        }, 500);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        setAuthSuccess('Sesión iniciada con éxito. Accediendo a tu espacio...');
        if (data?.user) setSessionUser(data.user);
        localStorage.setItem('spend_agent_onboarding_completed', 'true');
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 500);
      }
    } catch (err) {
      setAuthError(err.message || 'Error en la autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Toggle bank selection
  const handleToggleBank = (id) => {
    setSelectedBanks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Submit all settings to backend and finalize
  const handleFinalize = async () => {
    setIsFinishing(true);

    try {
      // 1. Save general settings
      await authFetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: name,
          currency: currency,
          language: language,
          enable_company_expenses: enableCompanyExpenses,
          onboarding_completed: true
        })
      });

      // 2. Save forecast settings
      const targetSavingsAmount = (estimatedIncome * (targetSavingsPct / 100));
      await authFetch('/api/forecast/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_income: estimatedIncome,
          target_savings: targetSavingsAmount,
          budget_max: estimatedIncome - targetSavingsAmount
        })
      });

      // 3. Save enabled banks
      for (const [bankId, enabled] of Object.entries(selectedBanks)) {
        await authFetch(`/api/settings/banks/${bankId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: enabled ? 1 : 0,
            alias: bankAliases[bankId] || null
          })
        });
      }

      // 4. Save AI configuration
      await authFetch('/api/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_enabled: aiEnabled,
          user_name: name
        })
      });

      // Complete
      localStorage.setItem('spend_agent_onboarding_completed', 'true');
      if (onUserUpdate) onUserUpdate({ name, currency });

      setTimeout(() => {
        setIsFinishing(false);
        if (onComplete) onComplete();
      }, 3200);

    } catch (err) {
      console.error('Error during onboarding save:', err);
      // Fallback completion even if offline
      localStorage.setItem('spend_agent_onboarding_completed', 'true');
      setTimeout(() => {
        setIsFinishing(false);
        if (onComplete) onComplete();
      }, 2500);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Windows 11 Fluent Ambient Backdrop */}
      <div className="absolute inset-0 bg-[#0f111a]/80 dark:bg-[#08090e]/90 backdrop-blur-2xl transition-all duration-700" />
      
      {/* Subtle Aurora Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Windows 11 Mica Acrylic Window */}
      <div className="relative w-full max-w-4xl h-[650px] max-h-[90vh] bg-white/95 dark:bg-[#1e1e24]/95 backdrop-blur-3xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Finishing Experience (Windows 11 OOBE End Screen) */}
        {isFinishing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            {/* Windows 11 Progress Ring Animation */}
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-indigo-400/20 border-b-indigo-500 animate-[spin_1.5s_linear_infinite_reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {finishingMessages[finishingMessageIndex]}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Por favor, espera mientras dejamos tu panel listo.
              </p>
            </div>

            <div className="flex items-center gap-1.5 pt-4">
              {finishingMessages.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx <= finishingMessageIndex 
                      ? 'w-6 bg-blue-600' 
                      : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Top Bar with Stepper */}
            <div className="px-8 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between select-none">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                  <img src="/logo.jpg" alt="Avenue Wealth" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-neutral-900 dark:text-white">Avenue Wealth</h1>
                  <p className="text-[11px] text-neutral-500">Configuración Inicial</p>
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => s < step && setStep(s)}
                    disabled={s > step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      s === step
                        ? 'w-7 bg-blue-600'
                        : s < step
                        ? 'w-2 bg-blue-400 dark:bg-blue-800 cursor-pointer'
                        : 'w-2 bg-neutral-200 dark:bg-neutral-800'
                    }`}
                    title={`Paso ${s}`}
                  />
                ))}
                <span className="text-xs font-medium text-neutral-400 ml-2">
                  {step} de {totalSteps}
                </span>
              </div>
            </div>

            {/* Step Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              
              {/* STEP 1: Iniciar Sesión o Registrarse (Auth) */}
              {step === 1 && (
                <div className="max-w-xl mx-auto space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center pb-1">
                      <img
                        src="/logo.jpg"
                        alt="Avenue Wealth"
                        className="h-16 w-16 rounded-2xl shadow-sm object-cover"
                      />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                      Bienvenido a Avenue Wealth
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                      Inicia sesión para entrar directamente a tu panel o crea tu cuenta para comenzar la configuración guiada.
                    </p>
                  </div>

                  {sessionUser ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                            {sessionUser.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sesión Activa
                            </div>
                            <div className="text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                              {sessionUser.email}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => supabase.auth.signOut()}
                          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline cursor-pointer"
                        >
                          Cerrar Sesión
                        </button>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('spend_agent_onboarding_completed', 'true');
                            if (onComplete) onComplete();
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Acceder a Mi Panel</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        >
                          Configurar perfil
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1">
                      {/* Google Sign In Button */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continuar con Google</span>
                      </button>

                      <div className="relative flex items-center justify-center my-3">
                        <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
                        <span className="bg-white/80 dark:bg-[#1e1e24] px-3 text-[11px] text-neutral-400 uppercase tracking-wider absolute">
                          o con correo electrónico
                        </span>
                      </div>

                      {/* Email Auth Mode Tabs */}
                      <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800/80 p-1 mb-2">
                        <button
                          type="button"
                          onClick={() => { setEmailTab('login'); setAuthError(''); }}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            emailTab === 'login'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          Iniciar Sesión
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEmailTab('register'); setAuthError(''); }}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            emailTab === 'register'
                              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          Crear Cuenta Nueva
                        </button>
                      </div>

                      {emailTab === 'login' ? (
                        /* Login Form */
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Correo Electrónico
                            </label>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Contraseña
                            </label>
                            <div className="relative">
                              <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>

                          {authError && (
                            <p className="text-xs text-rose-500 font-medium">{authError}</p>
                          )}
                          {authSuccess && (
                            <p className="text-xs text-emerald-500 font-medium">{authSuccess}</p>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEmailAuth(false)}
                            disabled={authLoading}
                            className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 shadow-md transition-all active:scale-[0.99] cursor-pointer"
                          >
                            {authLoading ? 'Iniciando sesión...' : 'Iniciar Sesión e Ir al Panel'}
                          </button>
                        </div>
                      ) : (
                        /* Registration Form */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Nombre
                              </label>
                              <div className="relative">
                                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="text"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  placeholder="Ej. Diego"
                                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Apellidos
                              </label>
                              <div className="relative">
                                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="text"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  placeholder="Ej. Hernández"
                                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Correo Electrónico
                            </label>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Contraseña
                              </label>
                              <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="password"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Mín. 6 caracteres"
                                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                Confirmar Contraseña
                              </label>
                              <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repite la contraseña"
                                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Security Notice */}
                          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Privacidad garantizada:</strong> Contraseña cifrada con <code>bcrypt</code> y aislamiento RLS multi-inquilino.
                            </span>
                          </div>

                          {authError && (
                            <p className="text-xs text-rose-500 font-medium">{authError}</p>
                          )}
                          {authSuccess && (
                            <p className="text-xs text-emerald-500 font-medium">{authSuccess}</p>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEmailAuth(true)}
                            disabled={authLoading}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all active:scale-[0.99] cursor-pointer"
                          >
                            {authLoading ? 'Creando cuenta...' : 'Crear Cuenta y Continuar'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Personalización Básica */}
              {step === 2 && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Globe className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                      Vamos a personalizar tu entorno
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Configura tu nombre de visualización, moneda principal e idioma.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        ¿Cómo te gustaría que te llamemos?
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Tu nombre o alias"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Moneda Principal de la Cuenta
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { code: 'EUR', label: 'Euro', symbol: '€' },
                          { code: 'USD', label: 'Dólar', symbol: '$' },
                          { code: 'GBP', label: 'Libra', symbol: '£' },
                          { code: 'CHF', label: 'Franco', symbol: 'CHF' },
                        ].map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => setCurrency(c.code)}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              currency === c.code
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <div className="text-base font-bold">{c.symbol}</div>
                            <div className="text-[11px] text-neutral-500">{c.code}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Idioma de la Aplicación
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { code: 'es', label: 'Español (España)', flag: '🇪🇸' },
                          { code: 'en', label: 'English (International)', flag: '🇬🇧' },
                        ].map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => setLanguage(lang.code)}
                            className={`p-3 rounded-xl border flex items-center space-x-3 transition-all cursor-pointer ${
                              language === lang.code
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="text-xs">{lang.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-sky-600" /> Gastos Reembolsables de Empresa
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          Módulo para adelantos con tarjeta corporativa y liquidación automática.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableCompanyExpenses}
                        onChange={(e) => setEnableCompanyExpenses(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Tus Entidades Bancarias */}
              {step === 3 && (
                <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                      Tus Entidades Financieras
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Selecciona los bancos y tarjetas que sueles utilizar para activar sus motores de importación.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto p-1">
                    {SUPPORTED_BANKS_DEFAULT.map((bank) => {
                      const isSelected = !!selectedBanks[bank.id];
                      return (
                        <div
                          key={bank.id}
                          onClick={() => handleToggleBank(bank.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white/40 dark:bg-neutral-900/30'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${bank.color}`}>
                              {bank.id.toUpperCase()}
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-neutral-300 dark:border-neutral-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                              {bank.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: Hábitos de Ahorro y Asistente IA */}
              {step === 4 && (
                <div className="max-w-xl mx-auto space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                      Hábitos Financieros y Asistente IA
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Define tus metas iniciales y elige el motor de inteligencia analítica para comenzar.
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Ingresos Mensuales Estimados
                        </label>
                        <span className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {estimatedIncome.toLocaleString('es-ES')} €
                        </span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="10000"
                        step="100"
                        value={estimatedIncome}
                        onChange={(e) => setEstimatedIncome(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Meta de Ahorro Mensual
                        </label>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {targetSavingsPct}% ({Math.round(estimatedIncome * (targetSavingsPct / 100)).toLocaleString('es-ES')} €)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={targetSavingsPct}
                        onChange={(e) => setTargetSavingsPct(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>Conservador (10%)</span>
                        <span>Equilibrado (20%)</span>
                        <span>Frugal (40%+)</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                        Motor de Inteligencia Artificial
                      </label>
                      <div 
                        onClick={() => setAiEnabled(true)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          aiEnabled
                            ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/40 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5 text-violet-600" /> Analista DeepSeek & Motor Predictivo
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Categorización inteligente, detección de transferencias internas y recomendaciones.
                            </p>
                          </div>
                          <input
                            type="radio"
                            name="ai_option"
                            checked={aiEnabled}
                            onChange={() => setAiEnabled(true)}
                            className="accent-violet-600 mt-1 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div 
                        onClick={() => setAiEnabled(false)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          !aiEnabled
                            ? 'border-neutral-800 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-800/60 shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-neutral-600" /> Modo Algorítmico Puro
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Opera únicamente con reglas deterministas sin llamadas a modelos externos.
                            </p>
                          </div>
                          <input
                            type="radio"
                            name="ai_option"
                            checked={!aiEnabled}
                            onChange={() => setAiEnabled(false)}
                            className="accent-neutral-600 mt-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Windows 11 Bottom Actions Bar */}
            <div className="px-8 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30 select-none">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center space-x-3">
                {step > 1 && step < totalSteps && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="flex items-center space-x-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {step === totalSteps && (
                  <button
                    type="button"
                    onClick={handleFinalize}
                    className="flex items-center space-x-2 px-7 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Comenzar a usar Avenue Wealth</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
