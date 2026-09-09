import sys
sys.path.insert(0, '.')

try:
    from app.engines.orchestrator import audit_orchestrator
    print("Orchestrator import: OK")
except Exception as e:
    print(f"Orchestrator import FAILED: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.services.skills_service import skills_engine
    loaded = skills_engine.get_all_skills()
    print(f"\nSkills loaded: {len(loaded)}")
    bm = [s for s in loaded if s["category"] == "benchmark"]
    vnd = [s for s in loaded if s["category"] == "vendor"]
    print(f"  Benchmark profiles: {len(bm)}")
    print(f"  Vendor profiles: {len(vnd)}")
    for s in loaded:
        print(f"  - [{s['category']:12}] {s['skill_id']}: {s['rule_count']} rules")
except Exception as e:
    print(f"Skills service FAILED: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.engines.task_classifier import classify_task
    t = classify_task("hostname router\ntransport input telnet\npassword 7 abc123", "audit ssh", "Cisco")
    print(f"\nTask classifier: OK — sensitivity={t.sensitivity}, type={t.task_type}, cloud={t.cloud_allowed}")
    print(f"  Secrets found: {t.secret_patterns_found}")
except Exception as e:
    print(f"Task classifier FAILED: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.engines.response_validator import validate_response
    r = validate_response("### 1. Executive Summary\nThis is a test.\n### 2. Findings\nSome finding here.", "hostname router")
    print(f"\nResponse validator: OK — passed={r.passed}, score={r.score:.2f}")
except Exception as e:
    print(f"Response validator FAILED: {e}")
    import traceback
    traceback.print_exc()

print("\nAll checks complete.")
