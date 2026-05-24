// AgentJury ABI - ECHO v0.4
export const AGENTJURY_ABI = [
  // View functions
  "function getCase(uint256 _caseId) external view returns (bytes32, uint256, uint256, uint8, uint256, uint256, uint256, bool, bool)",
  "function getJuror(uint256 _caseId, address _juror) external view returns (bytes32, bool, uint256, bool)",
  "function getCommitCount(uint256 _caseId) external view returns (uint256)",
  "function getRevealCount(uint256 _caseId) external view returns (uint256)",
  
  // State enum
  "function CASE_STATE() external view returns (uint8)", // COMMIT_OPEN=0, REVEAL_OPEN=1, RESOLVED=2
  
  // Commit functions
  "function juryCommit(uint256 _caseId, bytes32 _commitHash, uint256 _salt) external",
  
  // Reveal functions
  "function juryReveal(uint256 _caseId, bool _vote, uint256 _salt) external",
  
  // Finalize
  "function finalizeCase(uint256 _caseId) external",
  
  // Events
  "event CaseCommitted(uint256 indexed caseId, address indexed juror, bytes32 commitHash)",
  "event CaseRevealed(uint256 indexed caseId, address indexed juror, bool vote)",
  "event CaseResolved(uint256 indexed caseId, bool verdict)",
  "event JurorSlashed(uint256 indexed caseId, address indexed juror, uint256 slashAmount)",
];

// GovernanceDAO ABI
export const GOVERNANCE_DAO_ABI = [
  "function createCase(uint256 _caseId, bytes32 _evidenceHash) external returns (bool)",
  "function getCaseInfo(uint256 _caseId) external view returns (uint256, uint256, bool, address)",
  "function daoMinMembers() external view returns (uint256)",
];

// LicenseNFT ABI
export const LICENSE_NFT_ABI = [
  "function mint(address _to, string memory _licenseType) external returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

// PotentialEngine ABI
export const POTENTIAL_ENGINE_ABI = [
  "function calculatePotential(address _agent) external view returns (uint256)",
  "function getReputation(address _agent) external view returns (uint256)",
];

// ExitGasPool ABI
export const EXIT_GAS_POOL_ABI = [
  "function getPoolBalance() external view returns (uint256)",
  "function requestExitGas(address _recipient, uint256 _amount) external returns (bool)",
];