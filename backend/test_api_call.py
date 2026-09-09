import requests, time

with open('datasets/04_fortinet_fortios.conf', 'r', encoding='utf-8') as f:
    text = f.read()

print("Testing POST /api/evaluate...")
t0 = time.time()
res1 = requests.post('http://localhost:8000/api/evaluate', data={'raw_config': text})
d1 = res1.json()
print(f"Evaluate returned {res1.status_code} in {time.time()-t0:.2f}s:")
print(f"  Score: {d1.get('compliance_score')}%")
print(f"  Total Checks: {d1.get('total_checks')}")
print(f"  Passed: {d1.get('passed_checks')}")
print(f"  Failed: {d1.get('failed_checks')}")

print("\nTesting POST /api/query-ai...")
t1 = time.time()
res2 = requests.post('http://localhost:8000/api/query-ai', data={'raw_config': text, 'query': ''})
d2 = res2.json()
print(f"Query-AI returned {res2.status_code} in {time.time()-t1:.2f}s:")
print(f"  Score: {d2.get('compliance_score')}%")
print(f"  Total Checks: {d2.get('total_checks')}")
print(f"  Passed: {d2.get('passed_checks')}")
print(f"  Failed: {d2.get('failed_checks')}")
print(f"  Provider: {d2.get('provider')}")
print(f"  Status: {d2.get('ai_analysis_status')}")
print(f"  Response Preview: {d2.get('response_text', '')[:200]}...")
