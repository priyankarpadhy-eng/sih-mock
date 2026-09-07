from typing import List, Optional
from backend.models import UnifiedJsonLog

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
