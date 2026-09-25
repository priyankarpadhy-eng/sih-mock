# Enterprise Multi-Vendor Sample Network Configurations

This folder contains high-fidelity, production-grade network configuration files for the 4 primary network & security vendors: **Cisco**, **Juniper**, **Palo Alto Networks**, and **Fortinet**.

These files are designed to be ingested via the **Ingestion** page — individually for vendor-specific automated audits, or multi-selected simultaneously for heterogeneous multi-vendor fleet audits.

---

## Included Configuration Files

| Vendor | File Name | Device Model | OS / Firmware | Description | Key Audit Scenarios |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cisco Systems** | [`cisco_ios_router.cfg`](file:///c:/Users/priya/Documents/sih_mock/sample_configs/cisco_ios_router.cfg) | ISR 4451-X / Catalyst 8300 | Cisco IOS-XE 16.9.4 | Core Enterprise Edge Router with BGP, OSPF, TACACS+ AAA, VRF Mgmt | Weak Type-7 password, Telnet allowed on VTY, SNMP community string `public` |
| **Juniper Networks** | [`juniper_junos_srx.conf`](file:///c:/Users/priya/Documents/sih_mock/sample_configs/juniper_junos_srx.conf) | SRX340 Services Gateway | Junos OS 21.4R1 | Next-Gen Security Gateway with Zones, Screens, Policies, and Syslog | Cleartext Telnet service, plaintext secondary user credential, SNMP v2 community |
| **Palo Alto Networks** | [`paloalto_panos_firewall.cfg`](file:///c:/Users/priya/Documents/sih_mock/sample_configs/paloalto_panos_firewall.cfg) | PA-3220 Next-Gen Firewall | PAN-OS 10.2.4 Enterprise | Perimeter Security Gateway with Zones, Threat Profiles, SIEM Forwarding | Telnet enabled (`disable-telnet no`), SNMP v2c community `public`, plaintext password |
| **Fortinet** | [`fortinet_fortigate_firewall.conf`](file:///c:/Users/priya/Documents/sih_mock/sample_configs/fortinet_fortigate_firewall.conf) | FortiGate-100F Enterprise | FortiOS 7.2.4 GA | Multi-interface Security Appliance with UTM, NAT, Admin Lockout | Telnet in interface `allowaccess`, SNMP community string `public` |

---

## How to Test in VectorNet

1. Navigate to the **Ingestion** view (`http://localhost:3000`).
2. Click the **Upload Config** button (or drag & drop).
3. Browse to `sample_configs/`:
   - **Single File Audit**: Select any single file (e.g. `cisco_ios_router.cfg`). VectorNet automatically fingerprints the vendor, hardware model, and applies the targeted vendor benchmark rules (CIS, NIST SP 800-53, CERT-In).
   - **Multi-File Audit**: Select **multiple files** (Ctrl+Click or Shift+Click to select 2, 3, or all 4 files). VectorNet combines them into a unified audit stream, detects the heterogeneous multi-vendor environment, and executes parallel compliance checks across all vendors.
