/**
 * TikTok Live Event Adapter
 * Decouples TikTok Live platform events from internal game logic.
 */

import { GameEngine } from './GameEngine';
import { InternalGameEvent } from '../types/game';

export interface TikTokRawGiftEvent {
  userId: string;
  username: string;
  avatarUrl?: string;
  giftId: string;
  giftName?: string;
  giftCount?: number;
  repeatCount?: number;
}

export interface TikTokRawCommentEvent {
  userId: string;
  username: string;
  avatarUrl?: string;
  comment: string;
}

export interface TikTokRawLikeEvent {
  userId: string;
  username: string;
  likeCount: number;
}

export class TikTokAdapter {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * Translates incoming TikTok Raw Gift into Internal Game Event
   */
  public handleRawGift(event: TikTokRawGiftEvent) {
    const config = this.engine.getFullState().config;
    const giftMap = config.GIFT_MAP;

    const giftKey = (event.giftId || event.giftName || '').toLowerCase().trim();

    let internalEventType: InternalGameEvent['type'] = 'PLAYER_ATTACK'; // Default fallback action

    // 1. Join Gift (10 Coins: Panda / Little Crown / Corgi / 10 Coins / Finger Heart 10)
    if (
      giftKey === giftMap.JOIN_GIFT.toLowerCase() ||
      giftKey.includes('panda') ||
      giftKey.includes('corgi') ||
      giftKey.includes('10 coin') ||
      giftKey.includes('10 koin') ||
      giftKey.includes('sepuluh koin') ||
      giftKey.includes('little crown') ||
      giftKey.includes('crown') ||
      giftKey.includes('finger heart') ||
      giftKey.includes('love')
    ) {
      internalEventType = 'PLAYER_JOIN';
    }
    // 2. Attack / Shoot Gift (1 Coin: Rosa / Rose / Mawar) -> Multi-bullet spam!
    else if (
      giftKey === giftMap.ATTACK_GIFT.toLowerCase() ||
      giftKey.includes('rose') ||
      giftKey.includes('rosa') ||
      giftKey.includes('mawar') ||
      giftKey.includes('ice cream')
    ) {
      internalEventType = 'PLAYER_ATTACK';
    }
    // 3. Heal Gift (30 Coins: Doughnut / Donat)
    else if (
      giftKey === giftMap.HEAL_GIFT.toLowerCase() ||
      giftKey.includes('doughnut') ||
      giftKey.includes('donat') ||
      giftKey.includes('donut')
    ) {
      internalEventType = 'PLAYER_HEAL';
    }
    // 4. Manual Evolution (99 Coins: Topi & Kumis / Cap & Mustache)
    else if (
      giftKey === giftMap.EVOLVE_GIFT.toLowerCase() ||
      giftKey.includes('mustache') ||
      giftKey.includes('kumis') ||
      giftKey.includes('cap') ||
      giftKey.includes('topi') ||
      giftKey.includes('topi kumis') ||
      giftKey.includes('topi & kumis')
    ) {
      internalEventType = 'PLAYER_EVOLVE_MANUAL';
    }
    // 5. Damage Buff (Special Gift: Lightning / Petir / GG / Kacamata / Parfum / Kopi)
    else if (
      giftKey === giftMap.DAMAGE_BUFF_GIFT.toLowerCase() ||
      giftKey.includes('lightning') ||
      giftKey.includes('petir') ||
      giftKey.includes('gg') ||
      giftKey.includes('kacamata') ||
      giftKey.includes('glasses') ||
      giftKey.includes('parfum') ||
      giftKey.includes('perfume') ||
      giftKey.includes('demeg') ||
      giftKey.includes('damage') ||
      giftKey.includes('firework')
    ) {
      internalEventType = 'PLAYER_DAMAGE_BUFF';
    }
    // 6. Revive Dead Tank (Dragon / Naga / Universe / Paus)
    else if (
      giftKey === giftMap.REVIVE_GIFT.toLowerCase() ||
      giftKey.includes('dragon') ||
      giftKey.includes('naga') ||
      giftKey.includes('universe') ||
      giftKey.includes('whale') ||
      giftKey.includes('paus')
    ) {
      internalEventType = 'PLAYER_REVIVE';
    }

    const internalEvent: InternalGameEvent = {
      id: `TT_GIFT_${Date.now()}_${Math.random()}`,
      type: internalEventType,
      platformUserId: event.userId,
      username: event.username,
      avatarUrl: event.avatarUrl,
      giftId: event.giftId,
      quantity: event.giftCount || 1,
      timestamp: Date.now(),
      payload: { rawGiftName: event.giftName },
    };

    this.engine.queueEvent(internalEvent);
  }

  /**
   * Translates incoming TikTok Chat Comment
   */
  public handleRawComment(event: TikTokRawCommentEvent) {
    const text = (event.comment || '').trim().toLowerCase();

    // Check for comment commands
    if (text === '!join') {
      this.engine.queueEvent({
        id: `TT_CMD_${Date.now()}`,
        type: 'PLAYER_JOIN',
        platformUserId: event.userId,
        username: event.username,
        avatarUrl: event.avatarUrl,
        timestamp: Date.now(),
      });
      return;
    }

    if (text === '!attack' || text === '!serang') {
      this.engine.queueEvent({
        id: `TT_CMD_${Date.now()}`,
        type: 'PLAYER_ATTACK',
        platformUserId: event.userId,
        username: event.username,
        timestamp: Date.now(),
      });
      return;
    }

    // Normal comment feed
    this.engine.queueEvent({
      id: `TT_CMT_${Date.now()}`,
      type: 'PLAYER_COMMENT',
      platformUserId: event.userId,
      username: event.username,
      avatarUrl: event.avatarUrl,
      timestamp: Date.now(),
      payload: { comment: event.comment },
    });
  }

  /**
   * Translates incoming TikTok Likes
   */
  public handleRawLike(event: TikTokRawLikeEvent) {
    this.engine.queueEvent({
      id: `TT_LIKE_${Date.now()}`,
      type: 'PLAYER_LIKE',
      platformUserId: event.userId,
      username: event.username,
      timestamp: Date.now(),
      payload: { likeCount: event.likeCount },
    });
  }
}
