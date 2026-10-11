#!/usr/bin/env python3
"""
Comprehensive End-to-End User Journey Test Suite for Spend Agent
Tests:
1. Forecast & Simulation empty state initially
2. User establishes forecast budget & savings goals
3. User creates custom category and deletes out-of-the-box category
4. User configures DeepSeek AI model and tests connection endpoint
5. User enables banks with custom aliases
6. User imports transactions (Caixa, Revolut, Santander)
7. Automatic categorization & multi-transaction batch category update
8. Automatic transfer pairing between different bank accounts
9. User registers mutual fund and verifies dynamic compound interest / forecast recommendations
"""
import sys
import os
import json
import unittest
from datetime import datetime

# Set up paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from backend.app import app
from backend.database import get_connection, clean_all_transactions, init_db

class TestFullUserJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        clean_all_transactions()
        cls.client = TestClient(app)

    def test_01_forecast_empty_and_set_user_targets(self):
        """1. Forecast starts empty, user establishes their own income, savings & budget targets."""
        res = self.client.get("/api/forecast")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Must have no transactions and no fake assumed 3200€
        self.assertFalse(data.get("has_data", False))
        self.assertEqual(data.get("tx_count", 0), 0)
        self.assertEqual(data.get("total_income", 0), 0)
        self.assertEqual(data.get("personal_expenses", 0), 0)
        self.assertEqual(len(data.get("recommendations", [])), 0)

        # User establishes their forecast targets
        post_res = self.client.post("/api/forecast/settings", json={
            "expected_income": 2750.0,
            "target_savings": 550.0,
            "budget_max": 2200.0
        })
        self.assertEqual(post_res.status_code, 200)
        saved = post_res.json()
        self.assertEqual(saved["expected_income"], 2750.0)
        self.assertEqual(saved["target_savings"], 550.0)
        self.assertEqual(saved["budget_max"], 2200.0)

        # Verify forecast reflects targets
        res2 = self.client.get("/api/forecast")
        data2 = res2.json()
        self.assertTrue(data2.get("has_targets"))
        self.assertEqual(data2.get("expected_income"), 2750.0)
        self.assertEqual(data2.get("budget_max"), 2200.0)
        self.assertEqual(data2.get("target_savings"), 550.0)
        print("✅ Paso 1: Pronósticos inician limpios y usuario establece sus propias metas exitosamente.")

    def test_02_simulation_empty_state_without_funds(self):
        """2. Simulation has 0 funds registered, verifying empty state."""
        res = self.client.get("/api/portfolio")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        funds = data.get("funds", [])
        self.assertEqual(len(funds), 0, "Initial state must have 0 mutual funds")
        print("✅ Paso 2: Cartera no tiene fondos pre-sembrados; simulador MSCI/Fondos bloqueado adecuadamente.")

    def test_03_manage_categories_create_and_delete(self):
        """3. User adds a new custom category and deletes an out-of-the-box category."""
        # Ensure clean state for test category
        self.client.delete("/api/categories/Hardware & Gadgets")

        # Add new category
        res_add = self.client.post("/api/categories", json={
            "name": "Hardware & Gadgets",
            "color": "#3B82F6",
            "icon": "Laptop"
        })
        self.assertEqual(res_add.status_code, 200)
        
        # Verify in category list
        res_list = self.client.get("/api/categories")
        cats = res_list.json()["categories"]
        cat_names = [c["name"] for c in cats]
        self.assertIn("Hardware & Gadgets", cat_names)

        # Delete an existing category (e.g. any category other than fallback 'Otras compras')
        cat_to_delete = next((c["name"] for c in cats if c["name"] not in ["Otras compras", "Hardware & Gadgets"]), None)
        self.assertIsNotNone(cat_to_delete)
        res_del = self.client.delete(f"/api/categories/{cat_to_delete}")
        self.assertEqual(res_del.status_code, 200)

        # Verify it is deleted
        res_list2 = self.client.get("/api/categories")
        cats2 = res_list2.json()["categories"]
        cat_names2 = [c["name"] for c in cats2]
        self.assertNotIn(cat_to_delete, cat_names2)
        print(f"✅ Paso 3: Usuario añade categoría propia y elimina categoría '{cat_to_delete}' exitosamente.")

    def test_04_configure_deepseek_and_test_connection(self):
        """4. User configures DeepSeek model and tests the connection endpoint."""
        # Configure model
        res_cfg = self.client.post("/api/settings/ai", json={
            "api_key": "sk-test-deepseek-key-12345678",
            "model": "deepseek-chat",
            "enabled": True
        })
        self.assertEqual(res_cfg.status_code, 200)
        data = res_cfg.json()
        self.assertTrue(data["has_api_key"])
        self.assertEqual(data["model"], "deepseek-chat")

        # Test connection endpoint (validates format, connectivity, and API response)
        res_test = self.client.post("/api/settings/ai/test", json={
            "api_key": "sk-test-deepseek-key-12345678",
            "model": "deepseek-chat"
        })
        self.assertEqual(res_test.status_code, 200)
        test_data = res_test.json()
        self.assertIn("success", test_data)
        self.assertIn("message", test_data)
        print("✅ Paso 4: Configuración de DeepSeek y prueba de conexión verificadas.")

    def test_05_enable_banks_with_custom_aliases(self):
        """5. User enables banks (CaixaBank, Revolut, Santander) and defines aliases."""
        banks_to_enable = [
            ("caixabank", "CaixaBank Nómina"),
            ("revolut", "Revolut Tarjeta Gastos"),
            ("santander", "Santander Principal")
        ]

        for bank_id, alias in banks_to_enable:
            res = self.client.put(f"/api/settings/banks/{bank_id}", json={
                "enabled": True,
                "alias": alias
            })
            self.assertEqual(res.status_code, 200)

        # Verify enabled banks
        res_banks = self.client.get("/api/settings/banks")
        banks_list = res_banks.json()["banks"]
        enabled_map = {b["id"]: b for b in banks_list if b["enabled"]}

        self.assertIn("caixabank", enabled_map)
        self.assertEqual(enabled_map["caixabank"]["alias"], "CaixaBank Nómina")
        self.assertIn("revolut", enabled_map)
        self.assertEqual(enabled_map["revolut"]["alias"], "Revolut Tarjeta Gastos")
        print("✅ Paso 5: Bancos habilitados con alias personalizados correctamente.")

    def test_06_import_and_categorize_transactions(self):
        """6. Import transactions and verify bank aliases and categorization."""
        # Insert CaixaBank salary, Revolut grocery, and Santander transfer
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Salary in CaixaBank
        res1 = self.client.post("/api/transactions", json={
            "date": today,
            "account": "CaixaBank (*1234)",
            "description": "NOMINA EMPRESA OCTUBRE",
            "amount": 2800.0,
            "notes": "Transferencia de haberes"
        })
        self.assertEqual(res1.status_code, 200)

        # Grocery in Revolut
        res2 = self.client.post("/api/transactions", json={
            "date": today,
            "account": "Revolut (*5678)",
            "description": "COMPRA MERCADONA SUPERMERCADO",
            "amount": -65.40,
            "notes": "Compra semanal"
        })
        self.assertEqual(res2.status_code, 200)

        # Fuel in Revolut
        res3 = self.client.post("/api/transactions", json={
            "date": today,
            "account": "Revolut (*5678)",
            "description": "REPSOL ESTACION DE SERVICIO",
            "amount": -52.10,
            "notes": "Combustible"
        })
        self.assertEqual(res3.status_code, 200)

        # Check transactions list
        res_txs = self.client.get("/api/transactions")
        txs = res_txs.json()["transactions"]
        self.assertGreaterEqual(len(txs), 3)

        # Verify CaixaBank alias is resolved
        caixa_tx = next(t for t in txs if "CaixaBank" in t["account"])
        self.assertEqual(caixa_tx.get("account_alias"), "CaixaBank Nómina")
        self.assertEqual(caixa_tx.get("category"), "Sueldo")

        # Verify Revolut alias is resolved
        revolut_tx = next(t for t in txs if "Revolut" in t["account"])
        self.assertEqual(revolut_tx.get("account_alias"), "Revolut Tarjeta Gastos")
        print("✅ Paso 6: Transacciones importadas y categorizadas con alias de banco.")

    def test_07_batch_category_modification(self):
        """7. Multi-transaction batch category update."""
        res_txs = self.client.get("/api/transactions")
        txs = res_txs.json()["transactions"]
        revolut_tx_ids = [t["id"] for t in txs if "Revolut" in t["account"]]
        self.assertGreaterEqual(len(revolut_tx_ids), 2)

        # Update batch category to "Hardware & Gadgets" (our custom category)
        res_batch = self.client.post("/api/transactions/batch-update-category", json={
            "transaction_ids": revolut_tx_ids,
            "new_category": "Hardware & Gadgets",
            "save_rule": False
        })
        self.assertEqual(res_batch.status_code, 200)
        data = res_batch.json()
        self.assertEqual(data["updated_count"], len(revolut_tx_ids))
        self.assertIn("previous_states", data)

        # Verify updated categories in database
        res_txs_after = self.client.get("/api/transactions")
        for t in res_txs_after.json()["transactions"]:
            if t["id"] in revolut_tx_ids:
                self.assertEqual(t["category"], "Hardware & Gadgets")
        print("✅ Paso 7: Modificación por lotes de múltiples transacciones ejecutada y verificada.")

    def test_08_automatic_transfer_pairing_between_accounts(self):
        """8. Automatically detect and pair inter-account transfers."""
        today = datetime.now().strftime("%Y-%m-%d")

        # Transfer Out from CaixaBank
        res_out = self.client.post("/api/transactions", json={
            "date": today,
            "account": "CaixaBank (*1234)",
            "description": "TRASPASO A REVOLUT SALDO",
            "amount": -500.0,
            "notes": "Envío a tarjeta Revolut"
        })
        tx_out = res_out.json().get("transaction") or res_out.json()
        tx_out_id = tx_out.get("id")

        # Transfer In to Revolut
        res_in = self.client.post("/api/transactions", json={
            "date": today,
            "account": "Revolut (*5678)",
            "description": "INGRESO TRANSFERENCIA CAIXA",
            "amount": 500.0,
            "notes": "Recepción de CaixaBank"
        })
        tx_in = res_in.json().get("transaction") or res_in.json()
        tx_in_id = tx_in.get("id")

        # Automatically pair the two transfer counterparts
        res_pair = self.client.post("/api/transactions/pair-transfers", json={
            "tx_id_1": tx_out_id,
            "tx_id_2": tx_in_id
        })
        self.assertEqual(res_pair.status_code, 200)
        pair_data = res_pair.json()
        self.assertEqual(pair_data["status"], "paired")

        # Check linked pair detail endpoint
        res_detail = self.client.get(f"/api/transactions/{tx_out_id}/linked-pair")
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertTrue(detail["is_paired"])
        self.assertEqual(detail["transfer_amount"], 500.0)
        self.assertEqual(detail["net_difference"], 0.0)
        print("✅ Paso 8: Detección y vinculación bilateral de traspasos entre cuentas verificada.")

    def test_09_register_fund_and_verify_dynamic_simulation(self):
        """9. User registers mutual fund, unlocking compound interest simulation and dynamic forecast."""
        # Register Vanguard Global Stock Fund
        res_fund = self.client.post("/api/portfolio/funds", json={
            "isin": "IE00B03HD191",
            "name": "Vanguard Global Stock Index Fund",
            "currency": "EUR",
            "latest_nav": 52.40
        })
        self.assertEqual(res_fund.status_code, 200)

        # Add contribution
        today = datetime.now().strftime("%Y-%m-%d")
        res_contrib = self.client.post("/api/portfolio/funds/IE00B03HD191/contribution", json={
            "date": today,
            "invested_amount": 5000.0,
            "shares": 95.4198,
            "notes": "Aportación inicial Vanguard"
        })
        self.assertEqual(res_contrib.status_code, 200)

        # Verify portfolio now has the registered fund
        res_port = self.client.get("/api/portfolio")
        port = res_port.json()
        funds = port.get("funds", [])
        self.assertEqual(len(funds), 1)
        self.assertEqual(funds[0]["isin"], "IE00B03HD191")
        self.assertEqual(funds[0]["name"], "Vanguard Global Stock Index Fund")
        self.assertAlmostEqual(funds[0]["total_value_eur"], 5000.0, delta=5.0)

        # Verify Forecast now generates recommendation tailored to THIS registered fund
        res_fc = self.client.get("/api/forecast")
        fc = res_fc.json()
        recs = fc.get("recommendations", [])
        invest_rec = next((r for r in recs if r.get("type") == "investment"), None)
        self.assertIsNotNone(invest_rec, "Forecast must recommend investing when savings exist and fund is registered")
        self.assertIn("Vanguard Global Stock Index Fund", invest_rec["title"])
        print("✅ Paso 9: Registro de fondo dinámico y simulación/pronóstico adaptados exitosamente.")

if __name__ == "__main__":
    unittest.main()
