import sys
import unittest
from backend.sample_configs import SAMPLE_CONFIGS
from backend.normalizer import ConfigNormalizer
from backend.skills_loader import skills_engine
from backend.firebase_config import firestore_store
from backend.task_router import TaskEngine

class TestAgenticWorkflowAndTasks(unittest.TestCase):

    def setUp(self):
        self.cucme_raw = SAMPLE_CONFIGS["cisco_cucme"]["raw"]
        self.sbm = ConfigNormalizer.parse_config(self.cucme_raw)

    def test_1_skills_loader_engine(self):
        self.assertGreater(len(skills_engine.skills), 0)
        findings = skills_engine.evaluate_model(self.sbm)
        self.assertGreater(len(findings), 0)
        
        # Check rule ID present
        rule_ids = [f.rule_id for f in findings]
        self.assertTrue(any("AC-12" in r or "1.1.2" in r or "IA-5" in r for r in rule_ids))

    def test_2_firestore_store(self):
        users = firestore_store.get_all_users()
        self.assertGreater(len(users), 0)
        
        tasks = firestore_store.get_tasks()
        self.assertGreater(len(tasks), 0)

        logs = firestore_store.get_audit_logs()
        self.assertGreater(len(logs), 0)

    def test_3_auto_task_creation(self):
        findings = skills_engine.evaluate_model(self.sbm)
        auto_tasks = TaskEngine.auto_create_tasks_from_audit(
            hostname=self.sbm.device_metadata.hostname,
            vendor=self.sbm.device_metadata.vendor,
            findings=findings
        )
        self.assertGreater(len(auto_tasks), 0)
        self.assertEqual(auto_tasks[0]["device_hostname"], "CUCME")

    def test_4_task_commenting_and_assignment(self):
        tasks = firestore_store.get_tasks()
        if tasks:
            t_id = tasks[0]["task_id"]
            updated_task = firestore_store.add_task_comment(
                task_id=t_id,
                author_uid="FIREBASE_UID_OPERATOR_03",
                author_name="Priyankar Padhy",
                text="Test automated comment log entry."
            )
            self.assertIsNotNone(updated_task)
            self.assertGreater(len(updated_task["comments"]), 0)

if __name__ == "__main__":
    unittest.main()
