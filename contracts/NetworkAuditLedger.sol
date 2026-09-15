// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title NetworkAuditLedger
 * @dev Defense-Grade Immutable Audit Trail for Network Security Compliance
 * Smart India Hackathon 2026 | Problem Statement 26155 (NTRO / NCIIPC)
 *
 * Stores tamper-proof cryptographic proofs of network device configuration audits,
 * ensuring non-repudiation and verifiable compliance against CIS, NIST SP 800-53, and DISA STIG.
 */
contract NetworkAuditLedger {
    address public immutable authority;

    struct AuditCertificate {
        bytes32 configHash;          // SHA-256 fingerprint of raw network device configuration
        bytes32 findingsMerkleRoot;  // SHA-256 Merkle root of all compliance findings
        uint8 complianceScore;       // Evaluated score (0 - 100)
        uint32 totalChecks;          // Total security rules evaluated
        uint32 failedChecks;         // Number of failed security checks
        uint64 timestamp;            // Block timestamp of audit completion
        address auditor;             // Cryptographic public key / address of the auditor
        string hostname;             // Device hostname (e.g., edge-gw-cisco-01)
        string vendor;               // Vendor identifier (e.g., Cisco, Juniper, Palo Alto)
        bool isValid;                // Record existence flag
    }

    // Mapping from configHash to its permanent AuditCertificate
    mapping(bytes32 => AuditCertificate) private auditCertificates;

    // Ordered list of all recorded audit hashes
    bytes32[] public auditIndex;

    // Events
    event AuditCommitted(
        bytes32 indexed configHash,
        bytes32 indexed findingsMerkleRoot,
        uint8 complianceScore,
        address indexed auditor,
        string hostname,
        string vendor,
        uint64 timestamp
    );

    event AuditRevoked(
        bytes32 indexed configHash,
        string reason,
        address revokedBy,
        uint64 timestamp
    );

    modifier onlyAuthority() {
        require(msg.sender == authority, "Unauthorized: caller is not compliance authority");
        _;
    }

    constructor() {
        authority = msg.sender;
    }

    /**
     * @notice Commits an immutable audit certificate onto the blockchain ledger.
     * @param _configHash SHA-256 hash of the device configuration file.
     * @param _findingsMerkleRoot Merkle tree root hash computed from all finding outcomes.
     * @param _complianceScore The evaluated compliance percentage (0-100).
     * @param _totalChecks Total controls checked.
     * @param _failedChecks Number of failed controls.
     * @param _hostname Target network device hostname.
     * @param _vendor Target network equipment manufacturer.
     */
    function commitAudit(
        bytes32 _configHash,
        bytes32 _findingsMerkleRoot,
        uint8 _complianceScore,
        uint32 _totalChecks,
        uint32 _failedChecks,
        string calldata _hostname,
        string calldata _vendor
    ) external returns (bool) {
        require(_configHash != bytes32(0), "Invalid configuration hash");
        require(_findingsMerkleRoot != bytes32(0), "Invalid findings Merkle root");
        require(!auditCertificates[_configHash].isValid, "Audit record already committed on-chain");

        AuditCertificate memory cert = AuditCertificate({
            configHash: _configHash,
            findingsMerkleRoot: _findingsMerkleRoot,
            complianceScore: _complianceScore,
            totalChecks: _totalChecks,
            failedChecks: _failedChecks,
            timestamp: uint64(block.timestamp),
            auditor: msg.sender,
            hostname: _hostname,
            vendor: _vendor,
            isValid: true
        });

        auditCertificates[_configHash] = cert;
        auditIndex.push(_configHash);

        emit AuditCommitted(
            _configHash,
            _findingsMerkleRoot,
            _complianceScore,
            msg.sender,
            _hostname,
            _vendor,
            uint64(block.timestamp)
        );

        return true;
    }

    /**
     * @notice Verifies whether a configuration and findings set matches the tamper-proof ledger.
     * @param _configHash The SHA-256 hash of the configuration to verify.
     * @param _expectedMerkleRoot The SHA-256 Merkle root of the findings to verify.
     * @return isTamperFree True if the ledger record exists and hashes match exactly.
     * @return score The on-chain recorded compliance score.
     * @return committedAt Timestamp when the audit was sealed on the ledger.
     * @return auditor Address of the auditor who committed the audit.
     */
    function verifyAudit(
        bytes32 _configHash,
        bytes32 _expectedMerkleRoot
    ) external view returns (
        bool isTamperFree,
        uint8 score,
        uint64 committedAt,
        address auditor
    ) {
        AuditCertificate memory cert = auditCertificates[_configHash];
        if (!cert.isValid) {
            return (false, 0, 0, address(0));
        }

        bool matchMerkle = (cert.findingsMerkleRoot == _expectedMerkleRoot);
        return (matchMerkle, cert.complianceScore, cert.timestamp, cert.auditor);
    }

    /**
     * @notice Retrieves full audit certificate details for a given configuration hash.
     */
    function getAuditCertificate(bytes32 _configHash) external view returns (AuditCertificate memory) {
        require(auditCertificates[_configHash].isValid, "Certificate not found on ledger");
        return auditCertificates[_configHash];
    }

    /**
     * @notice Returns total number of audits sealed in this ledger.
     */
    function getTotalAudits() external view returns (uint256) {
        return auditIndex.length;
    }
}
