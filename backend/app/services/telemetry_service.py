"""
VectorNet Asset Inventory & Syslog Telemetry Service
=====================================================
Manages discovered network hardware inventory and normalizes multi-vendor syslog
streams into a unified, queryable event stream.
"""

from typing import List, Optional

from backend.app.core.models import DeviceAsset, DeviceType, UnifiedJsonLog


class AssetInventoryEngine:
    """
    Manages active network hardware inventory (Routers, Switches, Firewalls, SASE, White-Box Nodes).
    Tracks model numbers, serial numbers, IP interfaces, management protocols, and live audit scores.
    """

    def __init__(self):
        self.inventory: List[DeviceAsset] = [
            DeviceAsset(
                device_id="DEV-CSCO-01",
                hostname="TAC-ROUTER-01",
                vendor="Cisco Systems (IOS / IOS-XE)",
                model_number="ASR-1001-X",
                os_version="16.9.4",
                serial_number="SN-CSC-994102",
                ip_address="10.0.1.1",
                device_type=DeviceType.ROUTER,
                interfaces_status=[
                    {"name": "GigabitEthernet0/0/0", "status": "UP", "ip": "10.0.1.1/24"},
                    {"name": "GigabitEthernet0/0/1", "status": "UP", "ip": "10.0.2.1/24"},
                    {"name": "GigabitEthernet0/0/2", "status": "DOWN", "ip": "unassigned"}
                ],
                management_protocols=["SSHv1 (Non-Compliant)", "Telnet", "SNMPv2c"],
                compliance_score=14.3,
                last_audited="2026-09-06T11:00:00Z"
            ),
            DeviceAsset(
                device_id="DEV-PAN-01",
                hostname="FW-PAN-TACTICAL-01",
                vendor="Palo Alto Networks (PAN-OS)",
                model_number="PA-3220",
                os_version="10.1.0",
                serial_number="SN-PAN-881204",
                ip_address="10.0.10.1",
                device_type=DeviceType.FIREWALL,
                interfaces_status=[
                    {"name": "ethernet1/1", "status": "UP", "ip": "10.0.10.1/24"},
                    {"name": "ethernet1/2", "status": "UP", "ip": "192.168.100.1/24"}
                ],
                management_protocols=["SSHv2", "HTTPS", "SNMPv3"],
                compliance_score=85.7,
                last_audited="2026-09-06T10:45:00Z"
            ),
            DeviceAsset(
                device_id="DEV-JUN-01",
                hostname="BGP-JUNOS-01",
                vendor="Juniper Networks (JunOS)",
                model_number="MX240",
                os_version="21.4R1",
                serial_number="SN-JUN-441920",
                ip_address="10.0.20.1",
                device_type=DeviceType.ROUTER,
                interfaces_status=[
                    {"name": "ge-0/0/0", "status": "UP", "ip": "10.0.20.1/24"},
                    {"name": "ge-0/0/1", "status": "UP", "ip": "10.0.30.1/24"}
                ],
                management_protocols=["SSHv2", "SNMPv3"],
                compliance_score=71.4,
                last_audited="2026-09-06T10:50:00Z"
            ),
            DeviceAsset(
                device_id="DEV-FGT-01",
                hostname="FG-SASE-HUB-01",
                vendor="Fortinet (FortiOS)",
                model_number="FortiGate-100F",
                os_version="7.2.4",
                serial_number="SN-FGT-772910",
                ip_address="10.0.40.1",
                device_type=DeviceType.SASE,
                interfaces_status=[
                    {"name": "port1", "status": "UP", "ip": "10.0.40.1/24"},
                    {"name": "port2", "status": "UP", "ip": "10.0.50.1/24"}
                ],
                management_protocols=["HTTPS", "SNMPv3"],
                compliance_score=85.7,
                last_audited="2026-09-06T10:55:00Z"
            )
        ]

    def get_all_assets(self) -> List[DeviceAsset]:
        return self.inventory

    def get_asset_by_id(self, device_id: str) -> DeviceAsset:
        for asset in self.inventory:
            if asset.device_id == device_id:
                return asset
        return self.inventory[0]


class CentralizedLogAggregator:
    """
    Normalizes multi-vendor syslog streams into a standardized JSON Log Lake.
    """

    def __init__(self):
        self.logs: List[UnifiedJsonLog] = [
            UnifiedJsonLog(
                timestamp="2026-09-06T11:00:00Z",
                device_id="DEV-CSCO-01",
                hostname="TAC-ROUTER-01",
                vendor="cisco",
                log_level="WARNING",
                category="AUTHENTICATION",
                raw_message="Sep 06 11:00:00 SSH-4-SSH2_LOGON_UNAUTH: Failed SSH logon from 192.168.1.100",
                parsed_data={
                    "protocol": "SSH",
                    "status": "FAILED_ATTEMPT",
                    "source_ip": "192.168.1.100",
                    "ssh_version": 1
                }
            ),
            UnifiedJsonLog(
                timestamp="2026-09-06T11:02:15Z",
                device_id="DEV-CSCO-01",
                hostname="TAC-ROUTER-01",
                vendor="cisco",
                log_level="CRITICAL",
                category="AUTHENTICATION",
                raw_message="Sep 06 11:02:15 TELNET-3-CONN_ESTABLISHED: Cleartext Telnet connection accepted on VTY 0 from 10.0.5.22",
                parsed_data={
                    "protocol": "TELNET",
                    "status": "UNENCRYPTED_ACCEPTED",
                    "source_ip": "10.0.5.22",
                    "vty_line": "0"
                }
            ),
            UnifiedJsonLog(
                timestamp="2026-09-06T11:04:30Z",
                device_id="DEV-PAN-01",
                hostname="FW-PAN-TACTICAL-01",
                vendor="paloalto",
                log_level="INFO",
                category="ACL_DROP",
                raw_message="Sep 06 11:04:30 PAN-OS-SYSTEM-LOG: Threat alert: Denied TCP session from 172.16.4.12:443 -> 10.0.10.1:22",
                parsed_data={
                    "protocol": "TCP",
                    "action": "DENIED",
                    "source_ip": "172.16.4.12",
                    "destination_port": 22
                }
            ),
            UnifiedJsonLog(
                timestamp="2026-09-06T11:05:00Z",
                device_id="DEV-JUN-01",
                hostname="BGP-JUNOS-01",
                vendor="juniper",
                log_level="WARNING",
                category="AUTHENTICATION",
                raw_message="Sep 06 11:05:00 JUNOS-AUTH-FAILED: Root authentication failure via SSH from 10.0.0.99",
                parsed_data={
                    "protocol": "SSH",
                    "status": "ROOT_FAILED",
                    "source_ip": "10.0.0.99"
                }
            ),
            UnifiedJsonLog(
                timestamp="2026-09-06T11:06:12Z",
                device_id="DEV-CSCO-01",
                hostname="TAC-ROUTER-01",
                vendor="cisco",
                log_level="WARNING",
                category="SYSTEM",
                raw_message="Sep 06 11:06:12 SNMP-4-UNENCRYPTED_QUERY: SNMPv2c public community query received from 10.0.100.5",
                parsed_data={
                    "protocol": "SNMPv2c",
                    "community": "public",
                    "source_ip": "10.0.100.5"
                }
            )
        ]

    def get_logs(self, device_id: Optional[str] = None) -> List[UnifiedJsonLog]:
        if device_id:
            return [l for l in self.logs if l.device_id == device_id]
        return self.logs


inventory_engine = AssetInventoryEngine()
log_aggregator_engine = CentralizedLogAggregator()
