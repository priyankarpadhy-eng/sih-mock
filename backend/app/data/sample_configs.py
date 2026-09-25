import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_configs")

def _read_sample(filename: str, fallback: str) -> str:
    path = os.path.join(SAMPLE_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    return fallback

SAMPLE_CONFIGS = {
    "cisco_ios": {
        "name": "Cisco IOS-XE Enterprise Core Router (ISR 4451 / Catalyst 8300)",
        "vendor": "Cisco Systems",
        "os_version": "IOS-XE 16.9.4",
        "device_type": "router",
        "filename": "cisco_ios_router.cfg",
        "raw": _read_sample("cisco_ios_router.cfg", "! Cisco IOS-XE Core Router\nhostname RTR-NYC-CORE-01\nversion 16.9\n")
    },
    "juniper_junos": {
        "name": "Juniper JunOS SRX340 Services Gateway",
        "vendor": "Juniper Networks",
        "os_version": "JunOS 21.4R1",
        "device_type": "firewall",
        "filename": "juniper_junos_srx.conf",
        "raw": _read_sample("juniper_junos_srx.conf", "version 21.4R1;\nsystem { host-name SRX-BORD-SEC-01; }\n")
    },
    "palo_alto": {
        "name": "Palo Alto PAN-OS 10.2 Next-Gen Perimeter Firewall (PA-3200)",
        "vendor": "Palo Alto Networks",
        "os_version": "PAN-OS 10.2.4",
        "device_type": "firewall",
        "filename": "paloalto_panos_firewall.cfg",
        "raw": _read_sample("paloalto_panos_firewall.cfg", "set deviceconfig system hostname PA-3200-PERIMETER-FW01\nset deviceconfig system os-version 10.2.4\n")
    },
    "fortinet_fortios": {
        "name": "Fortinet FortiGate-100F Enterprise Firewall",
        "vendor": "Fortinet",
        "os_version": "FortiOS 7.2.4",
        "device_type": "firewall",
        "filename": "fortinet_fortigate_firewall.conf",
        "raw": _read_sample("fortinet_fortigate_firewall.conf", "config system global\n    set hostname \"FGT-100F-CORP-EDGE\"\nend\n")
    },
    "cisco_cucme": {
        "name": "Cisco CUCME Benchmark (Problem Statement 26155 Gold Standard)",
        "vendor": "Cisco Systems",
        "os_version": "IOS 15.1",
        "device_type": "voip_gateway",
        "filename": "cisco_cucme.cfg",
        "raw": """! Gold-Standard Cisco CUCME Configuration Benchmark (SIH Problem Statement 26155)
version 15.1
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname CUCME
!
boot-start-marker
boot-end-marker
!
enable secret 5 $1$mER7$vX3Y80x1g0f7
enable password 7 0822455D0A16
!
username b privilege 15 password 7 0822455D0A16
!
ip cef
ip domain-name defense.mil
ip ssh version 2
!
telephony-service
 max-ephones 15
 max-dn 30
 ip source-address 192.168.1.1 port 2000
 auto assign 1 to 15
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 duplex auto
 speed auto
!
snmp-server community public RO
snmp-server community private RW
!
line con 0
 exec-timeout 0 0
 privilege level 15
 logging synchronous
line vty 0 4
 exec-timeout 0 0
 password 7 0822455D0A16
 login
 transport input telnet ssh
line vty 5 15
 exec-timeout 0 0
 transport input telnet
!
end"""
    },
    "sonic_whitebox": {
        "name": "SONiC Open Networking Switch (White Box)",
        "vendor": "Sonic Foundation",
        "os_version": "SONiC 202311",
        "device_type": "whitebox",
        "filename": "sonic_switch.json",
        "raw": """{
  "DEVICE_METADATA": {
    "localhost": {
      "hostname": "SONIC-SW-01",
      "hwsku": "Dell-EMC-S5248f-P-25G",
      "platform": "x86_64-dell_s5248f_c3538-r0"
    }
  },
  "AAA": {
    "authentication": {
      "login": "local",
      "fallback": "true"
    }
  },
  "SSH": {
    "PORT": {
      "22": {
        "authentication_retries": "10",
        "root_login": "no"
      }
    }
  }
}"""
    }
}
