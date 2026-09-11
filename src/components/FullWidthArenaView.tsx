/**
 * Full-Width Arena View (Halaman Arena Full Lebar - Mentok Kiri & Kanan Tanpa Margin/Padding)
 * Specially designed for OBS Live Streaming / Direct Edge-to-Edge Broadcast
 */

import React, { useEffect } from 'react';
import { ARENA_THEMES } from '../config/gameConfig';
import { FullGameState } from '../types/game';
import { Battlefield3D } from './Battlefield3D';
import { Leaderboard } from './Leaderboard';
import { EventFeed } from './EventFeed';
import { soundEngine } from '../audio/soundEngine';
import {
  Timer,
  Radio,
  Sparkles,
  AlertCircle,
  Zap,
  Heart,
  Flame,
  Maximize2,
  Shield,
  Smartphone,
  Sliders,
  RotateCcw
} from 'lucide-react';

interface FullWidthArenaViewProps {
  gameState: FullGameState;
  onSendDevAction: (action: string, payload?: any) => void;
  onSwitchToVertical: () => void;
  onSwitchToDevPanel: () => void;
}

export const FullWidthArenaView: React.FC<FullWidthArenaViewProps> = ({
  gameState,
  onSendDevAction,
  onSwitchToVertical,
  onSwitchToDevPanel,
}) => {
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
    <div className="w-full flex flex-col items-center bg-slate-950 text-white min-h-screen">
      {/* 1. BROADCAST TOP STREAM BAR (Edge-to-Edge Header) */}
      <div className="w-full bg-slate-900/95 border-b border-slate-800 px-3 md:px-6 py-2 flex flex-wrap items-center justify-between gap-2 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-3 py-1 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-black text-xs uppercase tracking-wider text-red-400">TIKTOK LIVE STREAM</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            <span>🏜️ TEMA:</span>
            <span className="text-white uppercase font-black">{themeInfo.name}</span>
          </div>
        </div>

        {/* Center Live Match Status & Big Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/90 px-4 py-1 rounded-xl border border-slate-800 text-amber-400 font-black shadow-inner">
            <Timer className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-lg md:text-xl font-black tracking-widest">{formatTimer(gameState.timerSec)}</span>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${
              gameState.state === 'PLAYING'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : gameState.state === 'COUNTDOWN'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {gameState.state}
          </span>

          <span className="text-xs font-black text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {gameState.players.length}/4 TANKS
          </span>
        </div>

        {/* Quick View Switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToVertical}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Beralih ke Tampilan Smartphone TikTok (9:16)"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Mode HP 9:16</span>
          </button>
          <button
            onClick={onSwitchToDevPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Buka Panel Kontrol Host"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Panel Host</span>
          </button>
        </div>
      </div>

      {/* 2. FULL-WIDTH EDGE-TO-EDGE 3D CANVAS ARENA (MENTOK KIRI & KANAN TANPA PADDING/MARGIN) */}
      <div className="w-full relative h-[480px] md:h-[540px] lg:h-[580px] bg-slate-950 border-y-2 border-slate-800/80 overflow-hidden shadow-2xl">
        <Battlefield3D gameState={gameState} />

        {/* Live Action Announcement Toast */}
        {gameState.state === 'PLAYING' && gameState.feed && gameState.feed.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300">
            <div className="bg-slate-900/90 border border-amber-400/60 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-xs md:text-sm font-black text-white shadow-[0_0_20px_rgba(255,200,0,0.35)] animate-pulse">
              <span className="text-amber-400">⚡</span>
              <span className="text-amber-300">{gameState.feed[0].message}</span>
            </div>
          </div>
        )}

        {/* Countdown Banner Overlay */}
        {gameState.state === 'COUNTDOWN' && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
            <span className="text-amber-400 font-black text-base uppercase tracking-widest animate-pulse">
              BERSIAP UNTUK PERTEMPURAN!
            </span>
            <span className="text-7xl font-black text-white tracking-widest animate-bounce drop-shadow-[0_4px_16px_rgba(255,165,0,0.9)]">
              {gameState.timerSec}
            </span>
            <span className="text-xs md:text-sm text-slate-200 font-bold bg-black/70 px-4 py-1.5 rounded-full border border-amber-400/40">
              KIRIM 🌹 MAWAR UNTUK MENEMBAK & ⚡ PETIR UNTUK 2X DEMEG!
            </span>
          </div>
        )}

        {/* Waiting Room Overlay */}
        {gameState.state === 'WAITING' && gameState.players.length < 2 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-amber-500/50 px-5 py-2 rounded-full backdrop-blur-md flex items-center gap-2.5 z-20 text-xs md:text-sm font-bold text-amber-300 shadow-2xl animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>KIRIM 🐼 PANDA (10 KOIN) UNTUK MASUK ARENA (MAKS 4 TANK)</span>
          </div>
        )}

        {/* Winner Screen Overlay */}
        {gameState.state === 'RESULT' && gameState.winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 gap-4 z-30 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs md:text-sm uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/40">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
              <span>JUARA PERTEMPURAN ARENA TANK</span>
            </div>

            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-black tracking-wide text-white drop-shadow-lg">
                @{gameState.winner.username}
              </h2>
              <p className="text-sm md:text-base text-amber-300 font-bold mt-1">VICTORY CHAMPION!</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-6 py-3.5 rounded-2xl flex items-center gap-6 text-sm font-bold shadow-xl">
              <div className="text-center">
                <span className="text-slate-400 text-xs block">TOTAL KILLS</span>
                <span className="text-red-400 font-black text-xl">{gameState.winner.kills}</span>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center">
                <span className="text-slate-400 text-xs block">SISA DARAH</span>
                <span className="text-rose-500 font-black text-xl">{gameState.winner.hearts} ❤️</span>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center">
                <span className="text-slate-400 text-xs block">LEVEL TANK</span>
                <span className="text-amber-400 font-black text-xl">LV{gameState.winner.evolutionLevel}</span>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-bold bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
              RONDE BARU AKAN DIMULAI DALAM {gameState.timerSec} DETIK...
            </div>
          </div>
        )}
      </div>

      {/* 3. QUICK GIFT TESTING HOTBAR (DIRECT STREAM TRIGGER DOCK) */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>TEST GIFT TIKTOK:</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSendDevAction('JOIN')}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>🐼</span>
            <span>+ TANK (PANDA)</span>
          </button>
          <button
            onClick={() => onSendDevAction('ATTACK')}
            className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>🌹</span>
            <span>TEMBAK (ROSE)</span>
          </button>
          <button
            onClick={() => onSendDevAction('SPAM_ATTACK')}
            className="bg-rose-600/40 hover:bg-rose-600/50 text-white border border-rose-400 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-md active:scale-95 animate-pulse"
          >
            <span>🌹⚡</span>
            <span>SPAM x5 BARRAGE</span>
          </button>
          <button
            onClick={() => onSendDevAction('HEAL')}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>🍩</span>
            <span>ISI DARAH (+1 ❤️)</span>
          </button>
          <button
            onClick={() => onSendDevAction('DAMAGE_BUFF')}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>⚡</span>
            <span>2X DEMEG (10s)</span>
          </button>
          <button
            onClick={() => onSendDevAction('EVOLVE_MANUAL')}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>🎩</span>
            <span>TOPI KUMIS (EVO)</span>
          </button>
          <button
            onClick={() => onSendDevAction('REVIVE')}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>🔥</span>
            <span>REVIVE</span>
          </button>
          <button
            onClick={() => onSendDevAction('RESET_MATCH')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
            title="Reset Match & Bersihkan Arena"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* 4. BOTTOM STREAM SECTION: LEADERBOARD & EVENT FEED (SIDE-BY-SIDE IN FULL WIDTH) */}
      <div className="w-full max-w-7xl px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live Leaderboard */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 shadow-xl">
          <Leaderboard players={gameState.players} />
        </div>

        {/* Live Event Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 shadow-xl">
          <EventFeed feed={gameState.feed} />
        </div>
      </div>
    </div>
  );
};
