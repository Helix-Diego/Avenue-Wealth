#!/usr/bin/env python3
"""
Test suite for Multi-Tenant Isolation, RBAC (Role-Based Access Control) & In-Memory Uploads
in Avenue Wealth.
"""
import sys
import os
import json
import base64
import unittest
import tempfile
import io

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

TEST_DB_FILE = tempfile.mktemp(suffix=".db", prefix="test_avenue_wealth_rbac_")
os.environ["AVENUE_WEALTH_DB_PATH"] = TEST_DB_FILE

from fastapi.testclient import TestClient
from backend.app import app
from backend.database import init_db, clean_all_transactions, upsert_user

def create_mock_jwt(user_id: str, email: str, role: str = "user") -> str:
    """Creates an unsigned/mock JWT payload for testing."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "user_metadata": {"full_name": f"User {role}", "role": role},
        "exp": 9999999999
    }
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig_b64 = base64.urlsafe_b64encode(b"mock_signature").decode().rstrip("=")
    return f"{h_b64}.{p_b64}.{sig_b64}"

class TestRBACAndMultiTenant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        clean_all_transactions()
        cls.client = TestClient(app)

        cls.user1_id = "11111111-1111-1111-1111-111111111111"
        cls.user1_token = create_mock_jwt(cls.user1_id, "user1@avenue.wealth", role="user")
        cls.user1_headers = {"Authorization": f"Bearer {cls.user1_token}"}

        cls.user2_id = "22222222-2222-2222-2222-222222222222"
        cls.user2_token = create_mock_jwt(cls.user2_id, "user2@avenue.wealth", role="user")
        cls.user2_headers = {"Authorization": f"Bearer {cls.user2_token}"}

        cls.admin_id = "99999999-9999-9999-9999-999999999999"
        cls.admin_token = create_mock_jwt(cls.admin_id, "admin@avenue.wealth", role="admin")
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def test_01_auth_me_profiles(self):
        """Verify /api/auth/me returns distinct identity and permissions."""
        res1 = self.client.get("/api/auth/me", headers=self.user1_headers)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1["id"], self.user1_id)
        self.assertEqual(data1["role"], "user")
        self.assertFalse(data1["is_admin"])

        res_admin = self.client.get("/api/auth/me", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        data_admin = res_admin.json()
        self.assertEqual(data_admin["id"], self.admin_id)
        self.assertEqual(data_admin["role"], "admin")
        self.assertTrue(data_admin["is_admin"])

    def test_02_tenant_data_isolation(self):
        """User 1 creates a transaction; User 2 cannot see it."""
        # User 1 creates transaction
        tx_payload = {
            "date": "2026-10-15",
            "account": "Santander Nómina",
            "description": "Nómina Privada Confidencial",
            "amount": 4500.0,
            "category": "Sueldo / Ingresos",
            "notes": "Datos estrictamente privados"
        }
        res_create = self.client.post("/api/transactions", json=tx_payload, headers=self.user1_headers)
        self.assertEqual(res_create.status_code, 200)
        tx1_id = res_create.json()["id"]

        # User 1 lists transactions -> should see 1 transaction
        res_list_u1 = self.client.get("/api/transactions", headers=self.user1_headers)
        self.assertEqual(res_list_u1.status_code, 200)
        self.assertEqual(len(res_list_u1.json()["transactions"]), 1)

        # User 2 lists transactions -> MUST NOT see User 1's transaction
        res_list_u2 = self.client.get("/api/transactions", headers=self.user2_headers)
        self.assertEqual(res_list_u2.status_code, 200)
        self.assertEqual(len(res_list_u2.json()["transactions"]), 0)

        # User 2 attempts to delete User 1's transaction (IDOR attack prevention)
        res_del_u2 = self.client.delete(f"/api/transactions/{tx1_id}", headers=self.user2_headers)
        # Even if 200 is returned, row should not be deleted for User 1
        res_list_u1_after = self.client.get("/api/transactions", headers=self.user1_headers)
        self.assertEqual(len(res_list_u1_after.json()["transactions"]), 1, "User 2 cannot delete User 1's transaction!")

    def test_03_rbac_admin_enforcement(self):
        """Regular user cannot access admin routes; admin can access and change roles."""
        # Regular user tries to access /api/admin/users -> 403 Forbidden
        res_forbidden = self.client.get("/api/admin/users", headers=self.user1_headers)
        self.assertEqual(res_forbidden.status_code, 403)

        # Admin accesses /api/admin/users -> 200 OK
        res_admin = self.client.get("/api/admin/users", headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        self.assertIn("users", res_admin.json())

        # Admin accesses /api/admin/system-stats -> 200 OK
        res_stats = self.client.get("/api/admin/system-stats", headers=self.admin_headers)
        self.assertEqual(res_stats.status_code, 200)
        self.assertIn("total_users", res_stats.json())
        self.assertIn("total_transactions", res_stats.json())

        # Admin changes User 2 role to 'advisor'
        res_promote = self.client.put(
            f"/api/admin/users/{self.user2_id}/role",
            json={"role": "advisor"},
            headers=self.admin_headers
        )
        self.assertEqual(res_promote.status_code, 200)
        self.assertEqual(res_promote.json()["role"], "advisor")

    def test_04_in_memory_upload(self):
        """In-memory RAM upload with multi-tenant scoping and zero-disk guarantee."""
        csv_data = """FECHA;CONCEPTO;IMPORTE;SALDO
