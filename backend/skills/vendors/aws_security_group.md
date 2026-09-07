---
skill_id: vendor_aws_security_group
skill_name: AWS Cloud-Native Security Group Parser & Remediation Engine
category: vendor
vendor: Amazon Web Services
os_version: AWS Cloud SG
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `SecurityGroup`, `IpPermissions`, `IpRanges`, `GroupId`, `sg-`
- Open Ingress Pattern: `0.0.0.0/0` with `FromPort: 22` or `FromPort: 3389`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-17 & CIS-4.1
```bash
# Revoke open 0.0.0.0/0 SSH rule
aws ec2 revoke-security-group-ingress \
    --group-id sg-0a8b9c1d2e3f4a5b6 \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# Authorize bastion / corporate subnet only
aws ec2 authorize-security-group-ingress \
    --group-id sg-0a8b9c1d2e3f4a5b6 \
    --protocol tcp \
    --port 22 \
    --cidr 10.0.0.0/16
```
