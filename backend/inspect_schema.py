import sys
sys.path.insert(0, '.')
from app.engines.normalizer import ConfigNormalizer
import json

n = ConfigNormalizer.normalize_to_universal_schema(
    'hostname R1\ntransport input telnet\nexec-timeout 0 0\npassword 7 abc\n'
)
print(json.dumps(n, indent=2)[:2000])
