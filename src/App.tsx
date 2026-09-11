/**
 * TikTok Live 3D Tank Battle - Main Application Container
 */

import React, { useEffect, useState, useRef } from 'react';
import { FullGameState } from './types/game';
import { VerticalUI } from './components/VerticalUI';
import { DevPanel } from './components/DevPanel';
import { FullWidthArenaView } from './components/FullWidthArenaView';
import { soundEngine } from './audio/soundEngine';
import {
  Volume2,
  VolumeX,
  Shield,
  Radio,
  Sparkles,
  HelpCircle,
  Music,
  Maximize2,
  Smartphone,
  Sliders
} from 'lucide-react';

type PageViewMode = 'FULL_ARENA' | 'VERTICAL_PHONE' | 'DEV_PANEL';

export default function App() {
  const [gameState, setGameState] = useState<FullGameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<PageViewMode>('FULL_ARENA');
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-start BGM on first user interaction anywhere on page
  useEffect(() => {
    const startAudioOnInteraction = () => {
      soundEngine.startBGM();
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
    };
    window.addEventListener('click', startAudioOnInteraction);
    window.addEventListener('keydown', startAudioOnInteraction);
    return () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
    };
  }, []);

  // Multi-transport real-time sync (WebSocket -> EventSource (SSE) -> REST Polling)
  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;
    let ws: WebSocket | null = null;

    // 1. Initial REST fetch to load immediately
    const loadInitial = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          if (data && data.matchId && active) {
            setGameState(data);
          }
        }
      } catch {
        // Silent catch for initial load
      }
    };
    loadInitial();

    // 2. Try EventSource (SSE) which is 100% reliable across all iFrame / proxy setups
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        if (!active) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'GAME_STATE') {
            setGameState(msg.data);
          }
        } catch {
          // Silent JSON parse error
        }
      };
      eventSource.onerror = () => {
        // EventSource automatically retries HTTP connections natively
      };
    } catch {
      // Fallback if EventSource is unavailable
    }

    // 3. Try WebSocket for bi-directional streaming
    const connectWS = () => {
      if (!active) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'GAME_STATE') {
              setGameState(msg.data);
            }
          } catch {
            // Silent catch
          }
        };

        ws.onerror = () => {
          // Suppress unhandled ErrorEvent logging; fallback handles updates smoothly
        };

        ws.onclose = () => {
          if (active) {
            setTimeout(connectWS, 3000);
          }
        };
      } catch {
        // Fallback
      }
    };

    connectWS();

    // 4. Reliable high-frequency REST polling fallback (100ms) to ensure instant updates in all iframe/browser environments
    const pollInterval = setInterval(() => {
      if (!active) return;
      fetch('/api/status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.matchId && active) {
            setGameState(data);
          }
        })
        .catch(() => {});
    }, 100);

    return () => {
      active = false;
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSendDevAction = (action: string, payload?: any) => {
    fetch('/api/dev/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.state) setGameState(data.state);
      })
      .catch((err) => console.error('Dev action error:', err));
  };

  const handleToggleBotMode = (enable?: boolean) => {
    fetch('/api/dev/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable }),
    })
      .then((res) => res.json())
      .catch((err) => console.error('Toggle bot error:', err));
  };

  const handleConnectTikTok = (username?: string) => {
    fetch('/api/tiktok/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
      .then((res) => res.json())
      .catch((err) => console.error('TikTok connect error:', err));
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
  };

  const toggleBGM = () => {
    const active = soundEngine.toggleBGM();
    setBgmEnabled(active);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-slate-900 px-6 py-4 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span className="font-extrabold text-sm uppercase tracking-wider text-amber-400">
            CONNECTING TO TANK BATTLE SERVER...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans">
      {/* Top Universal Stream Navigation Bar */}
      <header className="w-full bg-slate-900/95 border-b border-slate-800/80 px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center font-black text-black shadow-lg">
            3D
          </div>
          <div>
            <h1 className="font-black text-xs md:text-sm tracking-wide text-white uppercase flex items-center gap-2">
              <span>TIKTOK LIVE TANK BATTLE</span>
              <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full text-[9px] font-black">
                REAL STREAM ENGINE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              Multiplayer Arena • 4 Tank Limit • 360° Radar Turrets
            </p>
          </div>
        </div>

        {/* Page View Mode Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActivePage('FULL_ARENA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activePage === 'FULL_ARENA'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ARENA FULL LEBAR</span>
          </button>
          <button
            onClick={() => setActivePage('VERTICAL_PHONE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activePage === 'VERTICAL_PHONE'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>MODE HP 9:16</span>
          </button>
          <button
            onClick={() => setActivePage('DEV_PANEL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activePage === 'DEV_PANEL'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>PANEL HOST</span>
          </button>
        </div>

        {/* Audio & Rules Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
            title="Aturan Game & Hadiah TikTok"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={toggleBGM}
            className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-bold ${
              bgmEnabled
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="Toggle BGM Music"
          >
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">{bgmEnabled ? 'BGM ON' : 'BGM OFF'}</span>
          </button>
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
          </button>
        </div>
      </header>

      {/* PAGE 1: FULL-WIDTH ARENA VIEW (Mentok Kiri & Kanan Tanpa Margin/Padding) */}
      {activePage === 'FULL_ARENA' && (
        <FullWidthArenaView
          gameState={gameState}
          onSendDevAction={handleSendDevAction}
          onSwitchToVertical={() => setActivePage('VERTICAL_PHONE')}
          onSwitchToDevPanel={() => setActivePage('DEV_PANEL')}
        />
      )}

      {/* PAGE 2: VERTICAL PHONE STREAM SIMULATOR (9:16 Frame + Side Panel) */}
      {activePage === 'VERTICAL_PHONE' && (
        <main className="w-full max-w-6xl p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex justify-center">
            <VerticalUI gameState={gameState} />
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <DevPanel
              gameState={gameState}
              onSendDevAction={handleSendDevAction}
              onToggleBotMode={handleToggleBotMode}
              onConnectTikTok={handleConnectTikTok}
            />

            {/* Quick Gift Action Legend Card */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-2">
              <span className="font-extrabold text-xs uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                ATURAN GIFT TIKTOK
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">MASUK ARENA:</span>
                  <span className="font-black text-emerald-400">🐼 Panda (10)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">TEMBAK / SPAM:</span>
                  <span className="font-black text-rose-400">🌹 Rose (1)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">ISI DARAH (+1 ❤️):</span>
                  <span className="font-black text-emerald-400">🍩 Donut (30)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">2X DEMEG (10s):</span>
                  <span className="font-black text-yellow-300">⚡ Petir (15)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">EVOLUSI MANUAL:</span>
                  <span className="font-black text-purple-400">🎩 Topi Kumis (99)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 font-bold">RESPAWN / REVIVE:</span>
                  <span className="font-black text-amber-400">🔥 Dragon</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* PAGE 3: FULL HOST CONTROLLER & GIFT SIMULATOR */}
      {activePage === 'DEV_PANEL' && (
        <main className="w-full max-w-4xl p-4 md:p-6 flex flex-col gap-6">
          <DevPanel
            gameState={gameState}
            onSendDevAction={handleSendDevAction}
            onToggleBotMode={handleToggleBotMode}
            onConnectTikTok={handleConnectTikTok}
          />
        </main>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white uppercase flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                GAME RULES & ARCHITECTURE
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>🎮 5-Tank Limit:</strong> Each match accommodates a maximum of 5 active players in dedicated slots. Additional gift joins while full will be queued or rejected gracefully.
              </p>
              <p>
                <strong>🔥 Tank Evolution:</strong> Accumulating kills transforms the tank dynamically in 3D:
                <br />• 0 Kills: Base Steel Tank
                <br />• 3 Kills: Evolved Heavy Tank
                <br />• 7 Kills: Elite Laser Railgun Tank
                <br />• 12 Kills: Legendary Titan Mech
              </p>
              <p>
                <strong>🏜️ Dynamic Theme Rotations:</strong> On match completion, the server automatically rotates randomly between Gobi Desert, Glacial Ice Outpost, and Alien Obsidian Arena.
              </p>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2.5 rounded-xl transition-all"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
