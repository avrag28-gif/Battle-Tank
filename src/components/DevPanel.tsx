/**
 * TikTok Live 3D Tank Battle - Host / Dev Control Panel
 * Simulates gifts, comments, bot mode, match resets, and gift config mappings.
 */

import React, { useState } from 'react';
import { FullGameState } from '../types/game';
import { Play, RotateCcw, Bot, Zap, Heart, Shield, Sparkles, Settings, UserPlus, Radio, Flame } from 'lucide-react';

interface DevPanelProps {
  gameState: FullGameState;
  onSendDevAction: (action: string, payload?: any) => void;
  onToggleBotMode: (enable?: boolean) => void;
  onConnectTikTok: (username?: string) => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({
  gameState,
  onSendDevAction,
  onToggleBotMode,
  onConnectTikTok,
}) => {
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'TIKTOK' | 'CONFIG'>('CONTROLS');
  const [customUsername, setCustomUsername] = useState('');
  const [tikTokUsernameInput, setTikTokUsernameInput] = useState('');

  const handleSimulatedJoin = () => {
    onSendDevAction('JOIN', {
      username: customUsername.trim() || `Viewer_${Math.floor(Math.random() * 89 + 10)}`,
    });
    setCustomUsername('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-md mx-auto text-white text-xs">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('CONTROLS')}
            className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'CONTROLS'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            DEV ACTIONS
          </button>
          <button
            onClick={() => setActiveTab('TIKTOK')}
            className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'TIKTOK'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            TIKTOK LIVE
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 ${
              activeTab === 'CONFIG'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            GIFTS CONFIG
          </button>
        </div>

        {/* Auto Bot Mode Indicator Button */}
        <button
          onClick={() => onToggleBotMode()}
          className={`px-2.5 py-1 rounded-lg font-black flex items-center gap-1 border transition-all ${
            gameState.config.AUTO_BOT_MODE
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{gameState.config.AUTO_BOT_MODE ? 'BOT: ON' : 'BOT: OFF'}</span>
        </button>
      </div>

      {/* TAB 1: CONTROLS */}
      {activeTab === 'CONTROLS' && (
        <div className="space-y-3">
          {/* Quick Simulation Batch Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSendDevAction('SIMULATE_4_JOIN')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              SIMULATE 4 JOINS
            </button>
            <button
              onClick={() => onSendDevAction('RESET_MATCH')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              RESET MATCH
            </button>
          </div>

          {/* Add Single Player Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="TikTok Username (e.g. BudiGamer)"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulatedJoin()}
              className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl flex-1 font-medium text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSimulatedJoin}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-4 py-2 rounded-xl transition-all"
            >
              JOIN GIFT
            </button>
          </div>

          {/* Individual Gift Trigger Buttons */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              TRIGGER TIKTOK GIFTS
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSendDevAction('ATTACK')}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🌹</span>
                <span>ROSE (TEMBAK)</span>
              </button>
              <button
                onClick={() => onSendDevAction('SPAM_ATTACK')}
                className="bg-rose-600/40 hover:bg-rose-600/50 text-white border border-rose-400 font-black py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <span>🌹⚡</span>
                <span>SPAM (5x ROSE)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSendDevAction('HEAL')}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🍩</span>
                <span>DONAT (HEAL)</span>
              </button>
              <button
                onClick={() => onSendDevAction('DAMAGE_BUFF')}
                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all animate-pulse"
              >
                <span>⚡</span>
                <span>PETIR (2X DMG 10s)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSendDevAction('EVOLVE_MANUAL')}
                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🎩</span>
                <span>TOPI KUMIS (EVO)</span>
              </button>
              <button
                onClick={() => onSendDevAction('REVIVE')}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🔥</span>
                <span>DRAGON (REVIVE)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIKTOK LIVE CONNECTION */}
      {activeTab === 'TIKTOK' && (
        <div className="space-y-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-white block">CONNECT TO TIKTOK LIVE STREAM</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter the streamer's TikTok username (without @) to map live chat comments and gifts directly into tank actions!
            </p>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="e.g. streamer_pro"
                value={tikTokUsernameInput}
                onChange={(e) => setTikTokUsernameInput(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl flex-1 font-medium text-white focus:outline-none focus:border-red-500"
              />
              {gameState.isTikTokConnected ? (
                <button
                  onClick={() => onConnectTikTok(undefined)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-3 py-2 rounded-xl border border-slate-700"
                >
                  DISCONNECT
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (tikTokUsernameInput.trim()) {
                      onConnectTikTok(tikTokUsernameInput.trim());
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-2 rounded-xl"
                >
                  CONNECT
                </button>
              )}
            </div>

            {gameState.isTikTokConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2 rounded-lg text-[11px] font-bold flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Connected to TikTok Stream @{gameState.connectedTikTokUser}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIG */}
      {activeTab === 'CONFIG' && (
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="font-bold text-white uppercase text-[10px] tracking-wider block">
            CURRENT GIFT MAPPING
          </span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">MASUK ARENA (10 Koin):</span>
              <span className="font-black text-emerald-400 uppercase">🐼 Panda / 10 Coins</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">TEMBAK (1 Koin / Spam):</span>
              <span className="font-black text-rose-400 uppercase">🌹 Rose (Mawar)</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">ISI DARAH / HEAL:</span>
              <span className="font-black text-amber-400 uppercase">🍩 Donut (Donat)</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">2X DEMEG (10 Detik):</span>
              <span className="font-black text-yellow-300 uppercase">⚡ Lightning / Petir GG</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">EVOLUSI MANUAL:</span>
              <span className="font-black text-purple-400 uppercase">🎩 Topi & Kumis (Cap & Mustache)</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 font-semibold">REVIVE / RESPAWN:</span>
              <span className="font-black text-amber-400 uppercase">🔥 Dragon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
