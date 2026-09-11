export interface DemoSample {
  id: string;
  vendor: 'Cisco' | 'Palo Alto' | 'Juniper' | 'Fortinet' | 'Multi-Vendor';
  name: string;
  statusType: 'CLEAN' | 'VULNERABLE' | 'COMBO';
  badgeText: string;
  violationsCount: number;
  description: string;
  rawConfig: string;
}

export const DEMO_SAMPLES: DemoSample[] = [
  // --- CISCO ---
  {
    id: 'cisco_clean',
    vendor: 'Cisco',
    name: 'Cisco IOS (Hardened)',
    statusType: 'CLEAN',
    badgeText: 'Clean • 0 Errors',
    violationsCount: 0,
    description: 'SSHv2 enforced, secret 9 password, 10m timeout, Telnet disabled.',
    rawConfig: `version 15.6
no service password-encryption
service timestamps log datetime msec
!
hostname CORE-RTR-CLEAN
!
enable secret 9 $9$x9K7mER7vX3Y80x1g0f7abcde12345
username secadmin privilege 15 secret 9 $9$mER7vX3Y80x1g0f7abcde123456789
!
aaa new-model
aaa authentication login default local
aaa authorization exec default local
!
ip domain-name defense.corp
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
no ip http server
ip http secure-server
!
banner motd ^C
AUTHORIZED ACCESS ONLY! All activities are monitored and recorded.
Disconnect immediately if you are not an authorized operator.
^C
!
logging host 10.0.0.50
logging trap warnings
!
snmp-server group SECGROUP v3 priv
snmp-server user secuser SECGROUP v3 auth sha StrongAuthPass priv aes 128 StrongPrivPass
no snmp-server community public
no snmp-server community private
!
interface GigabitEthernet0/0
 description Production WAN Link
 ip address 10.10.10.1 255.255.255.0
 no shutdown
!
line con 0
 exec-timeout 10 0
 login authentication default
line vty 0 15
 exec-timeout 10 0
 login authentication default
 transport input ssh
!
end`,
  },
  {
    id: 'cisco_vulnerable',
    vendor: 'Cisco',
    name: 'Cisco IOS (Vulnerable)',
    statusType: 'VULNERABLE',
    badgeText: 'Violations • 8 Errors',
    violationsCount: 8,
    description: 'Cleartext Telnet active, weak Type-7 passwords, infinite timeout, public SNMP.',
    rawConfig: `version 15.1
service password-encryption
!
hostname BRANCH-RTR-VULN
!
enable password 7 0822455D0A16
username operator password 7 14141B180F0B
!
no aaa new-model
ip domain-name legacy.local
ip ssh version 1
ip http server
!
snmp-server community public RO
snmp-server community private RW
!
interface GigabitEthernet0/0
 description Edge Interface
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
line con 0
 exec-timeout 0 0
line vty 0 4
 exec-timeout 0 0
 transport input telnet ssh
 login local
line vty 5 15
 exec-timeout 0 0
 transport input telnet
 login local
!
end`,
  },

  // --- PALO ALTO ---
  {
    id: 'palo_alto_clean',
    vendor: 'Palo Alto',
    name: 'PAN-OS (Hardened)',
    statusType: 'CLEAN',
    badgeText: 'Clean • 0 Errors',
    violationsCount: 0,
    description: 'Telnet/HTTP disabled, SSHv2, idle-timeout 10m, syslog forwarder configured.',
    rawConfig: `set deviceconfig system hostname PAN-FW-CLEAN
set deviceconfig system ip-address 10.0.0.1 netmask 255.255.255.0
set deviceconfig system default-gateway 10.0.0.254
set deviceconfig system dns-setting servers primary 1.1.1.1
set deviceconfig system timezone UTC

# Management Service Hardening
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system service disable-snmpv1-v2c yes
set deviceconfig system ssh-version 2
set deviceconfig system idle-timeout 10

# Warning Banner & Auditing
set deviceconfig system login-banner "AUTHORIZED ACCESS ONLY. All activities are monitored and logged."
set shared log-settings syslog PROD-SYSLOG server 10.0.0.50 transport UDP port 514 format BSD

# Administrative Security
set mgt-config users secadmin phash $6$rounds=5000$strongsalt$9K7mER7vX3Y80x1g0f7abcde12345
set mgt-config users secadmin permissions role-based superuser yes
set mgt-config password-complexity minimum-length 14
set mgt-config password-complexity enabled yes`,
  },
  {
    id: 'palo_alto_vulnerable',
    vendor: 'Palo Alto',
    name: 'PAN-OS (Vulnerable)',
    statusType: 'VULNERABLE',
    badgeText: 'Violations • 8 Errors',
    violationsCount: 8,
    description: 'Telnet allowed, unencrypted HTTP active, infinite timeout, public SNMP.',
    rawConfig: `set deviceconfig system hostname PAN-FW-VULN
set deviceconfig system ip-address 192.168.1.5 netmask 255.255.255.0

# Insecure Service Settings (Violates CIS 1.1 / NIST SC-8)
set deviceconfig system service disable-telnet no
set deviceconfig system service disable-http no
set deviceconfig system idle-timeout 0

# Insecure SNMP Community
set deviceconfig system snmp-setting version v2c
set deviceconfig system snmp-setting community public

# Weak User Authentication & Missing Banner
set mgt-config users admin password plainadmin123
set mgt-config users admin permissions role-based superuser yes`,
  },

  // --- JUNIPER ---
  {
    id: 'juniper_clean',
    vendor: 'Juniper',
    name: 'Junos (Hardened)',
    statusType: 'CLEAN',
    badgeText: 'Clean • 0 Errors',
    violationsCount: 0,
    description: 'SSH protocol-version v2, idle-timeout 10, encrypted-password, syslog host.',
    rawConfig: `system {
    host-name SRX-SEC-CLEAN;
    time-zone UTC;
    login {
        message "AUTHORIZED ACCESS ONLY. Disconnect immediately if unapproved.";
        user secadmin {
            uid 2001;
            class super-user;
            authentication {
                encrypted-password "$6$rounds=5000$strongsalt$9K7mER7vX3Y80x1g0f7abcde12345";
            }
        }
        idle-timeout 10;
    }
    services {
        ssh {
            protocol-version v2;
            connection-limit 5;
            rate-limit 3;
        }
        web-management {
            https {
                port 443;
            }
        }
    }
    syslog {
        host 10.0.0.50 {
            any warning;
            authorization info;
        }
    }
}`,
  },
  {
    id: 'juniper_vulnerable',
    vendor: 'Juniper',
    name: 'Junos (Vulnerable)',
    statusType: 'VULNERABLE',
    badgeText: 'Violations • 4 Errors',
    violationsCount: 4,
    description: 'Telnet service active, unencrypted HTTP management, plaintext password.',
    rawConfig: `system {
    host-name SRX-SEC-VULN;
    login {
        user admin {
            uid 2002;
            class super-user;
            authentication {
                plain-text-password "admin12345";
            }
        }
    }
    services {
        telnet;
        web-management {
            http;
        }
    }
}
snmp {
    community public {
        authorization read-only;
    }
}`,
  },

  // --- FORTINET ---
  {
    id: 'fortinet_clean',
    vendor: 'Fortinet',
    name: 'FortiOS (Hardened)',
    statusType: 'CLEAN',
    badgeText: 'Clean • 0 Errors',
    violationsCount: 0,
    description: 'admintimeout 5m, lockout threshold 3, allowaccess ssh https only.',
    rawConfig: `config system global
    set hostname "FGT-SEC-CLEAN"
    set admintimeout 5
    set admin-lockout-threshold 3
    set admin-lockout-duration 300
    set pre_login_banner enable
    set strong-crypto enable
end

config system interface
    edit "port1"
        set ip 10.0.0.1 255.255.255.0
        set allowaccess ssh https
    next
end

config log syslogd setting
    set status enable
    set server "10.0.0.50"
    set mode udp
    set port 514
end`,
  },
  {
    id: 'fortinet_vulnerable',
    vendor: 'Fortinet',
    name: 'FortiOS (Vulnerable)',
    statusType: 'VULNERABLE',
    badgeText: 'Violations • 8 Errors',
    violationsCount: 8,
    description: 'allowaccess telnet http, admintimeout 0 (infinite), public SNMP community.',
    rawConfig: `config system global
    set hostname "FGT-SEC-VULN"
    set admintimeout 0
    set pre_login_banner disable
end

config system interface
    edit "port1"
        set ip 192.168.1.99 255.255.255.0
        set allowaccess telnet http
    next
end

config system snmp community
    edit 1
        set name "public"
        set status enable
    next
end`,
  },

  // --- COMBINATIONS ---
  {
    id: 'combo_cisco_err_palo_clean',
    vendor: 'Multi-Vendor',
    name: 'Cisco (Error) + Palo Alto (Clean)',
    statusType: 'COMBO',
    badgeText: 'Combo • Mixed Audit',
    violationsCount: 3,
    description: 'Uploads Cisco with violations and Palo Alto 100% clean in one single stream.',
    rawConfig: `! ==============================================================================
! COMBINATION: CISCO (VULNERABLE) + PALO ALTO (COMPLIANT)
! ==============================================================================

! --- DEVICE 1: CISCO IOS (NON-COMPLIANT) ---
version 15.1
hostname BRANCH-RTR-VULN
service password-encryption
enable password 7 0822455D0A16
ip domain-name legacy.local
ip ssh version 1
ip http server
snmp-server community public RO
line con 0
 exec-timeout 0 0
line vty 0 4
 exec-timeout 0 0
 transport input telnet ssh
 login local
end

# --- DEVICE 2: PALO ALTO NETWORKS (100% COMPLIANT) ---
set deviceconfig system hostname PAN-FW-CLEAN
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system idle-timeout 10
set deviceconfig system login-banner "AUTHORIZED ACCESS ONLY. All activities are monitored and logged."
set shared log-settings syslog PROD-SYSLOG server 10.0.0.50 transport UDP port 514 format BSD
set mgt-config users secadmin phash $6$rounds=5000$strongsalt$9K7mER7vX3Y80x1g0f7abcde12345
set mgt-config password-complexity minimum-length 14
set mgt-config password-complexity enabled yes`,
  },
  {
    id: 'combo_four_vendors',
    vendor: 'Multi-Vendor',
    name: '4-Vendor Heterogeneous Stream',
    statusType: 'COMBO',
    badgeText: 'Multi-Vendor Stream',
    violationsCount: 8,
    description: 'Simultaneously audits Cisco, Palo Alto, Juniper, and Fortinet in one upload.',
    rawConfig: `! ==============================================================================
! 4-VENDOR HETEROGENEOUS ENTERPRISE AUDIT STREAM
! ==============================================================================

! === 1. CISCO IOS (NON-COMPLIANT) ===
hostname BRANCH-CISCO-VULN
enable password 7 0822455D0A16
ip ssh version 1
snmp-server community public RO
line vty 0 4
 exec-timeout 0 0
 transport input telnet ssh
end

# === 2. PALO ALTO PAN-OS (100% COMPLIANT) ===
set deviceconfig system hostname PERIMETER-PAN-CLEAN
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system idle-timeout 10
set deviceconfig system login-banner "AUTHORIZED USE ONLY"

# === 3. JUNIPER JUNOS (100% COMPLIANT) ===
system {
    host-name CORE-JUNIPER-CLEAN;
    login {
        message "AUTHORIZED ACCESS ONLY";
        idle-timeout 10;
    }
    services {
        ssh {
            protocol-version v2;
        }
    }
}

# === 4. FORTINET FORTIOS (NON-COMPLIANT) ===
config system global
    set hostname "EDGE-FORTINET-VULN"
    set admintimeout 0
end
config system interface
    edit "port1"
        set allowaccess telnet http
    next
end`,
  },
];
