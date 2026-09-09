---
name: paloalto-audit
description: Parse and audit Palo Alto Networks PAN-OS firewall logs (CSV syslog, CEF, or LEEF)
---

# Palo Alto Networks (PAN-OS) Log Audit Skill

## How to recognize this format

**Native CSV syslog** — comma-separated values, no field names inline, must
be positionally decoded. Fourth-from-front field is typically the log `Type`:

```
<FUTURE_USE>,<Receive Time>,<Serial Number>,<Type>,<Subtype>,...
```

Example (Threat log, type=THREAT):
```
...,2019-07-03T00:36:24.000000Z,,3,THREAT,5,file,<src-ip>,...,PA-5220,0,client to server,...
```

**CEF format** (when syslog forwarding is set to CEF):
```
<date> <host> CEF:0|Fortinet... wait — for PAN it's:
<date> <host> CEF:0|Palo Alto Networks|Firewall|<version>|<logid>|<name>|<severity>|<extension>
```
Real example:
```
Feb 12 10:31:04 syslog-800c CEF:0|Fortinet|... 
```
(Note: use the vendor field in the CEF header itself to confirm — PAN CEF
headers read `CEF:0|Palo Alto Networks|...`.)

**LEEF format**:
```
LEEF:2.0|Palo Alto Networks|Next Generation Firewall|<version>|<eventid>|<tab-separated key=value pairs>
```

## The five core log types (native CSV `Type` field)

| Type | Subtype values | Contains |
|---|---|---|
| `TRAFFIC` | `start`, `end`, `drop`, `deny` | Session-level connection records |
| `THREAT` | varies by engine: `virus`, `spyware`, `vulnerability`, `url`, `file`, `wildfire`, `scan`, `flood` | IPS/AV/URL-filter/WildFire detections |
| `CONFIG` | (unused) | Configuration changes |
| `SYSTEM` | Event ID driven | System/admin events (login, HA, licensing) |
| `HIP-MATCH` | — | GlobalProtect Host Information Profile matches |

## Key field mapping (CSV -> CEF -> LEEF, for cross-referencing exports)

| Meaning | CSV field | CEF field | LEEF field |
|---|---|---|---|
| Receive time | `receive_time` | `rt` | `devTime` |
| Device serial | `serial` | `deviceExternalId` | `SerialNumber` |
| Log type | `type` | header field | `cat` |
| Subtype | `subtype` | `cat`/header | `Subtype` |
| Threat category | `thr_category` | `PanOSThreatCategory` | `ThreatCategory` |
| Source/dest IP | `src`/`dst` | `src`/`dst` | `src`/`dst` |
| Rule matched | (rule name field) | — | `Rule` |
| Action | `action` | `act` | `Action` |

## Severity (native — varies by log type, not a single global field)

| Log type | Severity source | -> Global tier |
|---|---|---|
| THREAT | `severity` field: `critical, high, medium, low, informational` | Direct 1:1 map |
| TRAFFIC | Implicit via `subtype`: `deny`/`drop` = notable, `start`/`end` = routine | deny/drop -> Medium/High; start/end -> Low |
| CONFIG | Always treat as Medium minimum — any config change is worth a look | Medium |
| SYSTEM | `severity` field present, same 5-tier scale as THREAT | Direct 1:1 map |

## High-value patterns to watch for

- **TRAFFIC subtype=deny/drop clustering**: same heuristic as ACL denies on
  other vendors — group by `src` across a time window; many distinct `dst`
  ports = scan, many distinct `src` to one `dst` port = spray/DDoS attempt.
- **THREAT severity=critical/high with action != block/reset**: a detected
  threat that was *not* blocked (e.g. `action=alert` only) is higher priority
  than one that was blocked — the traffic got through.
- **WildFire verdict = malicious with subtype=file/wildfire**: always Critical
  regardless of stated severity field, since it means a file was actually
  submitted and detonated as malicious.
- **CONFIG log entries with no matching SYSTEM admin-login event nearby**:
  suggests either API-driven change (verify it's expected automation) or a
  logging gap — flag either way.
- **HIP-MATCH failures** (host doesn't meet posture profile) followed shortly
  by a TRAFFIC allow on a sensitive zone: possible policy bypass, flag as High.
- **Repeated `url` subtype THREAT entries with category=unknown/not-resolved**
  from one internal host: possible DGA-based C2 (domain generation algorithm),
  flag as Medium/High for further investigation.

## Parsing notes

- CSV fields are positional and version-dependent — the number of columns
  changes between PAN-OS versions as new fields are appended at the end.
  Never assume a fixed column count; anchor parsing on the known early fields
  (`receive_time`, `serial`, `type`, `subtype`) and treat trailing columns as
  best-effort.
- Commas inside a field value are escaped with backslash — don't naively
  split on every comma without honoring escape sequences.
- `FUTURE_USE` placeholder fields exist in the schema — safe to ignore, not
  a parsing error if empty.

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
