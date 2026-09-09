---
name: fortinet-audit
description: Parse and audit Fortinet FortiGate logs (native key=value syslog or CEF format)
---

# Fortinet FortiGate Log Audit Skill

## How to recognize this format

**Native format** — space-separated `key=value` pairs, always includes `date=`,
`time=`, `logid=`, `type=`, `subtype=`:

```
date=2018-12-27 time=11:07:55 logid="0000000013" type="traffic" subtype="forward" level="notice" ...
```

**CEF format** (when `config log syslogd setting; set format cef` is enabled)
— has a `CEF:` marker and Fortinet prefixes non-standard fields with `FTNTFGT`:

```
Dec 27 11:07:55 FGT-A-LOG CEF: 0|Fortinet|Fortigate|v6.0.3|00013|traffic:forward close|3|deviceExternalId=FGT5HD3915800610 FTNTFGTlogid=0000000013 cat=traffic:forward FTNTFGTsubtype=forward FTNTFGTlevel=notice src=10.120.152.189 spt=54320 dst=40.113.178.33 dpt=443
```

The CEF header format is: `CEF:0|Fortinet|Fortigate|<version>|<logid>|<type:subtype>|<severity>|<extension key=value pairs>`

## Key fields (native format)

| Field | Meaning |
|---|---|
| `logid` | Numeric ID classifying the log message cause (e.g. traffic, auth failure) — stable across versions, group on this |
| `type` | Top-level category: `traffic`, `event`, `utm`, `virus`, `webfilter`, etc. |
| `subtype` | Sub-category within type, e.g. `forward`, `local`, `multicast` under `traffic` |
| `level` | Native severity string: `emergency, alert, critical, error, warning, notice, information, debug` |
| `srcip`/`srcport`, `dstip`/`dstport` | Connection endpoints |
| `action` | What FortiGate did: `accept`, `deny`, `close`, `timeout`, `block` |
| `policyid`/`policyname` | Which firewall policy matched |
| `service` | Named service/app the traffic matched |
| `sentbyte`/`rcvdbyte` | Byte counts — useful for exfil/beaconing detection |

## CEF field mapping quirks (important for parsing)

- Fields not part of the standard CEF dictionary get an `FTNTFGT` prefix
  (e.g. `FTNTFGTlevel`, `FTNTFGTsubtype`, `FTNTFGTpolicyname`). Standard CEF
  fields keep their normal names (`src`, `dst`, `spt`, `dpt`, `act`).
  Known bug: in some FortiOS builds, `action` incorrectly maps to `act`
  when it should stay as a native-style field — if `act` values look garbled
  or missing, check for this known mapping issue (fixed in FortiOS 7.4.10 /
  7.6.5 / 8.0.0).
- The CEF `SignatureId` field = last 5 digits of the native `logid`.
- The CEF `Name` field is built from `type:subtype + [eventtype] + [action] + [status]`.
- `cat` in CEF = `type:subtype` from native format.

## Severity mapping (native `level` -> global tier)

| FortiGate level | -> Global tier |
|---|---|
| emergency, alert, critical | Critical |
| error | High |
| warning | Medium/High |
| notice | Medium |
| information | Low |
| debug | Informational |

## High-value type:subtype combinations to watch for

| type:subtype | Meaning | Audit relevance |
|---|---|---|
| `traffic:forward` with `action=deny` | Blocked traffic through policy | Cluster by srcip for scan detection, same as ACL denies on other vendors |
| `event:vpn` | VPN negotiation events | Look for repeated `negotiate` failures = brute force or misconfigured peer |
| `utm:webfilter` with `ftgd_blk` | Web filter category block | Repeated blocks to same category from one host = possible policy violation or malware callback |
| `utm:virus` | AV engine detection | Any occurrence should be Critical/High regardless of other fields |
| `event:system` | Admin login, config change, HA events | Check for admin logins outside business hours, config changes without change-ticket context |
| `traffic:local` | Traffic destined to the FortiGate itself | Management-plane access attempts — treat with higher priority than forwarded traffic |

## Audit heuristics specific to FortiGate

- **Policy ID drift**: if the same src/dst pair suddenly matches a different
  `policyid` than historically, a rule was likely reordered or changed —
  flag as a config-change indicator even without an explicit event log.
- **`ftgd_blk` repeated to same category**: 5+ blocks to the same webfilter
  category from one internal host in a short window suggests malware
  beaconing or a compromised host repeatedly trying a C2 domain category.
- **Byte-count symmetry**: near-identical `sentbyte`/`rcvdbyte` values at
  regular intervals from an internal host = classic beacon signature, flag
  as Medium/High even if `action=accept`.
- **FTNTFGT-prefixed fields present but expected standard CEF field missing**:
  indicates a parsing/mapping issue on the FortiGate's CEF output — note as
  a hygiene issue rather than silently dropping the field.