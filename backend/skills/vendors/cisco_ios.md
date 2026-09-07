---
skill_id: vendor_cisco_ios
skill_name: Cisco Systems IOS / IOS-XE Syntax Parser & Remediation Engine
category: vendor
vendor: Cisco Systems
os_version: IOS / IOS-XE
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `version 15.`, `version 16.`, `building configuration...`, `ip cef`, `cucme`, `telephony-service`
- Line VTY Regex: `line vty \d+ \d+`
- Password Hash Regex: `password 7`, `enable secret 5`, `secret 4`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-12 & CIS-1.1.2
```cisco
line vty 0 4
 transport input ssh
 exec-timeout 10 0
exit
```

## DISA-IA-5
```cisco
no username b
username b privilege 15 secret 4 <NEW_STRONG_SECRET>
```


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'service password-encryption' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Learned syntax mapping for Cisco Systems


## Control Learned Rule: Authentication Security.Password Encryption Types
- Target Field: `authentication_security.password_encryption_types`
- Evaluation Logic: `'enable secret 5 $1$mER7$vX3Y80x1g0f7' in str(context.get('password_encryption_types', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Learned syntax mapping for Cisco Systems (IOS / IOS-XE)
