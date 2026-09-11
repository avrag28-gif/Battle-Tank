/**
 * TikTok Live 3D Tank Battle - Game Configurations & Arena Themes
 */

import { GameConfig, ThemeConfig, ThemeId } from '../types/game';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  MATCH_DURATION_SEC: 240, // 4 minutes match
  MAX_PLAYERS: 4, // Strict limit 4 active tank slots (Corners only)
  START_COUNTDOWN_SEC: 5,
  MAX_HEARTS: 5,
  EVOLUTION_KILL_THRESHOLDS: {
    LEVEL_1: 0,
    LEVEL_2: 3, // 3 kills -> Evolved
    LEVEL_3: 7, // 7 kills -> Elite
    LEVEL_4: 12, // 12 kills -> Legendary Titan
  },
  ATTACK_COOLDOWN_MS: 50, // Ultra-low cooldown to allow direct rapid gift spamming!
  HEAL_COOLDOWN_MS: 800,
  HEAL_AMOUNT: 1, // +1 Heart
  DAMAGE_BUFF_DURATION_SEC: 10, // 10 seconds duration for special damage boost
  AFK_TIMEOUT_MS: 90000, // 90 sec inactivity mark AFK
  PROJECTILE_SPEED: 19,
  PROJECTILE_RANGE: 16,
  GIFT_MAP: {
    JOIN_GIFT: 'panda', // 10 Coins Gift (Panda / 10 Coins)
    ATTACK_GIFT: 'rose', // 1 Coin Gift (Rose / Rosa / Mawar) -> Multi-bullet spam!
    HEAL_GIFT: 'doughnut', // 30 Coins Gift (Doughnut / Donat) -> Heal +1 ❤️
    EVOLVE_GIFT: 'cap_mustache', // 99 Coins Gift (Cap & Mustache / Topi Kumis) -> Manual Evolution!
    DAMAGE_BUFF_GIFT: 'lightning', // 15 Coins Gift (GG / Petir / Kacamata) -> 2X Demeg Buff!
    REVIVE_GIFT: 'dragon', // Dragon / Universe -> Revive Dead Tank
    SPECIAL_GIFT: 'cap_mustache',
  },
  AUTO_BOT_MODE: false,
};

export const ARENA_THEMES: Record<ThemeId, ThemeConfig> = {
  DESERT: {
    id: 'DESERT',
    name: 'Gobi Desert Battlefield',
    groundColor: '#d4a359',
    gridColor: '#b8860b',
    skyColor: '#f7d08a',
    accentColor: '#ff8c00',
    obstacleColor: '#8b5a2b',
    fogColor: '#f4c430',
    particles: 'DUST',
    description: 'Arid desert landscape with golden sand dunes and dust storms.',
  },
  FROZEN_ICE: {
    id: 'FROZEN_ICE',
    name: 'Glacial Ice Outpost',
    groundColor: '#1e3d59',
    gridColor: '#17b978',
    skyColor: '#071e3d',
    accentColor: '#00f2fe',
    obstacleColor: '#438a5e',
    fogColor: '#00c6ff',
    particles: 'SNOW',
    description: 'Sub-zero frozen tundra with slick ice plains and snowfall.',
  },
  VOLCANIC: {
    id: 'VOLCANIC',
    name: 'Alien Obsidian Arena',
    groundColor: '#121212',
    gridColor: '#ff2e63',
    skyColor: '#1a0003',
    accentColor: '#ff2e63',
    obstacleColor: '#393e46',
    fogColor: '#ff0000',
    particles: 'EMBERS',
    description: 'Volcanic magma zone with glowing obsidian energy grids and floating embers.',
  },
};

export const PLAYER_SLOT_COLORS = [
  '#FF2D55', // Vibrant Crimson Pink-Red - Slot 0
  '#00FF66', // Bright Neon Electric Lime - Slot 1
  '#00E5FF', // Vibrant Electric Cyan Blue - Slot 2
  '#FF9900', // Bright Glowing Golden Amber - Slot 3
];

export const EVOLUTION_SPECS = {
  1: {
    title: 'BASE TANK',
    damage: 1.0,
    scale: 1.0,
    speedMultiplier: 1.0,
    bodyColorBonus: '#ffffff',
    cannonCount: 1, // 1 Selongsong -> 1 Peluru
    bulletCount: 1,
    fireEffect: 'STANDARD',
  },
  2: {
    title: 'DUAL HEAVY DESTROYER',
    damage: 1.0,
    scale: 1.25,
    speedMultiplier: 1.1,
    bodyColorBonus: '#ffd700',
    cannonCount: 2, // 2 Selongsong -> 2 Peluru Paralel
    bulletCount: 2,
    fireEffect: 'TWIN_SHOT',
  },
  3: {
    title: 'TRIPLE LASER RAILGUN',
    damage: 1.0,
    scale: 1.45,
    speedMultiplier: 1.2,
    bodyColorBonus: '#00ffff',
    cannonCount: 3, // 3 Selongsong -> 3 Peluru Menyebar
    bulletCount: 3,
    fireEffect: 'PLASMA_BEAM',
  },
  4: {
    title: 'QUAD TITAN MECH',
    damage: 1.0,
    scale: 1.7,
    speedMultiplier: 1.35,
    bodyColorBonus: '#ff007f',
    cannonCount: 4, // 4 Selongsong -> 4 Peluru Barrage
    bulletCount: 4,
    fireEffect: 'MEGABLAST',
  },
};
