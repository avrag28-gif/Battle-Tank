/**
 * TikTok Live 3D Tank Battle - Authoritative Server Game Engine
 * Handles 60FPS physics, combat, state machine, targeting, evolutions, auto theme rotations, and rate limiting.
 */

import { ARENA_THEMES, DEFAULT_GAME_CONFIG, EVOLUTION_SPECS, PLAYER_SLOT_COLORS } from '../config/gameConfig';
import {
  CombatEffect,
  EvolutionLevel,
  FullGameState,
  GameConfig,
  GlobalPlayerStat,
  InternalGameEvent,
  LogFeedItem,
  MatchState,
  Player,
  Projectile,
  ThemeId,
} from '../types/game';

// 4 Corner Slot Coordinates forming a PERFECT EQUILATERAL SQUARE (8.4 x 8.4 units)
const SLOT_SPAWN_POSITIONS = [
  { x: -4.2, y: 4.2, angle: 135 },    // Slot 0 (Red: Bottom Left, facing center dx=4.2, dy=-4.2)
  { x: 4.2, y: -4.2, angle: -45 },   // Slot 1 (Green: Top Right, facing center dx=-4.2, dy=4.2)
  { x: -4.2, y: -4.2, angle: 45 },    // Slot 2 (Blue: Top Left, facing center dx=4.2, dy=4.2)
  { x: 4.2, y: 4.2, angle: -135 },   // Slot 3 (Yellow: Bottom Right, facing center dx=-4.2, dy=-4.2)
];

export class GameEngine {
  private config: GameConfig;
  private matchId: string;
  private state: MatchState = 'WAITING';
  private timerSec: number = 0;
  private theme: ThemeId = 'DESERT';
  private players: Map<string, Player> = new Map(); // Key: platformUserId
  private globalStats: Map<string, GlobalPlayerStat> = new Map(); // Key: platformUserId
  private projectiles: Projectile[] = [];
  private effects: CombatEffect[] = [];
  private feed: LogFeedItem[] = [];
  private winner?: Player;

  private connectedTikTokUser?: string;
  private isTikTokConnected: boolean = false;

  private eventQueue: InternalGameEvent[] = [];
  private lastAttackTime: Map<string, number> = new Map();
  private lastHealTime: Map<string, number> = new Map();

  private loopInterval?: NodeJS.Timeout;
  private botInterval?: NodeJS.Timeout;
  private listeners: Set<(state: FullGameState) => void> = new Set();

  private themeHistory: ThemeId[] = ['DESERT'];

