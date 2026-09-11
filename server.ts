/**
 * TikTok Live 3D Tank Battle - Server Entry Point
 * Express API + Native WebSocket Server + Vite Middleware
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

import { GameEngine } from './src/server/GameEngine';
import { TikTokAdapter } from './src/server/TikTokAdapter';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // Initialize Game Engine & TikTok Adapter
  const engine = new GameEngine();
  const adapter = new TikTokAdapter(engine);
  engine.start();

  // Initialize WebSocket Server with noServer: true for clean HTTP Upgrade handling
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
      if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[WS] Upgrade error:', err);
    }
  });

  // Track SSE clients
  const sseClients = new Set<express.Response>();

  // Broadcast state changes to all connected WS and SSE clients
  engine.subscribe((gameState) => {
    const payload = JSON.stringify({ type: 'GAME_STATE', data: gameState });
    
    // Broadcast via WS
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    // Broadcast via SSE
    for (const res of sseClients) {
      res.write(`data: ${payload}\n\n`);
    }
  });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.send(JSON.stringify({ type: 'GAME_STATE', data: engine.getFullState() }));

    ws.on('message', (message: string) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'REQUEST_FULL_STATE') {
          ws.send(JSON.stringify({ type: 'GAME_STATE', data: engine.getFullState() }));
        } else if (msg.type === 'DEV_EVENT') {
          handleDevAction(msg.action, msg.payload, engine, adapter);
        }
      } catch (err) {
        console.error('[WS] Error handling message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });
  });

  // --- REST & SSE API ENDPOINTS ---

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial state
    res.write(`data: ${JSON.stringify({ type: 'GAME_STATE', data: engine.getFullState() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // --- REST API ENDPOINTS ---

  app.get('/api/status', (req, res) => {
    res.json(engine.getFullState());
  });

  app.post('/api/dev/event', (req, res) => {
    const { action, payload } = req.body;
    handleDevAction(action, payload, engine, adapter);
    res.json({ success: true, state: engine.getFullState() });
  });

  app.post('/api/dev/bot', (req, res) => {
    const { enable } = req.body;
    engine.toggleAutoBotMode(enable);
    res.json({ success: true, autoBot: engine.getFullState().config.AUTO_BOT_MODE });
  });

  app.post('/api/config', (req, res) => {
    engine.updateConfig(req.body);
    res.json({ success: true, config: engine.getFullState().config });
  });

  app.post('/api/tiktok/connect', (req, res) => {
    const { username } = req.body;
    if (username) {
      engine.setTikTokConnection(username, true);
      res.json({ success: true, message: `Connected to TikTok Live stream @${username}` });
    } else {
      engine.setTikTokConnection(undefined, false);
      res.json({ success: true, message: 'Disconnected from TikTok Live stream.' });
    }
  });

  // --- VITE / STATIC SERVING ---

  if (process.env.NODE_ENV !== 'production') {
    console.log('[SERVER] Running in Development Mode with Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[SERVER] Running in Production Mode serving static dist');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`🚀 TikTok Live 3D Tank Battle running at http://${HOST}:${PORT}`);
  });
}

function handleDevAction(action: string, payload: any, engine: GameEngine, adapter: TikTokAdapter) {
  switch (action) {
    case 'JOIN': {
      adapter.handleRawGift({
        userId: payload?.userId || `user_${Math.floor(Math.random() * 9000 + 1000)}`,
        username: payload?.username || `Player_${Math.floor(Math.random() * 89 + 10)}`,
        giftId: 'panda',
        giftName: 'Panda (10 Koin)',
      });
      break;
    }
    case 'ATTACK': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'rose',
          giftName: 'Rose (1 Koin)',
          giftCount: payload?.quantity || 1,
        });
      }
      break;
    }
    case 'SPAM_ATTACK': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'rose',
          giftName: 'Rose (x5 Combo Spam)',
          giftCount: 5,
        });
      }
      break;
    }
    case 'HEAL': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'doughnut',
          giftName: 'Donat (30 Koin)',
        });
      }
      break;
    }
    case 'DAMAGE_BUFF': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'lightning',
          giftName: 'Petir GG (2X DMG 10s)',
        });
      }
      break;
    }
    case 'EVOLVE_MANUAL': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'cap_mustache',
          giftName: 'Topi & Kumis (99 Koin)',
        });
      }
      break;
    }
    case 'SPECIAL': {
      const state = engine.getFullState();
      const activeUser = payload?.userId || (state.players.length > 0 ? state.players[Math.floor(Math.random() * state.players.length)].platformUserId : undefined);
      if (activeUser) {
        adapter.handleRawGift({
          userId: activeUser,
          username: payload?.username || 'Player',
          giftId: 'cap_mustache',
          giftName: 'Topi Kumis Special',
        });
      }
      break;
    }
    case 'REVIVE': {
      const state = engine.getFullState();
      const deadUser = payload?.userId || state.players.find((p) => p.status === 'DEAD')?.platformUserId;
      if (deadUser) {
        adapter.handleRawGift({
          userId: deadUser,
          username: payload?.username || 'Player',
          giftId: 'dragon',
          giftName: 'Dragon (Revive)',
        });
      }
      break;
    }
    case 'RESET_MATCH': {
      engine.resetMatch();
      break;
    }
    case 'SIMULATE_4_JOIN':
    case 'SIMULATE_5_JOIN': {
      const BOT_PRESETS = [
        { id: 'usr_garuda', name: 'Garuda_Red' },
        { id: 'usr_titan', name: 'Titan_Green' },
        { id: 'usr_viper', name: 'Viper_Blue' },
        { id: 'usr_apex', name: 'Apex_Yellow' },
      ];
      for (const bot of BOT_PRESETS) {
        adapter.handleRawGift({
          userId: bot.id,
          username: bot.name,
          giftId: 'panda',
          giftName: 'Panda (10 Koin)',
        });
      }
      break;
    }
    case 'TOGGLE_AUTO_BOT': {
      engine.toggleAutoBotMode();
      break;
    }
    case 'EVOLVE': {
      engine.devEvolvePlayer(payload?.userId);
      break;
    }
  }
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal server error:', err);
});
