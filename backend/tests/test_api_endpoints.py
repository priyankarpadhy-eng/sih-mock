"""
Test VectorNet Modular FastAPI API Endpoints
============================================
Validates health check, audit evaluate, AI failover status, and PDF generation routes.
"""

import unittest
from fastapi.testclient import TestClient
from backend.main import app


class TestAPIEndpoints(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ONLINE")
        self.assertIn("VectorNet", data["service"])

    def test_sample_configs_endpoint(self):
        res = self.client.get("/api/sample-configs")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("cisco_cucme", data)

    def test_inventory_endpoint(self):
        res = self.client.get("/api/inventory")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_ai_config_endpoint(self):
        res = self.client.get("/api/v1/ai/config")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("available_free_models", data)

    def test_evaluate_audit_endpoint(self):
        res = self.client.post("/api/v1/audit/evaluate", data={})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("compliance_score", data)
        self.assertIn("findings", data)


if __name__ == "__main__":
    unittest.main()
