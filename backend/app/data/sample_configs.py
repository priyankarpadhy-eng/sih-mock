SAMPLE_CONFIGS = {
    "cisco_cucme": {
        "name": "Cisco CUCME Benchmark (Problem Statement 26155 Gold Standard)",
        "vendor": "Cisco Systems",
        "os_version": "IOS 15.1",
        "device_type": "voip_gateway",
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
    "cisco_ios": {
        "name": "Cisco IOS-XE Core Router (Non-Compliant)",
        "vendor": "Cisco Systems",
        "os_version": "IOS-XE 16.9.4",
        "device_type": "router",
        "raw": """! Cisco IOS-XE Core Router Configuration
hostname TAC-ROUTER-01
version 16.9.4
!
enable secret 5 $1$mER7$vX3Y80x1g0f7
service password-encryption
!
ip domain-name defense.mil
ip ssh version 1
!
line vty 0 4
 exec-timeout 0 0
 transport input telnet ssh
!
snmp-server community public RO
snmp-server community private RW
!
no logging host
!
end"""
    },
    "palo_alto": {
        "name": "Palo Alto PAN-OS Perimeter Firewall",
        "vendor": "Palo Alto Networks",
        "os_version": "PAN-OS 10.1.0",
        "device_type": "firewall",
        "raw": """set deviceconfig system hostname FW-PAN-TACTICAL-01
set deviceconfig system os-version 10.1.0
set deviceconfig system idle-timeout 15
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system ssh-cipher ciphers aes256-gcm
set deviceconfig system snmp-setting version v3
set deviceconfig system login-banner "WARNING: AUTHORIZED MILITARY PERSONNEL ONLY"
set shared log-settings syslog SEC-SYSLOG server SYSLOG-01 server 10.0.100.50
set security zones trust interfaces ge-0/0/0.0"""
    },
    "juniper_junos": {
        "name": "Juniper JunOS Border Gateway",
        "vendor": "Juniper Networks",
        "os_version": "JunOS 21.4",
        "device_type": "router",
        "raw": """set system host-name BGP-JUNOS-01
set system services ssh protocol-version v2
set system services telnet disable
set system login idle-timeout 10
set system login message "UNAUTHORIZED ACCESS PROHIBITED. ALL ACTIVITIES MONITORED AND LOGGED."
set system syslog host 10.0.100.50 any info
set system ntp server 10.0.0.1
set snmp v3 usm local-engine user admin authentication-sha password SECURE_PASS"""
    },
    "fortinet_fortios": {
        "name": "Fortinet FortiGate SASE Hub",
        "vendor": "Fortinet",
        "os_version": "FortiOS 7.2",
        "device_type": "firewall",
        "raw": """config system global
    set hostname "FG-SASE-HUB-01"
    set admintimeout 10
    set admin-sport 8443
    set admin-https-redirect enable
    set pre-login-banner enable
end
config system snmp community
    delete 1
end
config log syslogd setting
    set status enable
    set server "10.0.100.50"
end"""
    },
    "sonic_whitebox": {
        "name": "SONiC Open Networking Switch (White Box)",
        "vendor": "Sonic Foundation",
        "os_version": "SONiC 202311",
        "device_type": "whitebox",
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
    },
    "aws_sg": {
        "name": "AWS Cloud Security Group (Perimeter)",
        "vendor": "Amazon Web Services",
        "os_version": "AWS Cloud SG",
        "device_type": "cloud_sg",
        "raw": """{
  "Description": "Production Web & Management Security Group",
  "GroupName": "sg-production-perimeter",
  "IpPermissions": [
    {
      "FromPort": 22,
      "IpProtocol": "tcp",
      "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
      "ToPort": 22
    },
    {
      "FromPort": 443,
      "IpProtocol": "tcp",
      "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
      "ToPort": 443
    }
  ]
}"""
    }
}
