/**
 * TikTok Live 3D Tank Battle - Dual Leaderboard
 * Top: Live Match Leaderboard (Saat Bermain)
 * Bottom: Global Lifetime Leaderboard (Tingkat Kills & Berapa Kali Masuk/Main)
 */

import React from 'react';
import { Player, GlobalPlayerStat } from '../types/game';
import { Trophy, Globe, Flame, Heart, Shield, Swords, Crown, Gamepad2, UserPlus } from 'lucide-react';

interface LeaderboardProps {
  matchPlayers?: Player[];
  globalPlayers?: GlobalPlayerStat[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  matchPlayers = [],
  globalPlayers = [],
}) => {
  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-slate-700/80 shadow-2xl w-full flex flex-col gap-3">
      {/* ======================================================== */}
      {/* 1. TOP SECTION: LEADERBOARD SAAT BERMAIN (MATCH LIVE)   */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
            <Swords className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>LEADERBOARD MATCH (LIVE)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            {matchPlayers.length}/4 TANKS
          </span>
        </div>

        {/* Live Match Player List */}
        <div className="space-y-1">
          {matchPlayers.length === 0 ? (
            <div className="bg-slate-950/80 border border-dashed border-slate-800 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1">
              <UserPlus className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-bold text-slate-300">Arena Kosong • Menunggu Pemain</span>
              <span className="text-[10px] text-amber-400/90 font-extrabold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Kirim Gift 🌹 Mawar untuk Masuk Arena!
              </span>
            </div>
          ) : (
            matchPlayers.map((player, idx) => {
              const rankMedal =
                idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const isDead = player.status === 'DEAD';

              return (
                <div
                  key={player.platformUserId}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs transition-all ${
                    isDead
                      ? 'bg-slate-950/70 border-slate-800/80 opacity-60'
                      : idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  {/* Rank & Username & Slot */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-extrabold text-xs w-4 text-center">{rankMedal}</span>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-extrabold text-white truncate max-w-[110px] block text-[11px]">
                      @{player.username}
                    </span>
                  </div>

                  {/* Match Stats: Evo + Kills + Hearts */}
                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-black">
                    {/* Evolution Tier */}
                    {player.evolutionLevel > 1 && (
                      <span className="flex items-center gap-0.5 text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/30 text-[9px]">
                        <Shield className="w-2.5 h-2.5" />
                        LV{player.evolutionLevel}
                      </span>
                    )}

                    {/* Kills */}
                    <div className="flex items-center gap-0.5 text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      <Flame className="w-3 h-3 fill-red-400/20" />
                      <span>{player.kills} K</span>
                    </div>

                    {/* Hearts */}
                    <div className="flex items-center gap-0.5 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      <Heart className="w-3 h-3 fill-rose-500/30" />
                      <span>{isDead ? '0' : player.hearts}/{player.maxHearts}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BOTTOM SECTION: LEADERBOARD GLOBAL (ALL-TIME STATS)   */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-cyan-400 font-black text-xs uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>LEADERBOARD GLOBAL</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400">
            <span className="flex items-center gap-0.5 text-red-400">
              <Flame className="w-2.5 h-2.5" /> TOTAL KILLS
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5 text-amber-400">
              <Gamepad2 className="w-2.5 h-2.5" /> TOTAL MAIN
            </span>
          </div>
        </div>

        {/* Global Hall of Fame Table */}
        <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
          {globalPlayers.length === 0 ? (
            <div className="text-center py-2 text-[11px] text-slate-500 italic">
              Belum ada data statistik global.
            </div>
          ) : (
            globalPlayers.slice(0, 5).map((stat, idx) => {
              const rankIcon =
                idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

              return (
                <div
                  key={stat.platformUserId}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs transition-all ${
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/40 shadow-sm'
                      : idx === 1
                      ? 'bg-slate-800/70 border-slate-700/70'
                      : 'bg-slate-950/60 border-slate-800/60'
                  }`}
                >
                  {/* Rank & Username & Peak Level */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-extrabold text-xs w-4 text-center">{rankIcon}</span>
                    <span className="font-extrabold text-slate-200 truncate max-w-[100px] block text-[11px]">
                      @{stat.username}
                    </span>
                    {stat.highestEvolution > 1 && (
                      <span className="text-[9px] font-extrabold text-amber-300 bg-amber-400/10 px-1 rounded border border-amber-400/20">
                        LV{stat.highestEvolution}
                      </span>
                    )}
                  </div>

                  {/* All-Time Lifetime Stats: Kills + Matches + Wins */}
                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-black">
                    {/* Total Kills */}
                    <div className="flex items-center gap-0.5 text-red-400" title="Total Kills Sepanjang Masa">
                      <Flame className="w-3 h-3 fill-red-400/20" />
                      <span>{stat.totalKills} Kill</span>
                    </div>

                    {/* Total Matches / Berapa Kali Masuk & Main */}
                    <div className="flex items-center gap-0.5 text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" title="Berapa Kali Masuk / Main Match">
                      <Gamepad2 className="w-3 h-3 text-amber-400" />
                      <span>{stat.totalMatches} Main</span>
                    </div>

                    {/* Total Wins */}
                    {stat.totalWins > 0 && (
                      <div className="flex items-center gap-0.5 text-yellow-400" title="Total Juara 1 (Wins)">
                        <Crown className="w-3 h-3 fill-yellow-400/20" />
                        <span>{stat.totalWins} W</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
