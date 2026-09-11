/**
 * TikTok Live 3D Tank Battle - Vertical 9:16 Streaming HUD Layout
 */

import React, { useEffect } from 'react';
import { ARENA_THEMES } from '../config/gameConfig';
import { FullGameState } from '../types/game';
import { Battlefield3D } from './Battlefield3D';
import { Leaderboard } from './Leaderboard';
import { EventFeed } from './EventFeed';
import { soundEngine } from '../audio/soundEngine';
import { Timer, Radio, Award, Sparkles, AlertCircle } from 'lucide-react';

interface VerticalUIProps {
  gameState: FullGameState;
}

export const VerticalUI: React.FC<VerticalUIProps> = ({ gameState }) => {
  const themeInfo = ARENA_THEMES[gameState.theme] || ARENA_THEMES.DESERT;

  // Trigger Victory Celebration when winner screen shows
  useEffect(() => {
    if (gameState.state === 'RESULT' && gameState.winner) {
      soundEngine.playVictory();
    }
  }, [gameState.state, gameState.winner]);

  // Format Timer mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-[490px] bg-slate-950 text-white flex flex-col gap-2.5 p-3.5 mx-auto rounded-3xl border-2 border-slate-800 shadow-2xl">
      {/* 1. TOP SAFE-AREA STREAM HEADER */}
      <div className="z-10 flex flex-col gap-1.5">
        {/* Top Row: Game Title & Live Stream Status */}
        <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-wider text-red-400">TIKTOK LIVE</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{themeInfo.name}</span>
            </div>
          </div>

          {/* TikTok Stream Connection Status */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            <Radio className={`w-3.5 h-3.5 ${gameState.isTikTokConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{gameState.connectedTikTokUser ? `@${gameState.connectedTikTokUser}` : 'DEV SIM'}</span>
          </div>
        </div>

        {/* Second Row: Big Timer & Match State */}
        <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-black">
            <Timer className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xl font-black tracking-widest">{formatTimer(gameState.timerSec)}</span>
          </div>

          {/* Match State Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                gameState.state === 'PLAYING'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : gameState.state === 'COUNTDOWN'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {gameState.state}
            </span>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
              {gameState.players.length}/4 TANKS
            </span>
          </div>
        </div>
      </div>

      {/* 2. CENTER 2.5D BATTLEFIELD STAGE - Expanded 460px height & wide canvas */}
      <div className="relative w-full h-[460px] my-1 rounded-2xl overflow-hidden shadow-inner border border-slate-800/80 bg-slate-950">
        <Battlefield3D gameState={gameState} />

        {/* Live TikTok Action Alert Toast (During Playing state) */}
        {gameState.state === 'PLAYING' && gameState.feed && gameState.feed.length > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300">
            <div className="bg-slate-900/90 border border-amber-400/50 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 text-xs font-black text-white shadow-[0_0_15px_rgba(255,200,0,0.3)] animate-pulse">
              <span className="text-amber-400">⚡</span>
              <span className="text-amber-300">{gameState.feed[0].message}</span>
            </div>
          </div>
        )}

        {/* Countdown Banner Overlay */}
        {gameState.state === 'COUNTDOWN' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
            <span className="text-amber-400 font-black text-sm uppercase tracking-widest animate-pulse">
              GET READY FOR BATTLE!
            </span>
            <span className="text-6xl font-black text-white tracking-widest animate-bounce drop-shadow-[0_4px_12px_rgba(255,165,0,0.8)]">
              {gameState.timerSec}
            </span>
            <span className="text-xs text-slate-300 font-bold bg-black/60 px-3 py-1 rounded-full border border-amber-400/30">
              SEND GIFTS TO ATTACK OR HEAL!
            </span>
          </div>
        )}

        {/* Waiting Room Overlay */}
        {gameState.state === 'WAITING' && gameState.players.length < 2 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-amber-500/40 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 z-20 text-xs font-bold text-amber-300 shadow-xl animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>SEND ROSE GIFT TO JOIN ARENA (MAX 4 TANKS)</span>
          </div>
        )}

        {/* RESULT / WINNER CELEBRATION OVERLAY */}
        {gameState.state === 'RESULT' && gameState.winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 gap-3 z-30 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>MATCH CHAMPION</span>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md">
                @{gameState.winner.username}
              </h2>
              <p className="text-xs text-amber-300 font-bold mt-0.5">VICTORY!</p>
            </div>

            {/* Winner Stats Badge */}
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-4 text-xs font-bold">
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">KILLS</span>
                <span className="text-red-400 font-black text-lg">{gameState.winner.kills}</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">HEARTS</span>
                <span className="text-rose-500 font-black text-lg">{gameState.winner.hearts} ❤️</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">EVOLUTION</span>
                <span className="text-amber-400 font-black text-lg">LV{gameState.winner.evolutionLevel}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              NEW MATCH STARTING IN {gameState.timerSec}s...
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM OVERLAY: LEADERBOARD & EVENT FEED */}
      <div className="z-10 flex flex-col gap-2">
        <Leaderboard
          matchPlayers={gameState.leaderboard}
          globalPlayers={gameState.globalLeaderboard}
        />
        <EventFeed feed={gameState.feed} />
      </div>
    </div>
  );
};
