import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ChatView, { INITIAL_CHAT_MESSAGE } from './components/ChatView';
import ClarificationQueue from './components/ClarificationQueue';
import TransactionsView from './components/TransactionsView';
import CompanyExpensesView from './components/CompanyExpensesView';
import PortfolioView from './components/PortfolioView';
import ForecastView from './components/ForecastView';
import ImportView from './components/ImportView';
import LoansView from './components/LoansView';
import SettingsView from './components/SettingsView';
import GuideView from './components/GuideView';
import NewTransactionModal from './components/NewTransactionModal';
import FundContributionModal from './components/FundContributionModal';
import UndoToast from './components/UndoToast';
import OnboardingModal from './components/OnboardingModal';
import { supabase, authFetch } from './supabaseClient';

export default function App() {
  const [isOnboarding, setIsOnboarding] = useState(() => {
    return localStorage.getItem('spend_agent_onboarding_completed') !== 'true';
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const completed = localStorage.getItem('spend_agent_onboarding_completed');
    return completed === 'true' ? 'dashboard' : 'dashboard';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('bank_agent_theme') === 'dark';
  });

  const [userName, setUserName] = useState('Mi Espacio');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [clarifications, setClarifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [loading, setLoading] = useState(true);

  // Persistent Chat Messages (never lost across tab switches or reloads)
  const [chatMessages, setChatMessages] = useState(() => {
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

  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      try {
        localStorage.setItem('bank_agent_chat_history', JSON.stringify(chatMessages));
      } catch (e) {
        console.warn('Error saving chat history to localStorage:', e);
      }
    }
  }, [chatMessages]);

  const handleResetChat = () => {
    try {
      localStorage.removeItem('bank_agent_chat_history');
    } catch (e) {}
    setChatMessages([INITIAL_CHAT_MESSAGE]);
  };

  // Undo System for mass changes & recommendations
  const [undoToast, setUndoToast] = useState(null);

  // General settings state
  const [enableCompanyExpenses, setEnableCompanyExpenses] = useState(true);

  // Modals
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isFundContributionOpen, setIsFundContributionOpen] = useState(false);
  const [selectedFundForModal, setSelectedFundForModal] = useState(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bank_agent_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bank_agent_theme', 'light');
    }
  }, [darkMode]);

  // Allowed beta users
  const ALLOWED_BETA_EMAILS = ['diegotcach@gmail.com', 'carla.garcia.faya@gmail.com', 'hidesinoquizas@gmail.com'];

  // Listen to Supabase Auth state changes
  useEffect(() => {
    const checkEmailAccess = async (session) => {
      if (!session?.user) {
        setCurrentUser(null);
        setIsOnboarding(true);
        return false;
      }
      const email = session.user.email?.toLowerCase()?.trim();
      if (email && !ALLOWED_BETA_EMAILS.includes(email) && !email.endsWith('@avenue.wealth')) {
        alert(`Acceso restringido: Avenue Wealth está en fase beta privada. El correo '${email}' no tiene acceso autorizado.`);
        await supabase.auth.signOut();
        setCurrentUser(null);
        setIsOnboarding(true);
        return false;
      }
      return true;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const allowed = await checkEmailAccess(session);
      if (allowed && session?.user) {
        setCurrentUser(session.user);
        if (session.user.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name);
        }
        refreshAll();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null);
        setIsOnboarding(true);
        refreshAll();
      } else if (session?.user) {
        const allowed = await checkEmailAccess(session);
        if (allowed) {
          setCurrentUser(session.user);
          if (session.user.user_metadata?.full_name) {
            setUserName(session.user.user_metadata.full_name);
          }
          refreshAll();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial summary
  const fetchSummary = async (monthStr = selectedMonth) => {
    try {
      let url = '/api/summary';
      if (monthStr && monthStr !== 'all') {
        const parts = monthStr.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          url = `/api/summary?year=${y}&month=${m}`;
        }
      }
      const res = await authFetch(url);
      const data = await res.json();
      setSummary(data);
      if (data?.available_months?.length > 0 && monthStr !== 'all' && !data.available_months.includes(monthStr)) {
        setSelectedMonth(data.available_months[0]);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  // Fetch transactions for selected month
  const fetchTransactions = async (monthStr = selectedMonth) => {
    try {
      const url = (!monthStr || monthStr === 'all')
        ? '/api/transactions?limit=1000'
        : `/api/transactions?month=${monthStr}&limit=500`;
      const res = await authFetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  // Fetch agent doubts
  const fetchClarifications = async () => {
    try {
      const res = await authFetch('/api/clarifications');
      const data = await res.json();
      setClarifications(data.pending_doubts || []);
      if (data.available_categories && data.available_categories.length > 0) {
        setCategories(data.available_categories);
      }
    } catch (err) {
      console.error('Error fetching clarifications:', err);
    }
  };

  // Fetch dynamic categories
  const fetchCategories = async () => {
    try {
      const res = await authFetch('/api/categories');
      const data = await res.json();
      if (data && data.categories) {
        setCategories(data.categories.map(c => typeof c === 'string' ? c : c.name));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch general user settings (user name, company, etc.)
  const fetchGeneralSettings = async () => {
    try {
      const res = await authFetch('/api/settings/general');
      const data = await res.json();
      if (data) {
        if (data.user_name) {
          setUserName(data.user_name);
        }
        if (data.enable_company_expenses !== undefined) {
          const compExp = data.enable_company_expenses !== '0' && data.enable_company_expenses !== false;
          setEnableCompanyExpenses(compExp);
          if (!compExp && activeTab === 'company') {
            setActiveTab('dashboard');
          }
        }
        if (data.onboarding_completed) {
          localStorage.setItem('spend_agent_onboarding_completed', 'true');
          setIsOnboarding(false);
        } else {
          const hasCompletedLocal = localStorage.getItem('spend_agent_onboarding_completed') === 'true';
          if (!hasCompletedLocal) {
            setIsOnboarding(true);
          } else {
            setIsOnboarding(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching general settings:', err);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await authFetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true })
      });
    } catch (e) {
      console.warn('Error saving onboarding state:', e);
    }
    localStorage.setItem('spend_agent_onboarding_completed', 'true');
    setIsOnboarding(false);
    setActiveTab('dashboard');
    refreshAll();
  };

  const refreshAll = async (monthStr = selectedMonth) => {
    setLoading(true);
    await Promise.all([
      fetchSummary(monthStr),
      fetchTransactions(monthStr),
      fetchClarifications(),
      fetchCategories(),
      fetchGeneralSettings()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll(selectedMonth);
  }, [selectedMonth]);

  // Handlers
  const handleTriggerUndoToast = (toastData) => {
    setUndoToast(toastData);
  };

  const handleExecuteUndo = async () => {
    if (!undoToast) return;
    try {
      await authFetch('/api/transactions/batch-undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: undoToast.actionType || 'update',
          previous_states: undoToast.previousStates || null,
          deleted_transactions: undoToast.deletedTransactions || null,
          rule_pattern: undoToast.rulePattern || null
        })
      });
      setUndoToast(null);
      await refreshAll(selectedMonth);
    } catch (err) {
      console.error('Error executing batch undo:', err);
    }
  };

  const handleResolveClarification = async (payload) => {
    try {
      const res = await authFetch('/api/clarifications/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      await refreshAll();
      if (data && data.previous_state) {
        handleTriggerUndoToast({
          message: `Duda resuelta: "${payload.category}"`,
          count: 1,
          actionType: 'update',
          previousStates: [data.previous_state],
          rulePattern: payload.pattern
        });
      }
    } catch (err) {
      console.error('Error resolving clarification:', err);
    }
  };

  const handleCreateTransaction = async (txData) => {
    try {
      await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });
      await refreshAll();
    } catch (err) {
      console.error('Error creating transaction:', err);
    }
  };

  const handleUpdateTransaction = async (id, updateData) => {
    try {
      await authFetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      await refreshAll();
    } catch (err) {
      console.error('Error updating transaction:', err);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;
    try {
      await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handleSaveFundContribution = async (contribData) => {
    try {
      const isin = contribData.fund_isin || 'IE00BYX5P602';
      await authFetch(`/api/portfolio/funds/${encodeURIComponent(isin)}/contribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contribData)
      });
      await refreshAll();
    } catch (err) {
      console.error('Error saving fund contribution:', err);
    }
  };

  const capitalGlobal = summary?.portfolio?.capital_global;
  const companyPending = enableCompanyExpenses ? (summary?.portfolio?.pending_company_reimbursements || 0) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] transition-colors duration-150">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        doubtsCount={clarifications.length}
        capitalGlobal={capitalGlobal}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        companyPending={companyPending}
        userName={userName}
        enableCompanyExpenses={enableCompanyExpenses}
        currentUser={currentUser}
        onOpenOnboarding={() => setIsOnboarding(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            setActiveTab={setActiveTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            darkMode={darkMode}
            enableCompanyExpenses={enableCompanyExpenses}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            selectedMonth={selectedMonth}
            summary={summary}
            messages={chatMessages}
            setMessages={setChatMessages}
            onResetChat={handleResetChat}
          />
        )}

        {activeTab === 'clarifications' && (
          <ClarificationQueue
            clarifications={clarifications}
            categories={categories}
            onResolve={handleResolveClarification}
            onRefresh={refreshAll}
            loading={loading}
            onTriggerUndo={handleTriggerUndoToast}
            enableCompanyExpenses={enableCompanyExpenses}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onBatchUpdateSuccess={() => refreshAll(selectedMonth)}
            onOpenNewModal={() => setIsNewTxOpen(true)}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            availableMonths={summary?.available_months || [selectedMonth]}
            darkMode={darkMode}
            onTriggerUndo={handleTriggerUndoToast}
            enableCompanyExpenses={enableCompanyExpenses}
          />
        )}

        {activeTab === 'loans' && (
          <LoansView
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'company' && enableCompanyExpenses && (
          <CompanyExpensesView
            onRefreshSummary={() => fetchSummary()}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            portfolio={summary?.portfolio}
            summary={summary}
            darkMode={darkMode}
            onOpenContributionModal={(isin) => {
              setSelectedFundForModal(isin || null);
              setIsFundContributionOpen(true);
            }}
            onOpenMsciModal={() => setIsFundContributionOpen(true)}
            onRefreshPortfolio={() => fetchSummary()}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastView
            forecast={summary?.forecast}
            onRefresh={() => refreshAll(selectedMonth)}
            enableCompanyExpenses={enableCompanyExpenses}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'import' && (
          <ImportView
            onUploadComplete={(detectedMonth) => {
              if (detectedMonth) setSelectedMonth(detectedMonth);
              refreshAll(detectedMonth || selectedMonth);
            }}
            setActiveTab={setActiveTab}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onCategoriesUpdated={() => {
              fetchCategories();
              fetchSummary();
            }}
            onSettingsUpdated={(newSettings) => {
              if (newSettings?.user_name) {
                setUserName(newSettings.user_name);
              }
              if (newSettings?.enable_company_expenses !== undefined) {
                const compExp = newSettings.enable_company_expenses !== '0' && newSettings.enable_company_expenses !== false;
                setEnableCompanyExpenses(compExp);
                if (!compExp && activeTab === 'company') {
                  setActiveTab('dashboard');
                }
              }
              refreshAll();
            }}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'guide' && (
          <GuideView
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Windows 11 Out-of-Box Experience Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboarding || !currentUser}
        onComplete={() => {
          setIsOnboarding(false);
          setActiveTab('dashboard');
          refreshAll();
        }}
        currentUser={currentUser}
        onUserUpdate={(u) => {
          if (u?.name) setUserName(u.name);
        }}
      />

      {/* Modals & Floating Toasts */}
      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        onSave={handleCreateTransaction}
        categories={categories}
        enableCompanyExpenses={enableCompanyExpenses}
      />

      <FundContributionModal
        isOpen={isFundContributionOpen}
        onClose={() => {
          setIsFundContributionOpen(false);
          setSelectedFundForModal(null);
        }}
        onSave={handleSaveFundContribution}
        funds={summary?.portfolio?.funds || []}
        selectedFundIsin={selectedFundForModal}
        banksList={summary?.banks || []}
        accountsList={summary?.portfolio?.bank_accounts || []}
      />

      {/* Timed Undo Notification */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          count={undoToast.count}
          duration={10}
          onUndo={handleExecuteUndo}
          onClose={() => setUndoToast(null)}
        />
      )}
    </div>
  );
}
