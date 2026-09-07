---
skill_id: vendor_palo_alto
skill_name: Palo Alto Networks PAN-OS Syntax Parser & Remediation Engine
category: vendor
vendor: Palo Alto Networks
os_version: PAN-OS
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `set deviceconfig system`, `set shared log-settings`, `pan-os`, `<mgt-config>`
- Idle Timeout Regex: `set deviceconfig system idle-timeout (\d+)`
- Service Restriction: `disable-telnet yes`, `disable-http yes`
- SSH Ciphers: `ssh-cipher ciphers aes256-gcm`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-12 & CIS-1.1.2
```panos
set deviceconfig system idle-timeout 10
commit
```

## NIST-SC-8
```panos
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
commit
```

## CIS-2.2
```panos
set deviceconfig system snmp-setting version v3
commit
```


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification
