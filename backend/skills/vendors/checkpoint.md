---
name: checkpoint-audit
description: Parse and audit Check Point firewall/threat-prevention logs (LEA, Log Exporter CEF/LEEF)
---

# Check Point Log Audit Skill

## How to recognize this format

**LEA (Log Export API / fw1-loggrabber / lea_loggrabber) format** —
`key=value` pairs, historically pipe or semicolon delimited depending on
exporter version:

```
loc=2302 filename=fw.log fileid=1506445139 time=26Sep2017 20:18:31 action=accept orig=10.10.10.254 orig_name=firewall i/f_dir=inbound ...
```
(Some LEA exporters use `|` between pairs instead of spaces — check the
delimiter before splitting.)

**Log Exporter — CEF format**:
```
CEF:0|Check Point|<product>|<version>|<event id>|<name>|<severity>|<extension key=value pairs>
```

**Log Exporter — LEEF format**:
```
LEEF:2.0|Check Point|Log Update|1.0|Check Point Log|<tab-separated key=value pairs>
```
Note: LEEF fields that already match Check Point's native names (`src`, `dst`)
are passed through unchanged; only non-matching fields get remapped.

## Key native fields

| Field | Meaning |
|---|---|
| `action` | `accept`, `drop`, `reject`, `prevent`, `detect` |
| `blade` / `product` | Which Software Blade generated the log: `firewall`, `Threat Emulation`, `IPS`, `Anti-Bot`, `Anti-Virus`, `Application Control`, `URL Filtering`, `DLP` |
| `src` / `dst` | Source/destination IP |
| `service` | Service/port matched |
| `rule` | Rule name or number that matched |
| `severity` | `low`, `medium`, `high`, `critical` (mainly on Threat Prevention blades) |
| `origin` | Name of the originating Security Gateway |
| `loguid` | Log Unification ID — Check Point logs get *updated* over time (e.g. a session log updated with byte counts at close); same `loguid` = same underlying event, don't double-count as separate incidents |
| `action_details` | Free-text description of detected malicious action (Threat Prevention blades), e.g. "Communicating with a Command and control server" |

## Severity mapping

| Check Point `severity` | -> Global tier |
|---|---|
| critical | Critical |
| high | High |
| medium | Medium |
| low | Low |
| (Firewall blade, no severity field, action=accept) | Low |
| (Firewall blade, action=drop/reject) | Medium/High depending on frequency (see heuristics) |

## High-value blades/fields to watch for

| Blade | What it means | Audit relevance |
|---|---|---|
| `Anti-Bot` | Detected outbound C2/bot communication | Treat any hit as Critical/High — this blade specifically flags compromised-host behavior |
| `Threat Emulation` | Sandboxed file detonation | Check `action_details` for verdict; "malicious" verdict = Critical even if `action=detect` only (means it got through) |
| `IPS` | Intrusion prevention signature match | Correlate `attack`/`Attack Info` fields for CVE-level detail (watch for concatenation parsing issues — see note below) |
| `DLP` | Data loss prevention match | Any hit warrants review regardless of stated severity — could indicate data exfil |
| `Application Control`/`URL Filtering` | Policy-based blocks | Cluster by `src` for policy-violation patterns, same as ACL denies elsewhere |

## Parsing notes and known pitfalls

- **loguid deduplication**: Check Point updates in-place logs (e.g. a
  connection log gets updated with final byte counts when the session
  closes). When exported to syslog/LEA, each update arrives as a *separate*
  log line sharing the same `loguid`. Always dedupe/correlate on `loguid`
  before counting "number of events" — otherwise you'll overcount.
- **IPS field concatenation bug**: some `lea_loggrabber` versions emit
  attack-related fields (`Attack Info`, `attack`, `Industry Reference`) with
  no delimiter between them, causing field values to bleed into each other
  during naive parsing (e.g. extracting `attack` might accidentally include
  trailing text from the next field). If IPS log fields look like they
  contain multiple field names concatenated together, flag this as a
  parsing/export-configuration issue rather than treating the garbled text
  as the actual attack description.
- **Delimiter varies by exporter**: raw LEA output has historically used
  inconsistent delimiters (`;` vs `|` vs plain space) across `fw1-loggrabber`
  vs `lea_loggrabber` vs modern Log Exporter — confirm delimiter from a
  sample line before assuming a fixed schema.
- **`product` vs `blade` naming**: Check Point documentation and UI use both
  "Software Blade" and "product" for the same concept depending on the
  console version — treat them as equivalent when matching audit rules.

## Audit heuristics specific to Check Point

- **Repeated `action=drop` from one `src` across multiple `rule` values**:
  a host repeatedly matching different deny rules suggests active scanning
  rather than a single misconfiguration — cluster and flag as High.
- **Any `Anti-Bot` or `Threat Emulation` hit with `action` other than
  `prevent`**: means the malicious content/communication was only detected,
  not blocked — always elevate one tier above what the raw severity implies.
- **Admin/audit blade config changes with no corresponding SmartConsole
  session-start log nearby**: possible unattended/API-driven change worth
  flagging as a hygiene gap, same principle as the PAN-OS CONFIG check.