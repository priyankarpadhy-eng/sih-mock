import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app.engines.orchestrator import AuditOrchestrator

orchestrator = AuditOrchestrator()
datasets_dir = os.path.join(os.path.dirname(__file__), '..', 'datasets')

files = [sys.argv[1]] if len(sys.argv) > 1 else sorted(os.listdir(datasets_dir))

print(f"{'FILE':32} | {'VENDOR':14} | {'SCORE':7} | {'CHECKS (Tot/Pass/Fail/Warn)'}")
print("-" * 75)

for fname in files:
    fpath = os.path.join(datasets_dir, fname) if not os.path.isabs(fname) and not os.path.exists(fname) else fname
    if not os.path.isfile(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    res = orchestrator.run_normalized_audit(text)
    vendor = res.get('detected_vendor', 'Unknown')
    score = res.get('compliance_score', 0)
    total = res.get('total_checks', 0)
    passed = res.get('passed_checks', 0)
    failed = res.get('failed_checks', 0)
    warn = res.get('warning_checks', 0)
    basename = os.path.basename(fpath)
    print(f"{basename:32} | {vendor:14} | {score:5.1f}% | Tot:{total:2}  Pass:{passed:2}  Fail:{failed:2}  Warn:{warn:2}", flush=True)
