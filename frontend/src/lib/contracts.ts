import { ethers } from 'ethers';
import type { Card, Deck, Battle, Distribution, Quadrant } from '../types';

// Contract addresses — deployed 2026-06-02
export const CONTRACT_ADDRESSES = {
  cardMinting: '0xc55B1af35C213aacc2b34333FeF4FE94278e98Ca',
  deckAssembly: '0x461d4268686952B260AF6A98a11998f4176c2719',
  battleRevenue: '0x6637423387202060AD322BDBcB3d014C8D8Cc86c',
  potentialOracle: '0x31973c7E34bB9dfE43B714facc981366fFe20d9B',
} as const;

export const NETWORK = {
  chainId: 813,
  name: 'Qitmeer QNG Mainnet',
  rpcUrl: 'https://_qng.qitmeer.io',
  explorerUrl: 'https://explorer.qitmeer.io',
} as const;

// Contract ABIs (minimal for MVP)
export const CARD_MINTING_ABI = [
  'function mintCard(bytes32 contentHash, (uint8 usage, uint8 derive, uint8 expand, uint8 benefit) calldata quadrant) external payable returns (bytes32 nodeId)',
  'function getCard(bytes32 nodeId) external view returns ((bytes32 nodeId, address creator, bytes32 contentHash, (uint8 usage, uint8 derive, uint8 expand, uint8 benefit) quadrant, uint256 potential, uint8 tier, uint256 createdAt, bool frozen) memory)',
  'function getCreatorCards(address creator) external view returns (bytes32[] memory)',
  'function checkFirstCardDiscount(bytes32 nodeId) external view returns (bool isDiscounted, uint256 remainingDays)',
  'function getDeriveFee(bytes32 nodeId) external view returns (uint256)',
  'function totalCards() external view returns (uint256)',
  'event CardMinted(bytes32 indexed nodeId, address indexed creator, bytes32 contentHash, (uint8 usage, uint8 derive, uint8 expand, uint8 benefit) quadrant, uint256 potential, uint256 timestamp)',
];

export const DECK_ASSEMBLY_ABI = [
  'function createDeck(string calldata name, bytes32[] calldata cardNodeIds, uint256[] calldata weights, bool declareEdges) external payable returns (bytes32 deckId)',
  'function getDeck(bytes32 deckId) external view returns ((bytes32 deckId, address owner, bytes32[] cardNodeIds, uint256[] weights, uint256 totalPotential, uint256 createdAt) memory)',
  'function getNodeEdges(bytes32 nodeId) external view returns (bytes32[] memory)',
  'function totalDecks() external view returns (uint256)',
  'event DeckCreated(bytes32 indexed deckId, address indexed owner, bytes32[] cardNodeIds, uint256 totalPotential, uint256 timestamp)',
];

export const BATTLE_REVENUE_ABI = [
  'function createBattle(bytes32 deckId, address opponent) external payable returns (bytes32 battleId)',
  'function joinBattle(bytes32 battleId, bytes32 deckId) external payable',
  'function endBattle(bytes32 battleId, address winner) external',
  'function distributeRevenue(bytes32 battleId) external',
  'function claimRevenue() external',
  'function getBattle(bytes32 battleId) external view returns ((bytes32 battleId, address player1, address player2, bytes32 deck1, bytes32 deck2, uint256 betAmount, address winner, uint256 revenuePool, bool distributed, uint256 createdAt, uint256 endedAt) memory)',
  'function getDistributions(bytes32 battleId) external view returns ((bytes32 battleId, bytes32 nodeId, address recipient, uint256 amount, uint8 shareType)[] memory)',
  'function getPendingRevenue(address recipient) external view returns (uint256)',
  'event BattleCreated(bytes32 indexed battleId, address indexed player1, address indexed player2, bytes32 deck1, bytes32 deck2, uint256 betAmount, uint256 revenuePool)',
  'event BattleEnded(bytes32 indexed battleId, address indexed winner, uint256 revenuePool, uint256 timestamp)',
  'event RevenueDistributed(bytes32 indexed battleId, uint8 indexed shareType, address indexed recipient, bytes32 nodeId, uint256 amount)',
];

export const POTENTIAL_ORACLE_ABI = [
  'function getPotential(bytes32 nodeId) external view returns ((uint256 currentPotential, uint256 basePotential, uint256 lastUpdated, uint8 tier, uint256 freshness, uint256 useCount, uint256 bridgeCount) memory)',
  'function getTier(uint256 potential) external view returns (uint8)',
  'function getTierMultiplier(uint8 tier) external view returns (uint16)',
  'function calculatePublicityPeriod(uint8 tier) external pure returns (uint256)',
  'function revenueMultiplier(uint8 tier, bool isWin) external pure returns (uint256)',
];

export interface ContractAddresses {
  cardMinting: string;
  deckAssembly: string;
  battleRevenue: string;
  potentialOracle: string;
}

// Qitmeer QNG Mainnet (Chain ID: 813) — 部署完成 2026-06-02

export class EchoBattleSDK {
  private provider: ethers.BrowserProvider;
  private signer?: ethers.Signer;
  public contracts: {
    cardMinting: ethers.Contract;
    deckAssembly: ethers.Contract;
    battleRevenue: ethers.Contract;
    potentialOracle: ethers.Contract;
  };

  constructor(provider: ethers.BrowserProvider, addresses: ContractAddresses) {
    this.provider = provider;
    const base = { provider } as { provider: ethers.Provider };
    this.contracts = {
      cardMinting: new ethers.Contract(addresses.cardMinting, CARD_MINTING_ABI, provider) as ethers.Contract,
      deckAssembly: new ethers.Contract(addresses.deckAssembly, DECK_ASSEMBLY_ABI, provider) as ethers.Contract,
      battleRevenue: new ethers.Contract(addresses.battleRevenue, BATTLE_REVENUE_ABI, provider) as ethers.Contract,
      potentialOracle: new ethers.Contract(addresses.potentialOracle, POTENTIAL_ORACLE_ABI, provider) as ethers.Contract,
    };
  }