10/10/2026;MERCADONA COMPRA SEMANAL;-85,40;1250,00
11/10/2026;REPSOL GASOLINA;-60,00;1190,00
"""
        file_bytes = io.BytesIO(csv_data.encode("utf-8"))
        res_upload = self.client.post(
            "/api/upload",
            files={"file": ("santander_extracto.csv", file_bytes, "text/csv")},
            data={"account": "Santander Principal"},
            headers=self.user2_headers
        )
        self.assertEqual(res_upload.status_code, 200)
        data = res_upload.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["imported"], 2)

        # User 2 sees 2 transactions
        res_u2_txs = self.client.get("/api/transactions", headers=self.user2_headers)
        self.assertEqual(len(res_u2_txs.json()["transactions"]), 2)

        # User 1 still sees only their 1 original transaction (strict tenant boundary)
        res_u1_txs = self.client.get("/api/transactions", headers=self.user1_headers)
        self.assertEqual(len(res_u1_txs.json()["transactions"]), 1)

    def test_05_guest_mode_isolation(self):
        """Guest 1 imports transactions; Guest 2 receives 0 transactions (strict guest boundary)."""
        guest1_id = "guest_11111111-2222-3333-4444-555555555555"
        guest2_id = "guest_99999999-8888-7777-6666-555555555555"

        csv_data = """FECHA;CONCEPTO;IMPORTE;SALDO
12/10/2026;CARREFOUR GUEST;-40,00;500,00
"""
        file_bytes = io.BytesIO(csv_data.encode("utf-8"))
        res_upload = self.client.post(
            "/api/upload",
            files={"file": ("extracto.csv", file_bytes, "text/csv")},
            data={"account": "Santander Guest"},
            headers={"X-Guest-ID": guest1_id}
        )
        self.assertEqual(res_upload.status_code, 200)

        # Guest 1 sees their 1 transaction
        res_g1 = self.client.get("/api/transactions", headers={"X-Guest-ID": guest1_id})
        self.assertEqual(len(res_g1.json()["transactions"]), 1)

        # Guest 2 receives 0 transactions
        res_g2 = self.client.get("/api/transactions", headers={"X-Guest-ID": guest2_id})
        self.assertEqual(len(res_g2.json()["transactions"]), 0)

        # Authenticated User 1 still sees only their original 1 transaction
        res_u1 = self.client.get("/api/transactions", headers=self.user1_headers)
        self.assertEqual(len(res_u1.json()["transactions"]), 1)

if __name__ == "__main__":
    unittest.main()
