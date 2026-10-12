-- ==============================================================================
-- AVENUE WEALTH — SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS) & RBAC
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- It provisions complete multi-tenant isolation, Role-Based Access Control (RBAC),
-- and strict database-level security policies.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS & RBAC ROLES TABLE
-- Synchronized automatically with Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT DEFAULT 'Usuario',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'advisor', 'auditor')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper functions for RBAC
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_advisor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'advisor') AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(NEW.raw_app_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    account TEXT NOT NULL,
    description TEXT NOT NULL,
    raw_description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    category TEXT NOT NULL,
    balance NUMERIC(12, 2),
    is_reimbursable INTEGER DEFAULT 0,
    reimbursement_status VARCHAR(20) DEFAULT 'none',
    needs_clarification INTEGER DEFAULT 0,
    clarification_question TEXT,
    suggested_category TEXT,
    confidence NUMERIC(3, 2) DEFAULT 1.0,
    notes TEXT,
    parent_id BIGINT,
    linked_tx_id BIGINT,
    loan_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON public.transactions(user_id, account);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for global/system categories
    name TEXT NOT NULL,
    color VARCHAR(20) DEFAULT '#64748B',
    icon VARCHAR(50) DEFAULT 'Tag',
    is_system SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_category UNIQUE (user_id, name)
);

-- 5. CATEGORY RULES TABLE
CREATE TABLE IF NOT EXISTS public.category_rules (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    category TEXT NOT NULL,
    is_reimbursable INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_rule_pattern UNIQUE (user_id, pattern)
);

-- 6. BANK ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type VARCHAR(20) DEFAULT 'checking',
    current_balance NUMERIC(12, 2) DEFAULT 0.0,
    initial_balance NUMERIC(12, 2) DEFAULT 0.0,
    currency VARCHAR(3) DEFAULT 'EUR',
    last_transaction_date DATE,
    last_imported_at TIMESTAMPTZ,
    is_credit_card SMALLINT DEFAULT 0,
    notes TEXT,
    CONSTRAINT unique_user_account UNIQUE (user_id, account_name)
);

-- 7. LOANS & FINANCING TABLE
CREATE TABLE IF NOT EXISTS public.loans (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity TEXT NOT NULL,
    contract_number TEXT,
    initial_principal NUMERIC(12, 2) NOT NULL,
    interest_rate_pct NUMERIC(5, 2) DEFAULT 6.5,
    monthly_installment NUMERIC(10, 2) DEFAULT 0.0,
    term_months INTEGER DEFAULT 48,
    start_date DATE,
    end_date DATE,
    match_pattern TEXT,
    account_name TEXT,
    notes TEXT,
    loan_type VARCHAR(30) DEFAULT 'loan_disbursement',
    financed_item TEXT,
    disbursement_tx_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PORTFOLIO & ASSETS
CREATE TABLE IF NOT EXISTS public.portfolio_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name TEXT DEFAULT '',
    shares NUMERIC(14, 4) NOT NULL,
    avg_price NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    current_price NUMERIC(12, 4) DEFAULT 0.0,
    price_change_24h NUMERIC(8, 4) DEFAULT 0.0,
    last_updated TIMESTAMPTZ,
    CONSTRAINT unique_user_stock_symbol UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS public.fund_contributions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_isin VARCHAR(20) DEFAULT 'IE00BYX5P602',
    funding_account TEXT,
    date DATE NOT NULL,
    shares NUMERIC(14, 4) NOT NULL,
    invested_amount NUMERIC(12, 2) NOT NULL,
    nav_price NUMERIC(12, 4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data can NEVER leak between users even if a backend endpoint misbehaves
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- 2. Transactions Policies
CREATE POLICY "Tenant isolation: transactions" 
    ON public.transactions FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 3. Categories Policies (View system categories OR user own categories)
CREATE POLICY "Tenant isolation: categories select" 
    ON public.categories FOR SELECT 
    USING (user_id IS NULL OR is_system = 1 OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Tenant isolation: categories modify" 
    ON public.categories FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 4. Category Rules Policies
CREATE POLICY "Tenant isolation: category_rules" 
    ON public.category_rules FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 5. Bank Accounts Policies
CREATE POLICY "Tenant isolation: bank_accounts" 
    ON public.bank_accounts FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 6. Loans Policies
CREATE POLICY "Tenant isolation: loans" 
    ON public.loans FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 7. Portfolio Stocks Policies
CREATE POLICY "Tenant isolation: portfolio_stocks" 
    ON public.portfolio_stocks FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 8. Fund Contributions Policies
CREATE POLICY "Tenant isolation: fund_contributions" 
    ON public.fund_contributions FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);

-- 9. User Settings Policies
CREATE POLICY "Tenant isolation: user_settings" 
    ON public.user_settings FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id);
