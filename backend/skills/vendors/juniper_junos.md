---
skill_id: juniper_junos_syslog_context
category: syslog_context
name: juniper-audit
description: Parse and audit Juniper SRX (Junos) structured-data syslog logs (RT_FLOW, RT_IDS, RT_IDP, RT_UTM, RT_AAMW, RT_SECINTEL)
---

# Juniper SRX (Junos) Log Audit Skill

## How to recognize this format

RFC 5424-style syslog with a Junos "structured-data" block in `[junos@... key="value" ...]` format, tagged by a process name and message tag:

```
<14>1 2023-08-02T06:20:55.496Z RT_FLOW - RT_FLOW_SESSION_CREATE [junos@2636.1.1.1.2.129 source-address="192.168.1.2" source-port="49158" destination-address="10.10.10.10" destination-port="80" connection-tag="0" service-name="junos-http" ...]
```

Older "brief" (non-structured) format looks like plain text instead:
```
RT_FLOW: RT_FLOW_SESSION_CREATE: session created 10.25.255.2/33355->10.10.5.5/80 0x0 junos-http 10.25.255.2/33355->192.168.2.5/80 0x0 N/A N/A destination rule ENT 6 ENT Internet ENT 9719 N/A(N/A) ge-0/0/0.0 HTTP UNKNOWN UNKNOWN
```
Structured-data format is strongly preferred for parsing reliability — if you
see the brief format, note that it's positional/space-delimited and more
fragile to parse (fields shift between session types).

**Requirement to be aware of**: the device must be configured with
`set system syslog host <ip> structured-data brief` and
`set security log mode event` for these logs to appear correctly — if the
data you're given looks like unstructured freeform text, flag that the source
device may not be configured for structured logging.

## Process/tag taxonomy (the key classification fields)

| Process | Tags | Category |
|---|---|---|
| `RT_FLOW` | `RT_FLOW_SESSION_CREATE`, `RT_FLOW_SESSION_CLOSE`, `RT_FLOW_SESSION_DENY`, `APPTRACK_SESSION_CREATE`, `APPTRACK_SESSION_CLOSE`, `APPTRACK_SESSION_VOL_UPDATE` | Session/flow lifecycle |
| `RT_IDS` (screen options) | `RT_SCREEN_TCP`, `RT_SCREEN_UDP`, `RT_SCREEN_ICMP`, `RT_SCREEN_IP`, `RT_SCREEN_TCP_DST_IP`, `RT_SCREEN_TCP_SRC_IP` | Screen/anti-DoS detections |
| `RT_UTM` | `WEBFILTER_URL_PERMITTED`, `WEBFILTER_URL_BLOCKED`, `AV_VIRUS_DETECTED_MT`, `CONTENT_FILTERING_BLOCKED_MT`, `ANTISPAM_SPAM_DETECTED_MT` | UTM engine actions |
| `RT_IDP` | `IDP_ATTACK_LOG_EVENT`, `IDP_APPDDOS_APP_STATE_EVENT` | IPS/IDP detections |
| `RT_AAMW` | `SRX_AAMW_ACTION_LOG`, `AAMW_MALWARE_EVENT_LOG`, `AAMW_HOST_INFECTED_EVENT_LOG`, `AAMW_ACTION_LOG` | Advanced anti-malware (Sky ATP) |
| `RT_SECINTEL` | `SECINTEL_ACTION_LOG` | Security Intelligence feed matches |

## Key structured-data fields (RT_FLOW)

| Field | Meaning |
|---|---|
| `source-address` / `source-port` | Client endpoint |
| `destination-address` / `destination-port` | Server endpoint |
| `nat-source-address` / `nat-destination-address` | Post-NAT addresses |
| `service-name` | Named/predicted application service |
| `application-risk` | Numeric app risk score |
| `bytes-from-client` / `bytes-from-server` | Byte counters — useful for exfil detection |
| `elapsed-time` | Session duration |
| `source-zone-name` / `destination-zone-name` | Security zone context |
| `policy-name` | Matched security policy |

## Severity mapping

Junos structured-data doesn't carry a single explicit severity field the way
ASA/PAN-OS do — severity is implicit in the syslog priority value (`<14>` in
the header — decode as `facility*8 + severity`, standard RFC 5424 PRI) AND
in the tag itself:

| Tag pattern | -> Global tier |
|---|---|
| `*_DENY`, `RT_SCREEN_*` (any screen hit) | High |
| `AAMW_MALWARE_EVENT_LOG`, `AAMW_HOST_INFECTED_EVENT_LOG` | Critical |
| `IDP_ATTACK_LOG_EVENT` | Critical/High (check IDP severity sub-field if present) |
| `SECINTEL_ACTION_LOG` with action=block/drop | High |
| `WEBFILTER_URL_BLOCKED`, `CONTENT_FILTERING_BLOCKED_MT`, `ANTISPAM_SPAM_DETECTED_MT` | Medium |
| `*_SESSION_CREATE`, `*_SESSION_CLOSE`, `WEBFILTER_URL_PERMITTED` | Low |
| `APPTRACK_SESSION_VOL_UPDATE` | Informational |

## High-value patterns to watch for

- **`RT_FLOW_SESSION_DENY` clustering**: same scan/spray heuristic as other
  vendors — group by `source-address` across a time window.
- **`RT_SCREEN_*` hits**: these fire from Junos's built-in anti-DoS "screen"
  options (SYN flood, ICMP flood, IP spoofing checks, etc.) — any occurrence
  is inherently notable since screens only trigger on already-suspicious
  traffic shapes; don't downgrade these to Low even if infrequent.
- **`AAMW_HOST_INFECTED_EVENT_LOG`**: this specifically means Juniper's cloud
  AV concluded a host is compromised, not just that a file was flagged —
  always Critical and should be the top item in any summary it appears in.
- **`nat-source-port` outside expected NAT pool range**: config drift or
  NAT pool exhaustion, flag as a hygiene issue.
- **Missing structured-data block (falls back to brief/plain text)**: flag
  as a device-configuration gap rather than attempting fragile positional
  parsing of the brief format for anything beyond basic src/dst extraction.

## Parsing notes

- The structured-data block is a space-separated `key="value"` list inside
  `[...]` brackets — values are always double-quoted, safe to parse with a
  simple key-value grammar once the bracket content is isolated.
- The `junos@<enterprise-oid>` token at the start of the bracket is the
  structured-data ID, not a field — skip it when extracting key=value pairs.
- Multiple structured-data blocks can theoretically appear per line in RFC
  5424, but Junos typically emits one per RT_* message.