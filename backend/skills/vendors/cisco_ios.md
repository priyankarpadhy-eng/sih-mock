---
name: cisco-audit
description: Parse and audit Cisco ASA / Firepower syslog messages (%ASA-level-msgid format)
---

# Cisco ASA / Firepower Log Audit Skill

## How to recognize this format

Lines contain the literal string `%ASA-` followed by a digit 0-7, a dash, and
a 6-digit message ID:

```
<timestamp> <device-id> : %ASA-<level>-<msgid>: <message text>
```

Example (real device output):
```
%ASA-4-411004: Interface GigabitEthernet0/6, changed state to administratively down
```

With full syslog envelope + EMBLEM prefix:
```
Feb 12 2023 13:22:47 tismtlinternetfw1 : %ASA-4-106023: Deny icmp src OUTSIDE:0.33.18.22 dst INSIDE:170.217.223.242 (type 11, code 0) by access-group "OUTSIDE_ACL" [0x0, 0x0]
```

## Field breakdown

| Field | Description |
|---|---|
| Timestamp | Device-local time, format varies (`Mon DD YYYY HH:MM:SS` common) |
| Device-ID | Configured hostname/identifier of the ASA (absent if EMBLEM format and device-id logging off) |
| `ASA` | Fixed facility literal |
| Level | 0–7 severity digit (see table below) |
| Msgid | 6-digit stable ID — this is the reliable field to match/group on, NOT the free-text message |
| Message text | Free-form, contains src/dst/interface/acl details as substituted variables |

## Severity levels (native ASA scale — map to global tiers)

| ASA Level | Name | Meaning | -> Global tier |
|---|---|---|---|
| 0 | emergencies | System unusable | Critical |
| 1 | alert | Immediate action needed | Critical |
| 2 | critical | Critical conditions | Critical |
| 3 | error | Error conditions | High |
| 4 | warning | Warning conditions | Medium/High (see msgid table) |
| 5 | notification | Normal but significant | Medium |
| 6 | informational | Informational only | Low |
| 7 | debugging | Debug only, should not be in production logs | Informational |

## High-value message IDs to specifically watch for

These are real, documented ASA syslog IDs worth pattern-matching on:

| Msgid | Level | Meaning | Audit relevance |
|---|---|---|---|
| 106023 | 4 | Deny by access-group (ACL deny) | Repeated denies from one source = scan/probe; sudden stop = rule change or source gave up |
| 106001 | 2 | Inbound TCP connection denied | Same as above, higher default severity |
| 113005 | 3 | AAA authentication rejected | Auth failure — check for bursts |
| 113004 | 6 | AAA user authenticated | Pair with 113005 to compute failure ratio per user/source |
| 302013/302014 | 6 | TCP connection built/teardown | Session lifecycle; use for beaconing interval analysis |
| 305011/305012 | 6 | NAT translation built/deleted | Cross-check NAT source ports against expected pool range |
| 411004/411003 | 4 | Interface administratively up/down | Unexpected interface flaps outside maintenance windows |
| 419002 | 4 | Duplicate TCP SYN, possible spoofing indicator | Flag for review |
| 500004 | 3 | Invalid transport field values | Malformed packet — possible fuzzing/exploit attempt |
| 710003 | 4/5 | ACL deny on management access | Management-plane probing — treat as higher priority than data-plane ACL denies |
| 722xxx range | 4/5 | AnyConnect/VPN session errors | Credential stuffing or client misconfig against VPN gateway |

Full canonical list: "Cisco Secure Firewall ASA Series Syslog Messages" guide,
organized by severity — msgid is stable across ASA software versions, message
text wording is not, so always group/dedupe on msgid + key fields, not on the
raw text string.

## Audit heuristics specific to ASA

- **106023/106001 clustering**: group denies by source IP within a rolling
  5-minute window. 10+ distinct destination ports from one source = port scan.
  10+ distinct source IPs to one destination port = distributed scan/spray.
- **113005 bursts**: 5+ failures for one username within 2 minutes = flag as
  High (brute force). Failures across many usernames from one source IP within
  a short window = flag as High (credential spray), regardless of per-user count.
- **Msgid gaps**: ASA syslog doesn't include sequence numbers by default, so
  gap detection must be done on receive-time continuity at the collector, not
  on the message content itself — note this as a limitation if asked to find gaps.
- **EMBLEM vs plain**: if `format` metadata (from a log pipeline) shows `LOG`
  instead of `EMBLEM`/`PARSED`, that line failed to parse — flag it as a
  parsing gap, don't guess at its meaning.