  async connectSigner() {
    this.signer = await this.provider.getSigner();
    this.contracts.cardMinting = this.contracts.cardMinting.connect(this.signer) as ethers.Contract;
    this.contracts.deckAssembly = this.contracts.deckAssembly.connect(this.signer) as ethers.Contract;
    this.contracts.battleRevenue = this.contracts.battleRevenue.connect(this.signer) as ethers.Contract;
    this.contracts.potentialOracle = this.contracts.potentialOracle.connect(this.signer) as ethers.Contract;
  }

  // ============ Card Minting ============
  async mintCard(
    contentHash: string,
    quadrant: Quadrant,
    metadataURI: string,
    value: bigint
  ) {
    const tx = await this.contracts.cardMinting.mintCard(contentHash, quadrant, metadataURI, { value });
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment?.name === 'CardMinted');
    if (!event) throw new Error('CardMinted event not found');
    return { nodeId: event.args[0], txHash: receipt.hash };
  }

  async getCard(nodeId: string): Promise<Card> {
    const card = await this.contracts.cardMinting.getCard(nodeId);
    return {
      nodeId: card[0],
      creator: card[1],
      contentHash: card[2],
      quadrant: card[3],
      potential: Number(card[4]),
      tier: card[5],
      createdAt: Number(card[6]),
      frozen: card[7],
    };
  }

  async getMyCards(): Promise<string[]> {
    const signer = await this.provider.getSigner();
    const addr = await signer.getAddress();
    return this.contracts.cardMinting.getCreatorCards(addr);
  }

  async getDeriveFee(nodeId: string) {
    return this.contracts.cardMinting.getDeriveFee(nodeId);
  }

  // ============ Deck Assembly ============
  async createDeck(name: string, cardNodeIds: string[], weights: number[], declareEdges: boolean, value: bigint) {
    const tx = await this.contracts.deckAssembly.createDeck(name, cardNodeIds, weights, declareEdges, { value });
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment?.name === 'DeckCreated');
    if (!event) throw new Error('DeckCreated event not found');
    return { deckId: event.args[0], txHash: receipt.hash };
  }

  async getDeck(deckId: string): Promise<Deck> {
    const deck = await this.contracts.deckAssembly.getDeck(deckId);
    return {
      deckId: deck[0],
      owner: deck[1],
      cardNodeIds: deck[2],
      weights: deck[3].map(Number),
      totalPotential: Number(deck[4]),
      createdAt: Number(deck[5]),
    };
  }

  // ============ Battle Revenue ============
  async createBattle(deckId: string, opponent: string, value: bigint) {
    const tx = await this.contracts.battleRevenue.createBattle(deckId, opponent, { value });
    const receipt = await tx.wait();
    const event = receipt.logs.find(l => l.fragment?.name === 'BattleCreated');
    if (!event) throw new Error('BattleCreated event not found');
    return { battleId: event.args[0], txHash: receipt.hash };
  }

  async joinBattle(battleId: string, deckId: string, value: bigint) {
    const tx = await this.contracts.battleRevenue.joinBattle(battleId, deckId, { value });
    return tx.wait();
  }

  async endBattle(battleId: string, winner: string) {
    const tx = await this.contracts.battleRevenue.endBattle(battleId, winner);
    return tx.wait();
  }

  async distributeRevenue(battleId: string) {
    const tx = await this.contracts.battleRevenue.distributeRevenue(battleId);
    return tx.wait();
  }

  async claimRevenue() {
    const tx = await this.contracts.battleRevenue.claimRevenue();
    return tx.wait();
  }

  async getBattle(battleId: string): Promise<Battle> {
    const battle = await this.contracts.battleRevenue.getBattle(battleId);
    return {
      battleId: battle[0],
      player1: battle[1],
      player2: battle[2],
      deck1: battle[3],
      deck2: battle[4],
      betAmount: ethers.formatEther(battle[5]),
      winner: battle[6],
      revenuePool: ethers.formatEther(battle[7]),
      distributed: battle[8],
      createdAt: Number(battle[9]),
      endedAt: Number(battle[10]),
    };
  }

  async getDistributions(battleId: string): Promise<Distribution[]> {
    const dists = await this.contracts.battleRevenue.getDistributions(battleId);
    return dists.map((d: ethers.Result) => ({
      nodeId: d[1],
      recipient: d[2],
      amount: ethers.formatEther(d[3]),
      shareType: ['creator', 'edge', 'reviewer', 'public', 'platform', 'ambassador', 'gate', 'upgrade', 'reserve'][d[4]] as Distribution['shareType'],
    }));
  }

  // ============ Potential Oracle ============
  async getPotential(nodeId: string) {
    const state = await this.contracts.potentialOracle.getPotential(nodeId);
    return {
      currentPotential: Number(state[0]),
      basePotential: Number(state[1]),
      lastUpdated: Number(state[2]),
      tier: state[3],
      freshness: Number(state[4]),
      useCount: Number(state[5]),
      bridgeCount: Number(state[6]),
    };
  }

  async getTier(potential: number) {
    return this.contracts.potentialOracle.getTier(potential);
  }

  async revenueMultiplier(tier: number, isWin: boolean) {
    return this.contracts.potentialOracle.revenueMultiplier(tier, isWin);
  }
}

// API base URL for backend calls (wallet auth)
export const API_BASE = 'https://api.battleofpotential.echo';