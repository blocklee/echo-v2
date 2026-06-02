export interface Quadrant {
  usage: 0 | 1 | 2;     // 0=私密, 1=社群, 2=开放
  derive: 0 | 1 | 2;    // 0=封闭, 1=条件, 2=开放
  expand: 0 | 1 | 2;    // 0=锁定, 1=条件, 2=自由
  benefit: 0 | 1 | 2;   // 0=免费, 1=按次, 2=分成
}

export interface Card {
  nodeId: string;
  creator: string;
  contentHash: string;
  quadrant: Quadrant;
  potential: number;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  createdAt: number;
  frozen: boolean;
  name?: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    attributes?: Record<string, unknown>;
  };
}

export interface Deck {
  deckId: string;
  owner: string;
  cardNodeIds: string[];
  weights: number[];
  totalPotential: number;
  createdAt: number;
  name?: string;
  cards?: Card[];
}

export interface Battle {
  battleId: string;
  player1: string;
  player2: string;
  deck1: string;
  deck2: string;
  betAmount: string;
  winner: string;
  revenuePool: string;
  distributed: boolean;
  createdAt: number;
  endedAt: number;
}

export interface Distribution {
  nodeId: string;
  recipient: string;
  amount: string;
  shareType: 'creator' | 'edge' | 'reviewer' | 'public' | 'platform' | 'ambassador' | 'gate' | 'upgrade' | 'reserve';
  potentialTier?: number;
  weight?: number;
}

// 经济参数 (v0.1 — 猫先森)
export const ECONOMIC_PARAMS = {
  MINT_FEE: '0.02',          // 铸卡费
  ASSEMBLY_FEE: '0.01',       // 编排费
  USAGE_BASE: '0.01',         // 用权基价
  DERIVE_BASE: '0.05',        // 衍权基价 (首月半价)
  EXPAND_BASE: '0.10',        // 扩权基价
  BET_MIN: '0.1',            // 投注最小
  BET_MAX: '10',             // 投注最大
  DERIVE_DISCOUNT_DAYS: 30,   // 首卡减免期
  DERIVE_DISCOUNT_RATE: 0.5, // 衍权半价
} as const;

export const TIER_NAMES = ['青铜', '白银', '黄金', '白金', '钻石', '大师'] as const;
export const TIER_MULTIPLIERS = [1.0, 1.2, 1.5, 1.8, 2.2, 2.5] as const;

// 分账比例 (basis points)
export const REVENUE_SHARE = {
  gateFee: 3000,        // 30% 山门
  upgradePool: 2000,   // 20% 升级池
  creator: 4500,       // 45% 创作者
  edge: 2500,          // 25% 编排者
  reviewer: 800,       // 8% 审查员
  publicPool: 800,     // 8% 公共池
  platform: 500,       // 5% 平台
  ambassador: 500,    // 5% 大使
} as const;

// 势位档位边界
export const TIER_BOUNDARIES = [0, 50, 200, 500, 1000, 2000] as const;