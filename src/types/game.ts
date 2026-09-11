/**
 * TikTok Live 3D Tank Battle - Types & Data Models
 */

export type MatchState =
  | 'BOOT'
  | 'WAITING'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'MATCH_END'
  | 'RESULT'
  | 'RESETTING';

export type EvolutionLevel = 1 | 2 | 3 | 4;

export interface GlobalPlayerStat {
  platformUserId: string;
  username: string;
  avatarUrl?: string;
  totalKills: number;
  totalMatches: number; // Berapa kali masuk / main
  totalWins: number;
  totalDamage: number;
  highestEvolution: EvolutionLevel;
  lastPlayedAt: number;
}

export interface PlayerStats {
  totalMatches: number;
  totalKills: number;
  totalDeaths: number;
  wins: number;
  highestEvolution: EvolutionLevel;
  totalGifts: number;
  score: number;
}

export interface Player {
  id: string; // Internal player UUID
  platformUserId: string; // TikTok User ID
  username: string; // Display Name
  avatarUrl?: string; // Optional avatar image
  slotIndex: number; // Slot 0 to 4
  color: string; // Unique visual theme color
  hearts: number; // Current hearts (0..maxHearts)
  maxHearts: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  evolutionLevel: EvolutionLevel;
  score: number;
  status: 'ALIVE' | 'DEAD' | 'AFK';
  joinedAt: number;
  lastActivityAt: number;
  position: { x: number; y: number; angle: number };
  targetAngle: number;
  rotationSpeed: number; // Distinct randomized rotation speed (deg/s)
  rotationDir: number; // 1 = Clockwise, -1 = Counter-Clockwise (Randomized & Independent)
  nextDirChangeTime?: number; // Periodic direction flip or speed shift
  damageBoostUntil?: number; // Expiration timestamp for special damage boost
  damageBoostMultiplier?: number; // Multiplier (e.g. 2.0x)
  isHitFlashing?: boolean;
}

export type ThemeId = 'DESERT' | 'FROZEN_ICE' | 'VOLCANIC';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  groundColor: string;
  gridColor: string;
  skyColor: string;
  accentColor: string;
  obstacleColor: string;
  fogColor: string;
  particles: 'DUST' | 'SNOW' | 'EMBERS';
  description: string;
}

export interface Projectile {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerColor: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  createdAt: number;
  evolutionLevel: EvolutionLevel;
  angle?: number;
  isBoosted?: boolean; // True if fired during damage buff
}

export interface CombatEffect {
  id: string;
  type: 'MUZZLE' | 'HIT' | 'EXPLOSION' | 'EVOLUTION' | 'HEAL' | 'SPAWN';
  position: { x: number; y: number };
  color: string;
  durationMs: number;
  createdAt: number;
  text?: string;
}

export type EventType =
  | 'PLAYER_JOIN'
  | 'PLAYER_ATTACK'
  | 'PLAYER_HEAL'
  | 'PLAYER_SPECIAL'
  | 'PLAYER_REVIVE'
  | 'PLAYER_DAMAGE_BUFF'
  | 'PLAYER_EVOLVE_MANUAL'
  | 'PLAYER_COMMENT'
  | 'PLAYER_LIKE'
  | 'SYSTEM';

export interface InternalGameEvent {
  id: string;
  type: EventType;
  platformUserId: string;
  username: string;
  avatarUrl?: string;
  giftId?: string;
  quantity?: number;
  timestamp: number;
  payload?: Record<string, any>;
}

export interface LogFeedItem {
  id: string;
  timestamp: number;
  type: EventType;
  message: string;
  username: string;
  color?: string;
}

export interface MatchSummary {
  id: string;
  theme: ThemeId;
  durationSec: number;
  startedAt: number;
  endedAt: number;
  winner?: Player;
  ranking: Player[];
}

export interface GameConfig {
  MATCH_DURATION_SEC: number;
  MAX_PLAYERS: number;
  START_COUNTDOWN_SEC: number;
  MAX_HEARTS: number;
  EVOLUTION_KILL_THRESHOLDS: {
    LEVEL_1: number; // 0
    LEVEL_2: number; // 5
    LEVEL_3: number; // 10
    LEVEL_4: number; // 15
  };
  ATTACK_COOLDOWN_MS: number;
  HEAL_COOLDOWN_MS: number;
  HEAL_AMOUNT: number;
  DAMAGE_BUFF_DURATION_SEC: number;
  AFK_TIMEOUT_MS: number;
  PROJECTILE_SPEED: number;
  PROJECTILE_RANGE: number;
  GIFT_MAP: {
    JOIN_GIFT: string; // 10 Coins (Panda / Crown)
    ATTACK_GIFT: string; // 1 Coin (Rose / Mawar)
    HEAL_GIFT: string; // 30 Coins (Doughnut / Donat)
    EVOLVE_GIFT: string; // 99 Coins (Cap & Mustache / Topi Kumis)
    DAMAGE_BUFF_GIFT: string; // 15 Coins (Lightning / Petir / GG / Kacamata)
    REVIVE_GIFT: string; // Dragon / Universe
    SPECIAL_GIFT: string;
  };
  AUTO_BOT_MODE: boolean;
}

export interface FullGameState {
  matchId: string;
  state: MatchState;
  timerSec: number;
  theme: ThemeId;
  players: Player[];
  projectiles: Projectile[];
  effects: CombatEffect[];
  leaderboard: Player[];
  globalLeaderboard: GlobalPlayerStat[];
  feed: LogFeedItem[];
  winner?: Player;
  config: GameConfig;
  connectedTikTokUser?: string;
  isTikTokConnected: boolean;
  lastUpdate: number;
}
