import os
import sys
import unittest
from backend.sample_configs import SAMPLE_CONFIGS
from backend.vendor_detector import VendorDetectorEngine
from backend.normalizer import ConfigNormalizer
from backend.compliance_engine import ComplianceEngine
from backend.remediation_generator import RemediationGenerator
from backend.ai_trainer_vector import VectorStoreEngine
from backend.rbac_audit import rbac_audit_engine, Role

class TestVectorNetProblemStatement26155(unittest.TestCase):

    def setUp(self):
        self.cucme_raw = SAMPLE_CONFIGS["cisco_cucme"]["raw"]
        if os.path.exists("test_vector_db.json"):
            os.remove("test_vector_db.json")

    def tearDown(self):
        if os.path.exists("test_vector_db.json"):
            os.remove("test_vector_db.json")

    def test_1_vendor_detection(self):
        result = VendorDetectorEngine.detect_vendor(self.cucme_raw)
        self.assertIn("Cisco", result["vendor"])
        self.assertEqual(result["device_type"], "voip_gateway")
        self.assertGreaterEqual(result["confidence"], 0.70)
        self.assertEqual(result["detection_method"], "header_signature")

    def test_2_dynamic_normalization(self):
        sbm = ConfigNormalizer.parse_config(self.cucme_raw)
        
        # Metadata checks
        self.assertEqual(sbm.device_metadata.hostname, "CUCME")
        self.assertIn("Cisco", sbm.device_metadata.vendor)
        self.assertTrue(sbm.source_hash.startswith("sha256:"))
        
        # Authentication Security checks
        self.assertEqual(sbm.authentication_security.ssh_version, 2)
        self.assertTrue(sbm.authentication_security.telnet_enabled)
        self.assertEqual(sbm.authentication_security.exec_timeout_seconds, 0)
        self.assertIn("type_7", sbm.authentication_security.password_encryption_types)

        # OSCAL evidence spans checks
        self.assertIn("exec_timeout_seconds", sbm.evidence_spans)
        self.assertEqual(sbm.evidence_spans["exec_timeout_seconds"]["line_start"], 45)
        self.assertIn("password_encryption_types", sbm.evidence_spans)
        self.assertEqual(sbm.evidence_spans["password_encryption_types"]["line_start"], 12)

    def test_3_compliance_evaluation(self):
        sbm = ConfigNormalizer.parse_config(self.cucme_raw)
        report = ComplianceEngine.evaluate_compliance(sbm)

        findings_dict = {f.rule_id: f for f in report.findings}

        # Rule 1: NIST AC-12 Inactivity Logout (Failed with exact line evidence)
        self.assertIn("NIST-AC-12", findings_dict)
        self.assertEqual(findings_dict["NIST-AC-12"].status.value, "FAIL")
        self.assertEqual(findings_dict["NIST-AC-12"].line_start, 45)
        self.assertEqual(findings_dict["NIST-AC-12"].parser_confidence, "HIGH")

        # Rule 2: CIS 1.1.2 Secure Remote Access
        self.assertIn("CIS-1.1.2", findings_dict)
        self.assertEqual(findings_dict["CIS-1.1.2"].status.value, "FAIL")
        self.assertEqual(findings_dict["CIS-1.1.2"].line_start, 46)

        # Rule 3: DISA STIG IA-5 Password Security
        self.assertIn("DISA-IA-5", findings_dict)
        self.assertEqual(findings_dict["DISA-IA-5"].status.value, "FAIL")
        self.assertEqual(findings_dict["DISA-IA-5"].line_start, 12)

        # Rule 4: NIST-AC-2 Access Control List (Not observed -> UNKNOWN status)
        self.assertIn("NIST-AC-2", findings_dict)
        self.assertEqual(findings_dict["NIST-AC-2"].status.value, "UNKNOWN")
        self.assertIsNone(findings_dict["NIST-AC-2"].line_start)

    def test_4_remediation_generator(self):
        proposal = RemediationGenerator.generate_proposal("NIST-AC-12", "Cisco")
        self.assertEqual(proposal["proposal_status"], "proposal-only")
        self.assertIn("line vty 0 4", proposal["script"])
        self.assertIn("rollback", proposal)
        self.assertIn("verification_cmd", proposal)
        self.assertIn("show running-config", proposal["verification_cmd"])

    def test_5_ai_vector_training_loop(self):
        engine = VectorStoreEngine(storage_file="test_vector_db.json")
        match = engine.find_best_match("exec-timeout 0 0")
        self.assertTrue(match["match_found"])
        self.assertIn("authentication_security.exec_timeout_seconds", match["mapped_category"])

    def test_6_rbac_audit_logging(self):
        log_entry = rbac_audit_engine.log_action(
            user_id="usr-test-admin",
            user_role=Role.SUPER_ADMIN,
            action="CONFIG_UPLOAD",
            details={"benchmark": "Cisco CUCME"}
        )
        self.assertEqual(log_entry.user_id, "usr-test-admin")
        self.assertEqual(log_entry.action, "CONFIG_UPLOAD")

    def test_7_multi_vendor_auto_detection(self):
        # 1. Juniper
        juniper_res = VendorDetectorEngine.detect_vendor(SAMPLE_CONFIGS["juniper_junos"]["raw"])
        self.assertEqual(juniper_res["vendor"], "Juniper Networks")

        # 2. Palo Alto
        palo_res = VendorDetectorEngine.detect_vendor(SAMPLE_CONFIGS["palo_alto"]["raw"])
        self.assertEqual(palo_res["vendor"], "Palo Alto Networks")

        # 3. Fortinet
        forti_res = VendorDetectorEngine.detect_vendor(SAMPLE_CONFIGS["fortinet_fortios"]["raw"])
        self.assertEqual(forti_res["vendor"], "Fortinet")

        # 4. SONiC Whitebox
        sonic_res = VendorDetectorEngine.detect_vendor(SAMPLE_CONFIGS["sonic_whitebox"]["raw"])
        self.assertEqual(sonic_res["vendor"], "Sonic Foundation")

        # 5. AWS Cloud Security Group
        aws_res = VendorDetectorEngine.detect_vendor(SAMPLE_CONFIGS["aws_sg"]["raw"])
        self.assertEqual(aws_res["vendor"], "Amazon Web Services")

    def test_8_low_code_skill_hot_reload(self):
        engine = VectorStoreEngine(storage_file="test_vector_db.json")
        res = engine.train_rule_to_skill(
            vendor="Palo Alto Networks",
            cli_snippet="set deviceconfig system idle-timeout 10",
            target_sbm_key="authentication_security.exec_timeout_seconds",
            description="Automated unit test training loop verification"
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertTrue(res["reloaded"])

if __name__ == "__main__":
    unittest.main()