  constructor(customConfig?: Partial<GameConfig>) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    this.matchId = `MATCH_${Date.now()}`;
    this.timerSec = 0;
    this.state = 'WAITING';
    this.theme = this.getRandomNewTheme();
    this.seedInitialGlobalStats();
  }

  private seedInitialGlobalStats() {
    const defaultSeeds: GlobalPlayerStat[] = [
      {
        platformUserId: 'BOT_0_Garuda_Red',
        username: 'Garuda_Red',
        totalKills: 34,
        totalMatches: 14,
        totalWins: 8,
        totalDamage: 68,
        highestEvolution: 4,
        lastPlayedAt: Date.now() - 1800000,
      },
      {
        platformUserId: 'BOT_1_Titan_Green',
        username: 'Titan_Green',
        totalKills: 26,
        totalMatches: 12,
        totalWins: 5,
        totalDamage: 52,
        highestEvolution: 3,
        lastPlayedAt: Date.now() - 3600000,
      },
      {
        platformUserId: 'BOT_2_Viper_Blue',
        username: 'Viper_Blue',
        totalKills: 21,
        totalMatches: 11,
        totalWins: 4,
        totalDamage: 43,
        highestEvolution: 3,
        lastPlayedAt: Date.now() - 5400000,
      },
      {
        platformUserId: 'BOT_3_Apex_Yellow',
        username: 'Apex_Yellow',
        totalKills: 17,
        totalMatches: 9,
        totalWins: 3,
        totalDamage: 35,
        highestEvolution: 2,
        lastPlayedAt: Date.now() - 7200000,
      },
      {
        platformUserId: 'user_dragon_king',
        username: 'Dragon_Master',
        totalKills: 14,
        totalMatches: 7,
        totalWins: 2,
        totalDamage: 29,
        highestEvolution: 2,
        lastPlayedAt: Date.now() - 9000000,
      },
    ];

    for (const seed of defaultSeeds) {
      this.globalStats.set(seed.platformUserId, seed);
    }
  }

  public ensureFourPlayers() {
    const defaultBots = [
      { username: 'Garuda_Red', slot: 0 },
      { username: 'Titan_Green', slot: 1 },
      { username: 'Viper_Blue', slot: 2 },
      { username: 'Apex_Yellow', slot: 3 },
    ];

    for (const b of defaultBots) {
      const alreadyOccupied = Array.from(this.players.values()).some((p) => p.slotIndex === b.slot);
      if (!alreadyOccupied) {
        const spawnPos = SLOT_SPAWN_POSITIONS[b.slot];
        const botId = `BOT_${b.slot}_${b.username}`;
        this.players.set(botId, {
          id: `P_${botId}`,
          platformUserId: botId,
          username: b.username,
          slotIndex: b.slot,
          color: PLAYER_SLOT_COLORS[b.slot],
          hearts: this.config.MAX_HEARTS,
          maxHearts: this.config.MAX_HEARTS,
          kills: 0,
          deaths: 0,
          damageDealt: 0,
          evolutionLevel: 1,
          score: 0,
          status: 'ALIVE',
          joinedAt: Date.now(),
          lastActivityAt: Date.now(),
          position: { x: spawnPos.x, y: spawnPos.y, angle: spawnPos.angle },
          targetAngle: spawnPos.angle,
          rotationSpeed: 40 + Math.floor(Math.random() * 45), // 40..85 deg/sec
          rotationDir: Math.random() < 0.5 ? 1 : -1, // Random rotation direction
          nextDirChangeTime: Date.now() + Math.floor(6000 + Math.random() * 8000),
          damageBoostUntil: 0,
          damageBoostMultiplier: 1.0,
        });

        // Register in global stats
        if (!this.globalStats.has(botId)) {
          this.globalStats.set(botId, {
            platformUserId: botId,
            username: b.username,
            totalKills: 0,
            totalMatches: 0,
            totalWins: 0,
            totalDamage: 0,
            highestEvolution: 1,
            lastPlayedAt: Date.now(),
          });
        }
      }
    }

    if (this.state === 'WAITING' && this.players.size >= 2) {
      this.startCountdown();
    }
  }

  public start() {
    if (this.loopInterval) return;

    // Run game tick at 30Hz for smooth multiplayer state updates
    const TICK_RATE_MS = 1000 / 30;
    this.loopInterval = setInterval(() => {
      this.tick(TICK_RATE_MS / 1000);
    }, TICK_RATE_MS);

    this.addFeedItem('SYSTEM', '🎮 Game Engine started. Waiting for players via TikTok gifts...');
  }

  public stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = undefined;
    }
    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = undefined;
    }
  }

  public subscribe(callback: (state: FullGameState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getFullState());
    return () => this.listeners.delete(callback);
  }

  private notifyStateChange() {
    const fullState = this.getFullState();
    for (const listener of this.listeners) {
      try {
        listener(fullState);
      } catch (err) {
        console.error('Error notifying game state listener:', err);
      }
    }
  }

  public getFullState(): FullGameState {
    const playerList = Array.from(this.players.values()).sort((a, b) => a.slotIndex - b.slotIndex);
    const leaderboard = [...playerList].sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.hearts !== a.hearts) return b.hearts - a.hearts;
      if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
      return b.evolutionLevel - a.evolutionLevel;
    });

    const globalLeaderboard = Array.from(this.globalStats.values())
      .sort((a, b) => {
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches;
        return b.totalDamage - a.totalDamage;
      })
      .slice(0, 10);

    return {
      matchId: this.matchId,
      state: this.state,
      timerSec: Math.max(0, Math.ceil(this.timerSec)),
      theme: this.theme,
      players: playerList,
      projectiles: this.projectiles,
      effects: this.effects,
      leaderboard,
      globalLeaderboard,
      feed: this.feed.slice(-15), // Last 15 feed items
      winner: this.winner,
      config: this.config,
      connectedTikTokUser: this.connectedTikTokUser,
      isTikTokConnected: this.isTikTokConnected,
      lastUpdate: Date.now(),
    };
  }

  // --- PLATFORM EVENT HANDLER ---
  public queueEvent(event: InternalGameEvent) {
    // Basic deduplication / priority insertion
    this.eventQueue.push(event);
  }

  private processEventQueue() {
    if (this.eventQueue.length === 0) return;

    // Process up to 10 events per tick with priority sorting
    this.eventQueue.sort((a, b) => {
      const priorityWeight = (type: string) => {
        if (type === 'PLAYER_REVIVE' || type === 'PLAYER_SPECIAL') return 3;
        if (type === 'PLAYER_JOIN' || type === 'PLAYER_HEAL') return 2;
        if (type === 'PLAYER_ATTACK') return 1;
        return 0;
      };
      return priorityWeight(b.type) - priorityWeight(a.type);
    });

    const batch = this.eventQueue.splice(0, 10);
    for (const event of batch) {
      this.handleSingleEvent(event);
    }
  }

  private handleSingleEvent(event: InternalGameEvent) {
    const { type, platformUserId, username, avatarUrl, quantity } = event;

    switch (type) {
      case 'PLAYER_JOIN': {
        this.handlePlayerJoin(platformUserId, username, avatarUrl);
        break;
      }
      case 'PLAYER_ATTACK': {
        this.handlePlayerAttack(platformUserId, quantity || 1);
        break;
      }
      case 'PLAYER_HEAL': {
        this.handlePlayerHeal(platformUserId);
        break;
      }
      case 'PLAYER_SPECIAL': {
        this.handlePlayerSpecial(platformUserId);
        break;
      }
      case 'PLAYER_DAMAGE_BUFF': {
        this.handlePlayerDamageBuff(platformUserId);
        break;
      }
      case 'PLAYER_EVOLVE_MANUAL': {
        this.handlePlayerManualEvolve(platformUserId);
        break;
      }
      case 'PLAYER_REVIVE': {
        this.handlePlayerRevive(platformUserId);
        break;
      }
      case 'PLAYER_COMMENT': {
        this.addFeedItem('PLAYER_COMMENT', `💬 ${username}: ${event.payload?.comment || ''}`, username);
        break;
      }
      case 'PLAYER_LIKE': {
        this.addFeedItem('PLAYER_LIKE', `❤️ ${username} liked the live stream!`, username);
        break;
      }
    }
  }

  // --- PLAYER ACTIONS ---

  private handlePlayerJoin(platformUserId: string, username: string, avatarUrl?: string) {
    // Check if player already exists
    if (this.players.has(platformUserId)) {
      const existing = this.players.get(platformUserId)!;
      if (existing.status === 'DEAD') {
        this.addFeedItem('SYSTEM', `⚠️ @${username} is already in match but eliminated! Send Revive Gift to respawn.`);
      } else {
        this.addFeedItem('SYSTEM', `ℹ️ @${username} is already active in Slot #${existing.slotIndex + 1}!`);
      }
      return;
    }

    // Check if slots are full (Max 4) - replace a BOT if full
    if (this.players.size >= this.config.MAX_PLAYERS) {
      const botPlayer = Array.from(this.players.values()).find((p) => p.platformUserId.startsWith('BOT_'));
      if (botPlayer) {
        this.players.delete(botPlayer.platformUserId);
      } else {
        this.addFeedItem('SYSTEM', `🚫 ARENA FULL! @${username} tried to join, but all 4 slots are occupied!`);
        return;
      }
    }

    // Assign free slot index
    const occupiedSlots = new Set(Array.from(this.players.values()).map((p) => p.slotIndex));
    let assignedSlot = 0;
    for (let i = 0; i < this.config.MAX_PLAYERS; i++) {
      if (!occupiedSlots.has(i)) {
        assignedSlot = i;
        break;
      }
    }

    const spawnPos = SLOT_SPAWN_POSITIONS[assignedSlot];
    const newPlayer: Player = {
      id: `P_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      platformUserId,
      username,
      avatarUrl,
      slotIndex: assignedSlot,
      color: PLAYER_SLOT_COLORS[assignedSlot],
      hearts: this.config.MAX_HEARTS,
      maxHearts: this.config.MAX_HEARTS,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      evolutionLevel: 1,
      score: 0,
      status: 'ALIVE',
      joinedAt: Date.now(),
      lastActivityAt: Date.now(),
      position: { x: spawnPos.x, y: spawnPos.y, angle: spawnPos.angle },
      targetAngle: spawnPos.angle,
      rotationSpeed: 40 + Math.floor(Math.random() * 45), // 40..85 deg/sec
      rotationDir: Math.random() < 0.5 ? 1 : -1, // Independent randomized direction
      nextDirChangeTime: Date.now() + Math.floor(6000 + Math.random() * 8000),
      damageBoostUntil: 0,
      damageBoostMultiplier: 1.0,
    };

    this.players.set(platformUserId, newPlayer);

    // Ensure player is registered in global stats
    if (!this.globalStats.has(platformUserId)) {
      this.globalStats.set(platformUserId, {
        platformUserId,
        username,
        avatarUrl,
        totalKills: 0,
        totalMatches: 0,
        totalWins: 0,
        totalDamage: 0,
        highestEvolution: 1,
        lastPlayedAt: Date.now(),
      });
    } else {
      const gStat = this.globalStats.get(platformUserId)!;
      gStat.username = username;
      if (avatarUrl) gStat.avatarUrl = avatarUrl;
      gStat.lastPlayedAt = Date.now();
    }

    // Spawn effect
    this.addEffect({
      id: `SPAWN_${Date.now()}_${Math.random()}`,
      type: 'SPAWN',
      position: { x: spawnPos.x, y: spawnPos.y },
      color: newPlayer.color,
      durationMs: 1200,
      createdAt: Date.now(),
      text: 'JOINED!',
    });

    this.addFeedItem('PLAYER_JOIN', `🎁 @${username} JOINED THE ARENA! (Slot #${assignedSlot + 1})`, username, newPlayer.color);

    // Auto-start match if countdown hasn't started and we have >= 2 players
    if (this.state === 'WAITING' && this.players.size >= 2) {
      this.startCountdown();
    }
  }

  private handlePlayerAttack(platformUserId: string, quantity = 1) {
    const player = this.players.get(platformUserId);
    if (!player || player.status !== 'ALIVE') return;

    const now = Date.now();
    player.lastActivityAt = now;
    this.lastAttackTime.set(platformUserId, now);

    const isBoosted = Boolean(player.damageBoostUntil && player.damageBoostUntil > now);
    const evoSpec = EVOLUTION_SPECS[player.evolutionLevel] || EVOLUTION_SPECS[1];
    const baseDamage = evoSpec.damage;
    const finalDamage = isBoosted ? baseDamage * (player.damageBoostMultiplier || 2.0) : baseDamage;
    const speed = this.config.PROJECTILE_SPEED;

    // Support Rapid Bullet Spam based on gift quantity (1 to 10 bullets per burst)
    const repeatCount = Math.max(1, Math.min(quantity || 1, 8));

    for (let r = 0; r < repeatCount; r++) {
      const angleDeg = player.position.angle;
      const baseAngleRad = (angleDeg * Math.PI) / 180;
      const distStagger = r * 0.35; // Staggered stream for rapid multi-bullet barrage

      // LEVEL 1: 1 Barrel -> 1 Projectile straight
      if (player.evolutionLevel === 1) {
        const muzzleX = player.position.x + Math.sin(baseAngleRad) * (1.45 + distStagger);
        const muzzleY = player.position.y + Math.cos(baseAngleRad) * (1.45 + distStagger);
        const vx = Math.sin(baseAngleRad) * speed;
        const vy = Math.cos(baseAngleRad) * speed;

        this.projectiles.push({
          id: `PROJ_${Date.now()}_${Math.random()}_${r}`,
          ownerId: player.platformUserId,
          ownerUsername: player.username,
          ownerColor: player.color,
          position: { x: muzzleX, y: muzzleY },
          velocity: { x: vx, y: vy },
          damage: finalDamage,
          createdAt: Date.now() + r * 20,
          evolutionLevel: player.evolutionLevel,
          angle: angleDeg,
          isBoosted,
        });

        this.addEffect({
          id: `MUZZLE_${Date.now()}_${Math.random()}`,
          type: 'MUZZLE',
          position: { x: muzzleX, y: muzzleY },
          color: isBoosted ? '#ffd000' : player.color,
          durationMs: 250,
          createdAt: Date.now(),
        });
      }
      // LEVEL 2: 2 Barrels -> 2 Twin Parallel Projectiles
      else if (player.evolutionLevel === 2) {
        const offsets = [-0.24, 0.24];
        const cosA = Math.cos(baseAngleRad);
        const sinA = Math.sin(baseAngleRad);

        for (const latOffset of offsets) {
          const muzzleX = player.position.x + sinA * (1.55 + distStagger) + cosA * latOffset;
          const muzzleY = player.position.y + cosA * (1.55 + distStagger) - sinA * latOffset;
          const vx = sinA * speed;
          const vy = cosA * speed;

          this.projectiles.push({
            id: `PROJ_${Date.now()}_${Math.random()}_${r}`,
            ownerId: player.platformUserId,
            ownerUsername: player.username,
            ownerColor: player.color,
            position: { x: muzzleX, y: muzzleY },
            velocity: { x: vx, y: vy },
            damage: finalDamage,
            createdAt: Date.now() + r * 20,
            evolutionLevel: player.evolutionLevel,
            angle: angleDeg,
            isBoosted,
          });

          this.addEffect({
            id: `MUZZLE_${Date.now()}_${Math.random()}`,
            type: 'MUZZLE',
            position: { x: muzzleX, y: muzzleY },
            color: isBoosted ? '#ffd000' : player.color,
            durationMs: 250,
            createdAt: Date.now(),
          });
        }
      }
      // LEVEL 3: 3 Barrels -> 3 Spread Projectiles (-12°, 0°, +12°)
      else if (player.evolutionLevel === 3) {
        const spreadAngles = [baseAngleRad - 0.21, baseAngleRad, baseAngleRad + 0.21];

        for (const aRad of spreadAngles) {
          const muzzleX = player.position.x + Math.sin(aRad) * (1.65 + distStagger);
          const muzzleY = player.position.y + Math.cos(aRad) * (1.65 + distStagger);
          const vx = Math.sin(aRad) * speed;
          const vy = Math.cos(aRad) * speed;

          this.projectiles.push({
            id: `PROJ_${Date.now()}_${Math.random()}_${r}`,
            ownerId: player.platformUserId,
            ownerUsername: player.username,
            ownerColor: player.color,
            position: { x: muzzleX, y: muzzleY },
            velocity: { x: vx, y: vy },
            damage: finalDamage,
            createdAt: Date.now() + r * 20,
            evolutionLevel: player.evolutionLevel,
            angle: (aRad * 180) / Math.PI,
            isBoosted,
          });

          this.addEffect({
            id: `MUZZLE_${Date.now()}_${Math.random()}`,
            type: 'MUZZLE',
            position: { x: muzzleX, y: muzzleY },
            color: isBoosted ? '#ffd000' : player.color,
            durationMs: 250,
            createdAt: Date.now(),
          });
        }
      }
      // LEVEL 4: 4 Barrels -> 4 Quad Stream Barrage (-18°, -6°, +6°, +18°)
      else {
        const quadAngles = [
          baseAngleRad - 0.31,
          baseAngleRad - 0.10,
          baseAngleRad + 0.10,
          baseAngleRad + 0.31,
        ];

        for (const aRad of quadAngles) {
          const muzzleX = player.position.x + Math.sin(aRad) * (1.8 + distStagger);
          const muzzleY = player.position.y + Math.cos(aRad) * (1.8 + distStagger);
          const vx = Math.sin(aRad) * speed;
          const vy = Math.cos(aRad) * speed;

          this.projectiles.push({
            id: `PROJ_${Date.now()}_${Math.random()}_${r}`,
            ownerId: player.platformUserId,
            ownerUsername: player.username,
            ownerColor: player.color,
            position: { x: muzzleX, y: muzzleY },
            velocity: { x: vx, y: vy },
            damage: finalDamage,
            createdAt: Date.now() + r * 20,
            evolutionLevel: player.evolutionLevel,
            angle: (aRad * 180) / Math.PI,
            isBoosted,
          });

          this.addEffect({
            id: `MUZZLE_${Date.now()}_${Math.random()}`,
            type: 'MUZZLE',
            position: { x: muzzleX, y: muzzleY },
            color: isBoosted ? '#ffd000' : '#ff007f',
            durationMs: 250,
            createdAt: Date.now(),
          });
        }
      }
    }

    const boostTag = isBoosted ? ' ⚡[2X DMG]' : '';
    const spamTag = repeatCount > 1 ? ` (x${repeatCount} BARRAGE)` : '';
    this.addFeedItem('PLAYER_ATTACK', `🌹 @${player.username} MENEMBAK${boostTag}${spamTag}!`, player.username, player.color);
  }

  private handlePlayerDamageBuff(platformUserId: string) {
    const player = this.players.get(platformUserId);
    if (!player || player.status !== 'ALIVE') return;

    const durationSec = this.config.DAMAGE_BUFF_DURATION_SEC || 10;
    player.damageBoostUntil = Date.now() + durationSec * 1000;
    player.damageBoostMultiplier = 2.0;

    this.addEffect({
      id: `BUFF_${Date.now()}_${Math.random()}`,
      type: 'EVOLUTION',
      position: { x: player.position.x, y: player.position.y },
      color: '#ffd000',
      durationMs: 1800,
      createdAt: Date.now(),
      text: `⚡ 2X DAMAGE BUFF (${durationSec}s)!`,
    });

    this.addFeedItem(
      'PLAYER_DAMAGE_BUFF',
      `⚡ @${player.username} MENGAKTIFKAN 2X DAMAGE BUFF (${durationSec} DETIK)!`,
      player.username,
      '#ffd000'
    );
  }

  private handlePlayerManualEvolve(platformUserId: string) {
    const player = this.players.get(platformUserId);
    if (!player || player.status !== 'ALIVE') return;

    if (player.evolutionLevel < 4) {
      player.evolutionLevel = (player.evolutionLevel + 1) as EvolutionLevel;
    }

    const spec = EVOLUTION_SPECS[player.evolutionLevel];

    this.addEffect({
      id: `EVO_MANUAL_${Date.now()}_${Math.random()}`,
      type: 'EVOLUTION',
      position: { x: player.position.x, y: player.position.y },
      color: spec.bodyColorBonus,
      durationMs: 2500,
      createdAt: Date.now(),
      text: `🎩 TOPI KUMIS: ${spec.title}!`,
    });

    this.addFeedItem(
      'PLAYER_EVOLVE_MANUAL',
      `🎩 @${player.username} EVOLUSI MANUAL DENGAN TOPI & KUMIS! (${spec.title})`,
      player.username,
      player.color
    );
  }

  private handlePlayerHeal(platformUserId: string) {
    const player = this.players.get(platformUserId);
    if (!player || player.status !== 'ALIVE') return;

    const now = Date.now();
    const lastHeal = this.lastHealTime.get(platformUserId) || 0;
    if (now - lastHeal < this.config.HEAL_COOLDOWN_MS) {
      return;
    }
    this.lastHealTime.set(platformUserId, now);

    if (player.hearts >= player.maxHearts) {
      this.addFeedItem('SYSTEM', `❤️ @${player.username} is already at full HEARTS!`);
      return;
    }

    player.hearts = Math.min(player.maxHearts, player.hearts + this.config.HEAL_AMOUNT);

    this.addEffect({
      id: `HEAL_${Date.now()}_${Math.random()}`,
      type: 'HEAL',
      position: { x: player.position.x, y: player.position.y },
      color: '#00ff88',
      durationMs: 1000,
      createdAt: Date.now(),
      text: `+${this.config.HEAL_AMOUNT} ❤️`,
    });

    this.addFeedItem('PLAYER_HEAL', `🍩 @${player.username} ISI DARAH! (${player.hearts}/${player.maxHearts} ❤️)`, player.username, '#00ff88');
  }

  private handlePlayerSpecial(platformUserId: string) {
    const player = this.players.get(platformUserId);
    if (!player || player.status !== 'ALIVE') return;

    // Fire 3 simultaneous projectiles in 3 angles
    const baseAngle = (player.position.angle * Math.PI) / 180;
    const angles = [baseAngle - 0.22, baseAngle, baseAngle + 0.22];

    for (const angleRad of angles) {
      const speed = this.config.PROJECTILE_SPEED * 1.1;
      const barrelOffset = 1.45;
      const muzzleX = player.position.x + Math.sin(angleRad) * barrelOffset;
      const muzzleY = player.position.y + Math.cos(angleRad) * barrelOffset;
      const angleDeg = (angleRad * 180) / Math.PI;

      this.projectiles.push({
        id: `PROJ_SPEC_${Date.now()}_${Math.random()}`,
        ownerId: player.platformUserId,
        ownerUsername: player.username,
        ownerColor: player.color,
        position: { x: muzzleX, y: muzzleY },
        velocity: { x: Math.sin(angleRad) * speed, y: Math.cos(angleRad) * speed },
        damage: 2.0,
        createdAt: Date.now(),
        evolutionLevel: player.evolutionLevel,
        angle: angleDeg,
      });
    }

    this.addEffect({
      id: `SPEC_${Date.now()}_${Math.random()}`,
      type: 'EVOLUTION',
      position: { x: player.position.x, y: player.position.y },
      color: '#ff007f',
      durationMs: 1200,
      createdAt: Date.now(),
      text: 'SPECIAL BARRAGE!',
    });

    this.addFeedItem('PLAYER_SPECIAL', `⚡ @${player.username} UNLEASHED SPECIAL TRIPLE BARRAGE!`, player.username, player.color);
  }

  private handlePlayerRevive(platformUserId: string) {
    const player = this.players.get(platformUserId);
    if (!player) return;

    if (player.status === 'ALIVE') {
      // If already alive, convert to heal + shield
      this.handlePlayerHeal(platformUserId);
      return;
    }

    player.status = 'ALIVE';
    player.hearts = player.maxHearts;

    this.addEffect({
      id: `REVIVE_${Date.now()}_${Math.random()}`,
      type: 'SPAWN',
      position: { x: player.position.x, y: player.position.y },
      color: '#ffd700',
      durationMs: 1500,
      createdAt: Date.now(),
      text: 'REVIVED!',
    });

    this.addFeedItem('PLAYER_REVIVE', `🔥 @${player.username} TELAH DIHIDUPKAN KEMBALI!`, player.username, '#ffd700');
  }

  // --- STATE MACHINE & PHYSICS TICK ---

  private startCountdown() {
    this.state = 'COUNTDOWN';
    this.timerSec = this.config.START_COUNTDOWN_SEC;
    this.addFeedItem('SYSTEM', `⏳ BATTLE COUNTDOWN STARTED! (${this.config.START_COUNTDOWN_SEC}s)`);
    this.notifyStateChange();
  }

  private tick(dt: number) {
    // Process queued gifts/comments
    this.processEventQueue();

    // Clean up expired effects (>1.5s)
    const now = Date.now();
    this.effects = this.effects.filter((e) => now - e.createdAt < e.durationMs);

    // Independent Randomized Rotation for Each Tank (Can rotate opposite directions, different speeds, and change periodically)
    for (const player of this.players.values()) {
      if (player.status === 'ALIVE') {
        if (!player.rotationSpeed) player.rotationSpeed = 40 + Math.floor(Math.random() * 45);
        if (!player.rotationDir) player.rotationDir = Math.random() < 0.5 ? 1 : -1;
        if (!player.nextDirChangeTime) player.nextDirChangeTime = now + (6000 + Math.random() * 8000);

        // Periodically randomize speed or flip direction independently
        if (now > player.nextDirChangeTime) {
          if (Math.random() < 0.6) {
            player.rotationDir = (player.rotationDir === 1 ? -1 : 1);
          }
          player.rotationSpeed = 38 + Math.floor(Math.random() * 45); // 38..83 deg/sec
          player.nextDirChangeTime = now + (6000 + Math.random() * 10000);
        }

        // Advance angle smoothly
        player.position.angle = (player.position.angle + dt * player.rotationSpeed * player.rotationDir + 360) % 360;
        player.targetAngle = player.position.angle;
      }
    }

    switch (this.state) {
      case 'WAITING': {
        // If 2+ players present, trigger countdown automatically
        if (this.players.size >= 2) {
          this.startCountdown();
        }
        break;
      }

      case 'COUNTDOWN': {
        this.timerSec -= dt;
        if (this.timerSec <= 0) {
          this.state = 'PLAYING';
          this.timerSec = this.config.MATCH_DURATION_SEC;
          this.addFeedItem('SYSTEM', '⚔️ BATTLE STARTED! FIRE AT WILL!');
        }
        break;
      }

      case 'PLAYING': {
        this.timerSec -= dt;

        // Update Projectiles & Collisions
        this.updateProjectilesAndCollisions(dt);

        // Check if only 1 player remains alive after active combat
        const alivePlayers = Array.from(this.players.values()).filter((p) => p.status === 'ALIVE');
        if (this.players.size >= 2 && alivePlayers.length === 1 && this.timerSec < this.config.MATCH_DURATION_SEC - 10) {
          this.addFeedItem('SYSTEM', '🏁 LAST TANK STANDING! Match Finished!');
          this.finishMatch();
        } else if (this.timerSec <= 0) {
          this.finishMatch();
        }
        break;
      }

      case 'MATCH_END': {
        this.timerSec -= dt;
        if (this.timerSec <= 0) {
          this.state = 'RESULT';
          this.timerSec = 8; // 8 sec result celebration screen
        }
        break;
      }

      case 'RESULT': {
        this.timerSec -= dt;
        if (this.timerSec <= 0) {
          this.resetMatch();
        }
        break;
      }

      case 'RESETTING': {
        break;
      }
    }

    this.notifyStateChange();
  }

  private updateProjectilesAndCollisions(dt: number) {
    const nextProjectiles: Projectile[] = [];

    for (const proj of this.projectiles) {
      // Advance position
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;

      // Check boundary limits
      if (Math.abs(proj.position.x) > 12 || Math.abs(proj.position.y) > 9) {
        continue; // Despawn out of bounds
      }

      let hit = false;

      // Collision check against alive enemy tanks
      for (const target of this.players.values()) {
        if (target.platformUserId === proj.ownerId || target.status !== 'ALIVE') continue;

        const dx = target.position.x - proj.position.x;
        const dy = target.position.y - proj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Tank hit radius ~ 1.2 units
        if (dist < 1.3) {
          hit = true;

          // Apply damage
          const attacker = this.players.get(proj.ownerId);
          if (attacker) {
            attacker.damageDealt += proj.damage;
          }

          target.hearts = Math.max(0, target.hearts - proj.damage);
          target.isHitFlashing = true;
          setTimeout(() => {
            target.isHitFlashing = false;
          }, 300);

          // Hit visual effect
          this.addEffect({
            id: `HIT_${Date.now()}_${Math.random()}`,
            type: 'HIT',
            position: { x: target.position.x, y: target.position.y },
            color: '#ff3b30',
            durationMs: 500,
            createdAt: Date.now(),
            text: `-${proj.damage} ❤️`,
          });

          // Check if target died
          if (target.hearts <= 0) {
            target.status = 'DEAD';
            target.deaths += 1;

            this.addEffect({
              id: `EXPL_${Date.now()}_${Math.random()}`,
              type: 'EXPLOSION',
              position: { x: target.position.x, y: target.position.y },
              color: '#ff8c00',
              durationMs: 1200,
              createdAt: Date.now(),
              text: 'ELIMINATED!',
            });

            if (attacker) {
              attacker.kills += 1;
              attacker.score += 150;

              // Real-time update to global stat kills
              const gStat = this.globalStats.get(attacker.platformUserId);
              if (gStat) {
                gStat.totalKills += 1;
                gStat.totalDamage += proj.damage;
                gStat.highestEvolution = Math.max(gStat.highestEvolution, attacker.evolutionLevel) as EvolutionLevel;
                gStat.lastPlayedAt = Date.now();
              }

              this.addFeedItem(
                'SYSTEM',
                `💀 @${attacker.username} KILLED @${target.username}! (${attacker.kills} KILLS)`,
                attacker.username,
                attacker.color
              );

              // Check for Tank Evolution
              this.checkAndTriggerEvolution(attacker);
            }
          }

          break; // Projectile destroyed on hit
        }
      }

      if (!hit) {
        nextProjectiles.push(proj);
      }
    }

    this.projectiles = nextProjectiles;
  }

  private checkAndTriggerEvolution(player: Player) {
    const k = player.kills;
    let newLevel: EvolutionLevel = 1;

    if (k >= this.config.EVOLUTION_KILL_THRESHOLDS.LEVEL_4) newLevel = 4;
    else if (k >= this.config.EVOLUTION_KILL_THRESHOLDS.LEVEL_3) newLevel = 3;
    else if (k >= this.config.EVOLUTION_KILL_THRESHOLDS.LEVEL_2) newLevel = 2;

    if (newLevel > player.evolutionLevel) {
      player.evolutionLevel = newLevel;
      const spec = EVOLUTION_SPECS[newLevel];

      this.addEffect({
        id: `EVO_${Date.now()}_${Math.random()}`,
        type: 'EVOLUTION',
        position: { x: player.position.x, y: player.position.y },
        color: spec.bodyColorBonus,
        durationMs: 2000,
        createdAt: Date.now(),
        text: `EVOLVED TO ${spec.title}!`,
      });

      this.addFeedItem(
        'SYSTEM',
        `🔥 SPECTACLE! @${player.username} EVOLVED TO ${spec.title}!`,
        player.username,
        player.color
      );
    }
  }

  private finishMatch() {
    this.state = 'MATCH_END';
    this.timerSec = 5; // 5 sec buffer before victory screen

    // Calculate Winner with tie-breaker order
    const ranking = Array.from(this.players.values()).sort((a, b) => {
      // 1. Kills
      if (b.kills !== a.kills) return b.kills - a.kills;
      // 2. Remaining Hearts
      if (b.hearts !== a.hearts) return b.hearts - a.hearts;
      // 3. Damage Dealt
      if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
      // 4. Evolution level
      return b.evolutionLevel - a.evolutionLevel;
    });

    this.winner = ranking[0];

    // Update Global Lifetime Stats for all participants in this match
    for (const player of this.players.values()) {
      const isWinner = this.winner && this.winner.platformUserId === player.platformUserId;
      const existing = this.globalStats.get(player.platformUserId);
      if (existing) {
        existing.username = player.username;
        if (player.avatarUrl) existing.avatarUrl = player.avatarUrl;
        existing.totalMatches += 1;
        if (isWinner) existing.totalWins += 1;
        existing.totalDamage += player.damageDealt;
        existing.highestEvolution = Math.max(existing.highestEvolution, player.evolutionLevel) as EvolutionLevel;
        existing.lastPlayedAt = Date.now();
      } else {
        this.globalStats.set(player.platformUserId, {
          platformUserId: player.platformUserId,
          username: player.username,
          avatarUrl: player.avatarUrl,
          totalKills: player.kills,
          totalMatches: 1,
          totalWins: isWinner ? 1 : 0,
          totalDamage: player.damageDealt,
          highestEvolution: player.evolutionLevel,
          lastPlayedAt: Date.now(),
        });
      }
    }

    if (this.winner) {
      this.winner.score += 500;
      this.addFeedItem(
        'SYSTEM',
        `🏆 MATCH SELESAI! JUARA: @${this.winner.username} (${this.winner.kills} Kills & ${this.winner.hearts} Hearts)!`,
        this.winner.username,
        this.winner.color
      );
    } else {
      this.addFeedItem('SYSTEM', '🏁 MATCH SELESAI! Tidak ada pemenang aktif.');
    }
  }

  private getRandomNewTheme(): ThemeId {
    const allThemes: ThemeId[] = ['DESERT', 'FROZEN_ICE', 'VOLCANIC'];
    const lastTheme = this.themeHistory[this.themeHistory.length - 1];
    const available = allThemes.filter((t) => t !== lastTheme);
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.themeHistory.push(chosen);
    return chosen;
  }

  public resetMatch() {
    this.state = 'RESETTING';
    this.matchId = `MATCH_${Date.now()}`;
    this.projectiles = [];
    this.effects = [];
    this.winner = undefined;

    // Remove all tanks from arena until new players join!
    this.players.clear();

    // Pick new theme
    this.theme = this.getRandomNewTheme();

    this.state = 'WAITING';
    this.timerSec = 0;

    const themeInfo = ARENA_THEMES[this.theme];
    this.addFeedItem('SYSTEM', `🏜️ ARENA DIRESET! Tank dibersihkan. Tema Baru: ${themeInfo.name}`);
    this.addFeedItem('SYSTEM', '⏳ Kirim 🐼 Panda (10 Koin) untuk masuk ke arena (Maks 4 Tank)!');

    this.notifyStateChange();
  }

  // --- DEV & AUTO BOT MODES ---

  public toggleAutoBotMode(enable?: boolean) {
    const nextState = enable !== undefined ? enable : !this.config.AUTO_BOT_MODE;
    this.config.AUTO_BOT_MODE = nextState;

    if (this.config.AUTO_BOT_MODE) {
      this.addFeedItem('SYSTEM', '🤖 Auto Bot Mode ENABLED! Simulating active TikTok audience...');
      this.startBotSimulation();
    } else {
      this.addFeedItem('SYSTEM', '🤖 Auto Bot Mode DISABLED.');
      if (this.botInterval) {
        clearInterval(this.botInterval);
        this.botInterval = undefined;
      }
    }
    this.notifyStateChange();
  }

  private startBotSimulation() {
    if (this.botInterval) clearInterval(this.botInterval);

    const BOT_NAMES = ['Budi_Tank', 'Siti_Gamer', 'Rudi_Pro', 'Dewi_Pro', 'Agus_Destroyer'];

    this.botInterval = setInterval(() => {
      if (!this.config.AUTO_BOT_MODE) return;

      // 1. Ensure 4 players join if empty or missing
      if (this.players.size < 4 && Math.random() < 0.6) {
        const botName = BOT_NAMES[this.players.size % BOT_NAMES.length];
        this.queueEvent({
          id: `BOT_JOIN_${Date.now()}`,
          type: 'PLAYER_JOIN',
          platformUserId: `bot_${botName.toLowerCase()}`,
          username: botName,
          timestamp: Date.now(),
        });
        return;
      }

      // 2. Random combat actions
      const activePlayers = Array.from(this.players.values());
      if (activePlayers.length > 0) {
        const p = activePlayers[Math.floor(Math.random() * activePlayers.length)];

        if (p.status === 'DEAD' && Math.random() < 0.3) {
          // Revive
          this.queueEvent({
            id: `BOT_REV_${Date.now()}`,
            type: 'PLAYER_REVIVE',
            platformUserId: p.platformUserId,
            username: p.username,
            timestamp: Date.now(),
          });
        } else if (p.status === 'ALIVE') {
          const rand = Math.random();
          if (rand < 0.65) {
            // Attack
            this.queueEvent({
              id: `BOT_ATK_${Date.now()}`,
              type: 'PLAYER_ATTACK',
              platformUserId: p.platformUserId,
              username: p.username,
              timestamp: Date.now(),
            });
          } else if (rand < 0.85) {
            // Heal
            this.queueEvent({
              id: `BOT_HEAL_${Date.now()}`,
              type: 'PLAYER_HEAL',
              platformUserId: p.platformUserId,
              username: p.username,
              timestamp: Date.now(),
            });
          } else {
            // Special
            this.queueEvent({
              id: `BOT_SPEC_${Date.now()}`,
              type: 'PLAYER_SPECIAL',
              platformUserId: p.platformUserId,
              username: p.username,
              timestamp: Date.now(),
            });
          }
        }
      }
    }, 2200); // Trigger bot event every 2.2s for pleasant pacing
  }

  public devEvolvePlayer(userId?: string) {
    const targets = userId
      ? [this.players.get(userId)].filter(Boolean) as Player[]
      : Array.from(this.players.values());

    for (const player of targets) {
      const nextLevel = ((player.evolutionLevel % 4) + 1) as EvolutionLevel;
      player.evolutionLevel = nextLevel;
      const spec = EVOLUTION_SPECS[nextLevel];

      this.addEffect({
        id: `EVO_${Date.now()}_${Math.random()}`,
        type: 'EVOLUTION',
        position: { x: player.position.x, y: player.position.y },
        color: spec.bodyColorBonus,
        durationMs: 2500,
        createdAt: Date.now(),
        text: `EVOLVED TO ${spec.title}!`,
      });

      this.addFeedItem(
        'SYSTEM',
        `🔥 [EVOLUSI] @${player.username} naik ke LEVEL ${nextLevel}: ${spec.title}!`,
        player.username,
        player.color
      );
    }
    this.notifyStateChange();
  }

  public setTikTokConnection(username?: string, isConnected: boolean = false) {
    this.connectedTikTokUser = username;
    this.isTikTokConnected = isConnected;
    if (isConnected) {
      this.addFeedItem('SYSTEM', `📡 TikTok Live Connector CONNECTED to @${username}`);
    } else {
      this.addFeedItem('SYSTEM', '📡 TikTok Live Connector DISCONNECTED.');
    }
    this.notifyStateChange();
  }

  public updateConfig(newConfig: Partial<GameConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.addFeedItem('SYSTEM', '⚙️ Game Balance Configurations updated.');
    this.notifyStateChange();
  }

  private addEffect(effect: CombatEffect) {
    this.effects.push(effect);
    if (this.effects.length > 25) {
      this.effects.shift();
    }
  }

  private addFeedItem(type: LogFeedItem['type'], message: string, username: string = 'SYSTEM', color?: string) {
    this.feed.push({
      id: `FEED_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      type,
      message,
      username,
      color,
    });
    if (this.feed.length > 50) {
      this.feed.shift();
    }
  }
}
