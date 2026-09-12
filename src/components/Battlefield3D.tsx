/**
 * TikTok Live 3D Tank Battle - 2.5D Diorama Three.js Battlefield
 * Renders 3D Tanks, 3D Environment Obstacles, Slot Pedestals, Evolution Transformations, Projectiles,
 * Combat Particles, and 2D/3D Floating UI Overlays with Avatars.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARENA_THEMES, EVOLUTION_SPECS, PLAYER_SLOT_COLORS } from '../config/gameConfig';
import { CombatEffect, FullGameState, Player, Projectile, ThemeId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { createArenaPerimeter, ArenaPerimeterObjects } from './ArenaPerimeter';

interface Battlefield3DProps {
  gameState: FullGameState;
}

// 4 Corner Slot Coordinates forming a PERFECT EQUILATERAL SQUARE (8.4 x 8.4 units)
const SLOT_POSITIONS = [
  { x: -4.2, y: 4.2, slotIndex: 0 },  // Slot 0 (Red: Bottom Left)
  { x: 4.2, y: -4.2, slotIndex: 1 },  // Slot 1 (Green: Top Right)
  { x: -4.2, y: -4.2, slotIndex: 2 }, // Slot 2 (Blue: Top Left)
  { x: 4.2, y: 4.2, slotIndex: 3 },   // Slot 3 (Yellow: Bottom Right)
];

// Helper to generate a rich, high-resolution procedural ground texture for the arena floor
function createGroundCanvasTexture(theme: ThemeId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024; // Square 1:1 ground texture
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;

  let bgGradient: CanvasGradient;
  let plateColor: string;
  let grooveColor: string;
  let accentColor: string;
  let textColor: string;

  if (theme === 'FROZEN_ICE') {
    bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(0.5, '#1e3d59');
    bgGradient.addColorStop(1, '#071e3d');
    plateColor = '#1e293b';
    grooveColor = '#00f2fe';
    accentColor = '#00c6ff';
    textColor = '#38bdf8';
  } else if (theme === 'VOLCANIC') {
    bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#110003');
    bgGradient.addColorStop(0.5, '#2a0a10');
    bgGradient.addColorStop(1, '#090002');
    plateColor = '#18181b';
    grooveColor = '#ff2e63';
    accentColor = '#ff0033';
    textColor = '#f43f5e';
  } else {
    // DESERT (Default)
    bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#3a2712');
    bgGradient.addColorStop(0.5, '#5c4028');
    bgGradient.addColorStop(1, '#3a2712');
    plateColor = '#4a3522';
    grooveColor = '#d4a359';
    accentColor = '#ff8c00';
    textColor = '#fbbf24';
  }

  // 1. Base Fill
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // 2. Reinforced Metal Floor Plates Grid
  const cols = 10;
  const rows = 8;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;

      // Plate fill
      ctx.fillStyle = plateColor;
      ctx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);

      // Plate groove border
      ctx.strokeStyle = grooveColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);

      // Corner Rivets
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.7;
      const rivetR = 2.5;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, rivetR, 0, Math.PI * 2);
      ctx.arc(x + cellW - 8, y + 8, rivetR, 0, Math.PI * 2);
      ctx.arc(x + 8, y + cellH - 8, rivetR, 0, Math.PI * 2);
      ctx.arc(x + cellW - 8, y + cellH - 8, rivetR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;

  // 3. Hazard Stripes Perimeter Frame
  const borderThick = 24;
  ctx.save();
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.85;

  for (let x = 0; x < w; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 15, 0);
    ctx.lineTo(x, borderThick);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + 15, h);
    ctx.lineTo(x, h - borderThick);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Outer Perimeter Frame Line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(borderThick, borderThick, w - borderThick * 2, h - borderThick * 2);

  // 4. Center Tactical Battle Emblem
  const cx = w / 2;
  const cy = h / 2;
  const radius = 180;

  // Target Rings
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([12, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crosshairs
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - radius - 30, cy);
  ctx.lineTo(cx + radius + 30, cy);
  ctx.moveTo(cx, cy - radius - 30);
  ctx.lineTo(cx, cy + radius + 30);
  ctx.stroke();

  // Center Text Logo
  ctx.fillStyle = textColor;
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.9;
  ctx.fillText('TIKTOK TANK ARENA', cx, cy - 12);

  ctx.font = '700 14px sans-serif';
  ctx.fillText('⚡ COMBAT ZONE ⚡', cx, cy + 16);

  // Sector Markings
  ctx.font = '800 13px monospace';
  ctx.globalAlpha = 0.65;
  ctx.fillText('[SECTOR A - NORTH]', cx, borderThick + 22);
  ctx.fillText('[SECTOR B - SOUTH]', cx, h - borderThick - 14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

// Helper to generate a clean 2D SVG Avatar data URI for players without avatarUrl
const getFallbackAvatar = (username: string, color: string) => {
  const initial = (username[0] || 'T').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="50" fill="${color}" />
    <circle cx="50" cy="38" r="22" fill="#ffffff" opacity="0.9" />
    <path d="M20 85 C20 65, 35 55, 50 55 C65 55, 80 65, 80 85 Z" fill="#ffffff" opacity="0.9" />
    <text x="50" y="44" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="${color}" text-anchor="middle">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Universal Three.js Memory & GPU Resource Disposal Helper
 * Prevents WebGL memory leaks during rapid projectile and FX lifecycles
 */
function disposeThreeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m && typeof m.dispose === 'function' && m.dispose());
        } else if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
    }
  });
}

export const Battlefield3D: React.FC<Battlefield3DProps> = ({ gameState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Object pools and references
  const tankGroupMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const projectileGroupMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const slotHologramMapRef = useRef<Map<number, THREE.Group>>(new Map());
  const centerCrystalRef = useRef<THREE.Mesh | null>(null);
  const obstaclesGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const perimeterRef = useRef<ArenaPerimeterObjects | null>(null);

  const processedEffectIdsRef = useRef<Set<string>>(new Set());
  const cameraShakeRef = useRef<number>(0);
  const activeFXListRef = useRef<Array<{ update: (dt: number) => boolean }>>([]);
  const recoilMapRef = useRef<Map<string, number>>(new Map());
  const gameStateRef = useRef<FullGameState>(gameState);
  gameStateRef.current = gameState;

  // Festive Celebration Timers
  const victoryFireworkTimerRef = useRef<number>(0);
  const victoryConfettiSpawnedRef = useRef<boolean>(false);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = Math.max(containerRef.current.clientWidth || 400, 320);
    const height = Math.max(containerRef.current.clientHeight || 400, 320);

    // Clear container and ref maps to prevent orphaned objects in StrictMode / remounts
    containerRef.current.innerHTML = '';
    tankGroupMapRef.current.clear();
    projectileGroupMapRef.current.clear();
    slotHologramMapRef.current.clear();
    activeFXListRef.current = [];

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0b0e14');
    scene.fog = new THREE.Fog('#0b0e14', 45, 120);

    // 2. Camera (High Top-Down Straight Birds-Eye View directly above the arena, no horizontal tilt)
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 22.5, 9.5);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'w-full h-full block pointer-events-none';
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // 4. Bright Crystal-Clear Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(12, 22, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 14;
    dirLight.shadow.camera.bottom = -14;
    scene.add(dirLight);

    // Fill light to eliminate dark shadows
    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.9);
    fillLight.position.set(-12, 18, -10);
    scene.add(fillLight);

    // 5. High-Quality Textured Ground Plane (Square Arena Floor 16x16)
    const groundTexture = createGroundCanvasTexture(gameState.theme);
    const groundGeo = new THREE.PlaneGeometry(16.4, 16.4);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.4,
      metalness: 0.5,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMeshRef.current = groundMesh;
    scene.add(groundMesh);

    // 6. 3D Slot Pedestals & Empty Holograms
    SLOT_POSITIONS.forEach((slot) => {
      const slotColorHex = PLAYER_SLOT_COLORS[slot.slotIndex];

      // Base Pedestal Mesh
      const pedGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.15, 24);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
      });
      const pedMesh = new THREE.Mesh(pedGeo, pedMat);
      pedMesh.position.set(slot.x, 0.07, slot.y);
      pedMesh.receiveShadow = true;
      scene.add(pedMesh);

      // Glowing Outer Ring
      const ringGeo = new THREE.RingGeometry(1.42, 1.52, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(slotColorHex),
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(slot.x, 0.16, slot.y);
      scene.add(ringMesh);

      // Hologram Group for Empty Slot
      const holoGroup = new THREE.Group();
      holoGroup.position.set(slot.x, 0.2, slot.y);

      const holoCylGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 16, 1, true);
      const holoCylMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(slotColorHex),
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const holoCyl = new THREE.Mesh(holoCylGeo, holoCylMat);
      holoCyl.position.y = 0.75;
      holoGroup.add(holoCyl);

      // Rotating Hologram Core Beacon
      const coreGeo = new THREE.OctahedronGeometry(0.35, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(slotColorHex),
        emissive: new THREE.Color(slotColorHex),
        emissiveIntensity: 0.8,
        wireframe: true,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.name = 'holoCore';
      coreMesh.position.y = 1.2;
      holoGroup.add(coreMesh);

      scene.add(holoGroup);
      slotHologramMapRef.current.set(slot.slotIndex, holoGroup);
    });

    // 7. High-Detail Industrial Military Perimeter Fortifications, Blast Walls & Corner Towers
    const perimeter = createArenaPerimeter(16.8);
    scene.add(perimeter.group);
    perimeterRef.current = perimeter;

    // 8. Soft Falling Snow Particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 120;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 22;
      posArray[i + 1] = Math.random() * 8 + 0.5;
      posArray[i + 2] = (Math.random() - 0.5) * 18;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.11,
      color: 0xe0f7fa,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particlesRef.current = particles;
    scene.add(particles);

    // Resize Observer with threshold checking to avoid subpixel scroll jitter loop
    let lastW = width;
    let lastH = height;
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      if (Math.abs(w - lastW) < 3 && Math.abs(h - lastH) < 3) return;
      lastW = w;
      lastH = h;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = 0.016; // ~60fps frame delta

      // Update Active 3D Particle Systems (Explosions, Muzzle Flash, Evolution Beams, Sparks)
      activeFXListRef.current = activeFXListRef.current.filter((fx) => fx.update(dt));

      // Continuous 60fps Tank Sync & Turret Rotation
      const currentGs = gameStateRef.current;
      const activeScene = sceneRef.current;
      if (currentGs && activeScene) {
        for (const player of currentGs.players) {
          let tankGroup = tankGroupMapRef.current.get(player.platformUserId);
          if (!tankGroup || tankGroup.parent !== activeScene) {
            if (tankGroup && tankGroup.parent) {
              tankGroup.parent.remove(tankGroup);
            }
            tankGroup = createTankMeshGroup(player);
            tankGroupMapRef.current.set(player.platformUserId, tankGroup);
            activeScene.add(tankGroup);
          }

          const recoil = recoilMapRef.current.get(player.platformUserId) || 0;
          const angleRad = (player.position.angle * Math.PI) / 180;
          tankGroup.position.x = player.position.x - Math.sin(angleRad) * recoil;
          tankGroup.position.y = 0;
          tankGroup.position.z = player.position.y - Math.cos(angleRad) * recoil;
          tankGroup.visible = true;

          const evoSpec = EVOLUTION_SPECS[player.evolutionLevel] || EVOLUTION_SPECS[1];
          const targetScale = (evoSpec?.scale || 1.0) * 1.35;
          tankGroup.scale.set(targetScale, targetScale, targetScale);

          const turretMesh = tankGroup.getObjectByName('turretGroup');
          if (turretMesh) {
            turretMesh.rotation.y = angleRad;
            turretMesh.position.z = -recoil * 0.5;
          }
        }
      }

      // Update Tank Recoil Decay
      tankGroupMapRef.current.forEach((_, userId) => {
        const recoil = recoilMapRef.current.get(userId) || 0;
        if (recoil > 0.005) {
          recoilMapRef.current.set(userId, recoil * 0.82);
        } else {
          recoilMapRef.current.set(userId, 0);
        }
      });

      // Rotate Hologram Beacons
      slotHologramMapRef.current.forEach((holoGroup) => {
        const core = holoGroup.getObjectByName('holoCore');
        if (core) {
          core.rotation.y += 0.03;
        }
      });

      // Animate Perimeter Radar Dishes, Strobes, Forcefield & Warning Bollards
      if (perimeterRef.current) {
        perimeterRef.current.update(dt, performance.now() * 0.001);
      }

      // Animate floating dust/particles
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.015;
          if (positions[i] < 0) positions[i] = 8;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Victory Celebration Fireworks Loop (During RESULT state)
      if (gameStateRef.current.state === 'RESULT' && sceneRef.current) {
        if (!victoryConfettiSpawnedRef.current) {
          activeFXListRef.current.push(spawn3DConfettiVictory(sceneRef.current));
          victoryConfettiSpawnedRef.current = true;
        }

        victoryFireworkTimerRef.current += dt;
        if (victoryFireworkTimerRef.current > 0.35) {
          victoryFireworkTimerRef.current = 0;
          const rx = (Math.random() - 0.5) * 16;
          const rz = (Math.random() - 0.5) * 12;
          const ry = 4.5 + Math.random() * 3.5;
          activeFXListRef.current.push(spawn3DFirework(sceneRef.current, rx, ry, rz));
        }
      } else {
        victoryConfettiSpawnedRef.current = false;
        victoryFireworkTimerRef.current = 0;
      }

      // Camera Shake
      if (cameraRef.current) {
        if (cameraShakeRef.current > 0) {
          cameraShakeRef.current -= 0.04;
          const rx = (Math.random() - 0.5) * cameraShakeRef.current;
          const ry = (Math.random() - 0.5) * cameraShakeRef.current;
          cameraRef.current.position.set(rx, 22.5 + ry, 9.5 + rx);
        } else {
          cameraRef.current.position.set(0, 22.5, 9.5);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
        rendererRef.current.dispose();
      }
      tankGroupMapRef.current.forEach((g) => disposeThreeObject(g));
      tankGroupMapRef.current.clear();
      projectileGroupMapRef.current.forEach((g) => disposeThreeObject(g));
      projectileGroupMapRef.current.clear();
      slotHologramMapRef.current.forEach((g) => disposeThreeObject(g));
      slotHologramMapRef.current.clear();
      if (groundMeshRef.current) {
        disposeThreeObject(groundMeshRef.current);
      }
      if (perimeterRef.current) {
        perimeterRef.current.dispose();
        perimeterRef.current = null;
      }
      if (sceneRef.current) {
        disposeThreeObject(sceneRef.current);
      }
      activeFXListRef.current = [];
      sceneRef.current = null;
    };
  }, []);

  // Update Theme Materials
  useEffect(() => {
    if (!sceneRef.current || !groundMeshRef.current) return;

    const themeConfig = ARENA_THEMES[gameState.theme] || ARENA_THEMES.DESERT;

    // Update Ground Texture Map
    const groundMat = groundMeshRef.current.material as THREE.MeshStandardMaterial;
    if (groundMat.map) groundMat.map.dispose();
    groundMat.map = createGroundCanvasTexture(gameState.theme);
    groundMat.needsUpdate = true;

    sceneRef.current.background = new THREE.Color(themeConfig.skyColor);
    if (sceneRef.current.fog) {
      (sceneRef.current.fog as THREE.FogExp2).color.set(themeConfig.skyColor);
    }

    if (particlesRef.current) {
      const pMat = particlesRef.current.material as THREE.PointsMaterial;
      if (themeConfig.particles === 'SNOW') pMat.color.set('#ffffff');
      else if (themeConfig.particles === 'EMBERS') pMat.color.set('#ff2e63');
      else pMat.color.set('#ffd08a');
    }
  }, [gameState.theme]);

  // Sync Tanks, Holograms & Projectiles
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const occupiedSlots = new Set<number>();
    const activeUserIds = new Set(gameState.players.map((p) => p.platformUserId));

    // Remove deleted tanks
    tankGroupMapRef.current.forEach((group, userId) => {
      if (!activeUserIds.has(userId)) {
        scene.remove(group);
        disposeThreeObject(group);
        tankGroupMapRef.current.delete(userId);
      }
    });

    // Create / Update Tanks
    for (const player of gameState.players) {
      occupiedSlots.add(player.slotIndex);
      let tankGroup = tankGroupMapRef.current.get(player.platformUserId);

      // Recreate tank model if evolution level changes, not spawned, or detached from scene
      if (!tankGroup || tankGroup.userData.evolutionLevel !== player.evolutionLevel || tankGroup.parent !== scene) {
        if (tankGroup && tankGroup.parent) {
          tankGroup.parent.remove(tankGroup);
          disposeThreeObject(tankGroup);
        }
        tankGroup = createTankMeshGroup(player);
        tankGroupMapRef.current.set(player.platformUserId, tankGroup);
        scene.add(tankGroup);
      }

      // Smooth Position Interpolation
      tankGroup.position.x = player.position.x;
      tankGroup.position.y = 0;
      tankGroup.position.z = player.position.y;

      // Turret Rotation (Aligned with barrel heading in X-Z space)
      const turretMesh = tankGroup.getObjectByName('turretGroup');
      if (turretMesh) {
        const rad = (player.position.angle * Math.PI) / 180;
        turretMesh.rotation.y = rad;
      }

      // Evolution Scale (Boosted 1.35x for arcade prominence)
      const evoSpec = EVOLUTION_SPECS[player.evolutionLevel] || EVOLUTION_SPECS[1];
      const targetScale = (evoSpec?.scale || 1.0) * 1.35;
      tankGroup.scale.set(targetScale, targetScale, targetScale);

      // Hit Flash Animation
      if (player.isHitFlashing) {
        tankGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
            (child.material as THREE.MeshStandardMaterial).emissive.set('#ffffff');
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
          }
        });
      } else {
        const slotColor = new THREE.Color(player.color);
        tankGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
            if (child.name === 'glowAccent') {
              (child.material as THREE.MeshStandardMaterial).emissive.set(slotColor);
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
            } else if (child.name === 'armorPlate') {
              (child.material as THREE.MeshStandardMaterial).emissive.set(slotColor);
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12; // Natural tactical sheen with visible 3D shadows and bevels
            } else if (child.name === 'headlight') {
              (child.material as THREE.MeshStandardMaterial).emissive.set('#ffffff');
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;
            } else if (child.name === 'taillight') {
              (child.material as THREE.MeshStandardMaterial).emissive.set('#ff1122');
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8;
            } else {
              (child.material as THREE.MeshStandardMaterial).emissive.set('#000000');
              (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
            }
          }
        });
      }

      // Always keep tank visible on the arena, dim colors if defeated
      tankGroup.visible = true;
      if (player.status === 'DEAD') {
        tankGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
            (child.material as THREE.MeshStandardMaterial).emissive.set('#1e293b');
            (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
          }
        });
      }
    }

    // Toggle Empty Slot Hologram Visibility
    slotHologramMapRef.current.forEach((holoGroup, slotIdx) => {
      holoGroup.visible = !occupiedSlots.has(slotIdx);
    });

    // Sync 3D Rocket Missile Projectiles
    const activeProjIds = new Set(gameState.projectiles.map((p) => p.id));
    projectileGroupMapRef.current.forEach((mesh, projId) => {
      if (!activeProjIds.has(projId)) {
        scene.remove(mesh);
        disposeThreeObject(mesh);
        projectileGroupMapRef.current.delete(projId);
      }
    });

    for (const proj of gameState.projectiles) {
      let pMesh = projectileGroupMapRef.current.get(proj.id);

      if (!pMesh) {
        pMesh = createProjectileMeshGroup(proj);
        projectileGroupMapRef.current.set(proj.id, pMesh);
        scene.add(pMesh);

        soundEngine.playLaserShot(proj.evolutionLevel);
      }

      pMesh.position.set(proj.position.x, 0.5, proj.position.y);
      // Orient missile heading direction 100% straight along velocity vector
      if (proj.velocity.x !== 0 || proj.velocity.y !== 0) {
        pMesh.rotation.y = Math.atan2(proj.velocity.x, proj.velocity.y);
      } else {
        const rawAngle = proj.angle !== undefined && !isNaN(proj.angle) ? proj.angle : 0;
        pMesh.rotation.y = (rawAngle * Math.PI) / 180;
      }
    }

    // 3D Visual Particle FX & Audio Cues Trigger by Effect ID
    const currentEffectIds = new Set<string>();
    for (const effect of gameState.effects) {
      currentEffectIds.add(effect.id);
      if (!processedEffectIdsRef.current.has(effect.id)) {
        processedEffectIdsRef.current.add(effect.id);
        if (sceneRef.current) {
          const { x, y } = effect.position;
          const color = effect.color || '#ffffff';

          if (effect.type === 'EXPLOSION') {
            soundEngine.playExplosion();
            cameraShakeRef.current = 0.9;
            activeFXListRef.current.push(spawn3DExplosion(sceneRef.current, x, y, color));
            activeFXListRef.current.push(spawn3DFirework(sceneRef.current, x, 3.5, y, color));
          } else if (effect.type === 'MUZZLE') {
            activeFXListRef.current.push(spawn3DMuzzleFlash(sceneRef.current, x, y, color));
            for (const p of gameState.players) {
              const dx = p.position.x - x;
              const dy = p.position.y - y;
              if (dx * dx + dy * dy < 6.0) {
                recoilMapRef.current.set(p.platformUserId, 0.45);
                break;
              }
            }
          } else if (effect.type === 'EVOLUTION') {
            soundEngine.playEvolution();
            cameraShakeRef.current = 0.8;
            activeFXListRef.current.push(spawn3DEvolutionBeam(sceneRef.current, x, y, color));
            activeFXListRef.current.push(spawn3DFirework(sceneRef.current, x, 5.0, y, '#ffea00'));
          } else if (effect.type === 'HIT') {
            soundEngine.playHit();
            cameraShakeRef.current = 0.4;
            activeFXListRef.current.push(spawn3DHitSparks(sceneRef.current, x, y, color));
          } else if (effect.type === 'HEAL') {
            soundEngine.playHeal();
            activeFXListRef.current.push(spawn3DHealAura(sceneRef.current, x, y));
          } else if (effect.type === 'SPAWN') {
            activeFXListRef.current.push(spawn3DEvolutionBeam(sceneRef.current, x, y, color));
            activeFXListRef.current.push(spawn3DFirework(sceneRef.current, x, 4.0, y, color));
          }
        }
      }
    }

    // Prune old processed IDs that are no longer present in server's active effects
    const activeServerIds = new Set(gameState.effects.map((e) => e.id));
    processedEffectIdsRef.current.forEach((id) => {
      if (!activeServerIds.has(id)) {
        processedEffectIdsRef.current.delete(id);
      }
    });
  }, [gameState]);

  // Find empty slot positions
  const occupiedSlotIndices = new Set(gameState.players.map((p) => p.slotIndex));
  const emptySlots = SLOT_POSITIONS.filter((s) => !occupiedSlotIndices.has(s.slotIndex));

  // Helper: Project 3D World coordinates to Screen percentages (%) with bounds clamping
  const getScreenPos = (worldX: number, worldZ: number, worldY = 0.9) => {
    if (!cameraRef.current) {
      return {
        x: Math.max(8, Math.min(92, ((worldX + 10) / 20) * 100)),
        y: Math.max(10, Math.min(88, ((worldZ + 8) / 16) * 100)),
      };
    }
    const vec = new THREE.Vector3(worldX, worldY, worldZ);
    vec.project(cameraRef.current);
    const screenX = ((vec.x + 1) / 2) * 100;
    const screenY = ((-vec.y + 1) / 2) * 100;
    return {
      x: Math.max(6, Math.min(94, screenX)),
      y: Math.max(7, Math.min(91, screenY)),
    };
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full touch-pan-y" />

      {/* 2D Overlay Layer: Avatars, Hearts, Empty Slot Prompts, Damage Text */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* 1. Empty Slot "JOIN" 2D Floating Banners */}
        {emptySlots.map((slot) => {
          const pos = getScreenPos(slot.x, slot.y, 1.2);
          const colorHex = PLAYER_SLOT_COLORS[slot.slotIndex];

          return (
            <div
              key={`empty_slot_${slot.slotIndex}`}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 transition-all"
              style={{
                left: `${pos.x}%`,
                top: `calc(${pos.y}% - 12px)`,
              }}
            >
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white shadow-md backdrop-blur-md flex items-center gap-1 border border-white/20 animate-pulse"
                style={{ backgroundColor: `${colorHex}cc` }}
              >
                <span>SLOT #{slot.slotIndex + 1}</span>
                <span className="bg-black/40 px-1 py-0.2 rounded text-[8px]">🌹 JOIN</span>
              </div>
            </div>
          );
        })}

        {/* 2. Active & Defeated Players Floating 2D Profile Cards (Lifted comfortably above tank) */}
        {gameState.players.map((player) => {
          const pos = getScreenPos(player.position.x, player.position.y, 2.8);
          const isDead = player.status === 'DEAD';
          const avatarSrc = player.avatarUrl || getFallbackAvatar(player.username, player.color);

          const teamNames = ['GARUDA', 'TITAN', 'VIPER', 'APEX'];
          const teamIcons = ['🔴', '🟢', '🔵', '🟡'];
          const slotNum = (player.slotIndex ?? 0) + 1;
          const teamName = teamNames[player.slotIndex ?? 0] || 'TANK';
          const teamIcon = teamIcons[player.slotIndex ?? 0] || '🛡️';

          const evoTitles = ['SCOUT', 'HEAVY', 'RAILGUN', 'MECH'];
          const evoStars = ['⭐', '⭐⭐', '⭐⭐⭐', '👑'];
          const evoTitle = evoTitles[player.evolutionLevel - 1] || 'SCOUT';
          const evoStar = evoStars[player.evolutionLevel - 1] || '⭐';

          return (
            <div
              key={player.platformUserId}
              className={`absolute -translate-x-1/2 -translate-y-full transition-all duration-75 ease-linear flex flex-col items-center gap-0.5 pointer-events-none ${
                isDead ? 'opacity-65 scale-85' : 'opacity-100 scale-95'
              }`}
              style={{
                left: `${pos.x}%`,
                top: `calc(${pos.y}% - 16px)`,
              }}
            >
              {/* Hearts Display or Defeated Badge */}
              {isDead ? (
                <div className="bg-red-950/90 border border-red-500/60 text-red-300 px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                  💀 DEFEATED
                </div>
              ) : (
                <div className="flex items-center gap-0.5 bg-black/85 px-2 py-0.5 rounded-full border border-slate-700/80 shadow-md backdrop-blur-md">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: player.maxHearts }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-[9px] transition-transform ${
                          i < player.hearts ? 'text-red-500 scale-100' : 'text-slate-600 scale-75 opacity-40'
                        }`}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                  <span className="text-[8.5px] font-black text-slate-300 ml-1">
                    {player.hearts}/{player.maxHearts}
                  </span>
                </div>
              )}

              {/* Player Tag with Team Badge, Compact Avatar & Evolution Title */}
              <div
                className="px-1.5 py-0.5 rounded-lg text-[10px] font-black tracking-wide uppercase text-white shadow-lg border flex items-center gap-1 backdrop-blur-md"
                style={{
                  backgroundColor: isDead ? '#1e293b' : '#0f172aee',
                  borderColor: player.color,
                  boxShadow: `0 0 8px ${player.color}40`,
                }}
              >
                {/* Team Slot Badge */}
                <span
                  className="text-[8px] font-black px-1 py-0.2 rounded text-white flex items-center gap-0.5 shadow-sm"
                  style={{ backgroundColor: player.color }}
                  title={`Slot #${slotNum} ${teamName}`}
                >
                  <span>{teamIcon}</span>
                  <span>#{slotNum}</span>
                </span>

                {/* 2D Profile Picture */}
                <img
                  src={avatarSrc}
                  alt={player.username}
                  className="w-3.5 h-3.5 rounded-full object-cover border border-white/80 shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackAvatar(player.username, player.color);
                  }}
                />
                <span className="truncate max-w-[65px] text-slate-100 text-[9.5px]">@{player.username}</span>

                {/* Evolution Badge */}
                <span
                  className="text-[8px] font-black px-1 py-0.2 rounded text-amber-300 bg-amber-950/80 border border-amber-500/40 flex items-center gap-0.5 shadow-sm"
                  title={`Level ${player.evolutionLevel}: ${evoTitle}`}
                >
                  <span>{evoStar}</span>
                  <span>L{player.evolutionLevel}</span>
                </span>

                {/* Damage Boost 2X Active Timer */}
                {player.damageBoostUntil && player.damageBoostUntil > Date.now() && (
                  <span className="text-[8px] font-black px-1 py-0.2 rounded text-black bg-gradient-to-r from-amber-300 to-yellow-400 border border-yellow-200 animate-pulse flex items-center gap-0.5 shadow-[0_0_8px_rgba(255,215,0,0.8)]">
                    <span>⚡</span>
                    <span>2X ({Math.ceil((player.damageBoostUntil - Date.now()) / 1000)}s)</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* 3. Floating Combat Damage / FX Text (Vibrant TikTok Arcade Popups) */}
        {gameState.effects.map((effect) => {
          if (!effect.text) return null;
          const pos = getScreenPos(effect.position.x, effect.position.y, 3.2);
          const isEvo = effect.type === 'EVOLUTION' || effect.type === 'SPAWN';
          const isExplosion = effect.type === 'EXPLOSION';
          const isHeal = effect.type === 'HEAL';

          return (
            <div
              key={effect.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-bounce font-black tracking-wider uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,1)] ${
                isEvo
                  ? 'px-3 py-1 rounded-full text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 text-white border-2 border-white shadow-[0_0_15px_rgba(255,200,0,0.8)] scale-110'
                  : isExplosion
                  ? 'px-2 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-red-600 to-amber-600 text-white border border-amber-300 shadow-[0_0_12px_rgba(255,69,0,0.9)]'
                  : isHeal
                  ? 'px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(0,255,136,0.6)]'
                  : 'text-xs font-black px-2 py-0.5 rounded-md bg-black/90 border border-white/40 backdrop-blur-sm shadow-md'
              }`}
              style={{
                left: `${pos.x}%`,
                top: `calc(${pos.y}% - 22px)`,
                color: isEvo ? '#ffffff' : effect.color || '#ffea00',
              }}
            >
              {effect.text}
            </div>
          );
        })}
      </div>

      {/* 2D TikTok Gift Action Legend (Bottom Bar Overlay) */}
      <div className="absolute bottom-1.5 left-2 right-2 bg-slate-900/95 border border-slate-700/80 rounded-lg px-2 py-1.5 flex flex-wrap items-center justify-between text-[9.5px] font-black text-slate-200 backdrop-blur-md shadow-xl pointer-events-none">
        <div className="flex items-center gap-1 text-emerald-400">
          <span>🐼</span>
          <span>10 KOIN = MASUK ARENA</span>
        </div>
        <div className="flex items-center gap-1 text-rose-400">
          <span>🌹</span>
          <span>ROSE = TEMBAK (SPAM)</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <span>🍩</span>
          <span>DONAT = ISI DARAH</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-300">
          <span>⚡</span>
          <span>PETIR = 2X DEMEG (10s)</span>
        </div>
        <div className="flex items-center gap-1 text-purple-400">
          <span>🎩</span>
          <span>TOPI KUMIS = EVOLUSI</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Creates 3D Procedural Rocket Missile Projectile Group
 */
function createProjectileMeshGroup(proj: Projectile): THREE.Group {
  const pGroup = new THREE.Group();
  const isHighEvo = proj.evolutionLevel >= 3;
  const isLegendary = proj.evolutionLevel >= 4;

  const coreColor = proj.isBoosted
    ? new THREE.Color('#ffe600')
    : isLegendary
    ? new THREE.Color('#ff00ff')
    : isHighEvo
    ? new THREE.Color('#00ffff')
    : new THREE.Color('#ffaa00');

  const glowColor = proj.isBoosted
    ? new THREE.Color('#ff9900')
    : isHighEvo
    ? new THREE.Color('#00f0ff')
    : new THREE.Color('#ff3300');

  // 1. Sleek Rocket Body
  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.65, 12);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: proj.isBoosted ? 0xffea00 : 0x222831,
    metalness: 0.9,
    roughness: 0.2,
    emissive: proj.isBoosted ? 0xff9900 : 0x000000,
    emissiveIntensity: proj.isBoosted ? 0.6 : 0,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.rotation.x = Math.PI / 2;
  pGroup.add(bodyMesh);

  // 2. Pointed Aerodynamic Nose Cone
  const noseGeo = new THREE.ConeGeometry(0.12, 0.35, 12);
  const noseMat = new THREE.MeshStandardMaterial({
    color: coreColor,
    emissive: coreColor,
    emissiveIntensity: proj.isBoosted ? 1.5 : 0.95,
    metalness: 0.7,
  });
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.rotation.x = Math.PI / 2;
  noseMesh.position.z = 0.45;
  pGroup.add(noseMesh);

  // 3. 4 Tail Stabilizer Fins
  const finMat = new THREE.MeshStandardMaterial({ color: 0x393e46, metalness: 0.8 });
  const finGeo = new THREE.BoxGeometry(0.04, 0.28, 0.22);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.z = -0.2;
    pGroup.add(fin);
  }

  // 4. Rear Plasma Thruster Engine Flame Core
  const jetGeo = new THREE.SphereGeometry(proj.isBoosted ? 0.22 : 0.14, 12, 12);
  const jetMat = new THREE.MeshBasicMaterial({ color: glowColor });
  const jetMesh = new THREE.Mesh(jetGeo, jetMat);
  jetMesh.position.z = -0.36;
  pGroup.add(jetMesh);

  // 5. Plasma Energy Ring (for boosted or level 3+)
  if (proj.isBoosted || isHighEvo) {
    const ringGeo = new THREE.TorusGeometry(proj.isBoosted ? 0.28 : 0.22, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: coreColor });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.z = 0.1;
    pGroup.add(ringMesh);
  }

  pGroup.scale.setScalar(proj.evolutionLevel >= 4 ? 1.4 : proj.evolutionLevel >= 3 ? 1.2 : 1.0);

  return pGroup;
}

/**
 * Creates 3D Procedural Tank Mesh Group for all 4 distinct Evolution Levels
 */
function createTankMeshGroup(player: Player): THREE.Group {
  const group = new THREE.Group();
  group.userData.evolutionLevel = player.evolutionLevel;

  const teamColor = new THREE.Color(player.color);
  const darkMetalColor = new THREE.Color('#1a1f29'); // Deep tactical military titanium
  const gunmetalColor = new THREE.Color('#2d3644'); // Machined dark steel

  // Standard Materials
  const baseFrameMat = new THREE.MeshStandardMaterial({
    color: darkMetalColor,
    roughness: 0.35,
    metalness: 0.75,
  });

  const armorPlateMat = new THREE.MeshStandardMaterial({
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 0.12, // Vibrant tactical saturation with realistic 3D bevels & shadows
    roughness: 0.22,
    metalness: 0.45,
  });

  const neonAccentMat = new THREE.MeshStandardMaterial({
    color: teamColor,
    emissive: teamColor,
    emissiveIntensity: 1.5,
    roughness: 0.05,
    metalness: 0.2,
  });

  const treadMat = new THREE.MeshStandardMaterial({
    color: 0x101317,
    roughness: 0.95,
    metalness: 0.15,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x323b49,
    roughness: 0.4,
    metalness: 0.65,
  });

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x8898aa,
    roughness: 0.2,
    metalness: 0.9,
  });

  const cannonMat = new THREE.MeshStandardMaterial({
    color: gunmetalColor,
    metalness: 0.85,
    roughness: 0.25,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 2.5,
    roughness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff1122,
    emissive: new THREE.Color(0xff1122),
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });

  // Helper: Road Wheels on Treads
  const addRoadWheels = (targetGroup: THREE.Group, zPositions: number[], xOffset: number, radius = 0.16, y = 0.16) => {
    const wheelGeo = new THREE.CylinderGeometry(radius, radius, 0.07, 10);
    const hubGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, 0.08, 8);
    for (const z of zPositions) {
      const wLeft = new THREE.Mesh(wheelGeo, wheelMat);
      wLeft.rotation.z = Math.PI / 2;
      wLeft.position.set(-xOffset, y, z);
      const hLeft = new THREE.Mesh(hubGeo, hubMat);
      hLeft.rotation.z = Math.PI / 2;
      hLeft.position.set(-xOffset - 0.01, y, z);

      const wRight = new THREE.Mesh(wheelGeo, wheelMat);
      wRight.rotation.z = Math.PI / 2;
      wRight.position.set(xOffset, y, z);
      const hRight = new THREE.Mesh(hubGeo, hubMat);
      hRight.rotation.z = Math.PI / 2;
      hRight.position.set(xOffset + 0.01, y, z);

      targetGroup.add(wLeft, hLeft, wRight, hRight);
    }
  };

  const level = player.evolutionLevel;

  // ---------------------------------------------------------------------
  // LEVEL 1: SCOUT RECON LIGHT TANK
  // ---------------------------------------------------------------------
  if (level === 1) {
    // Lower Chassis (Dark Tactical Titanium)
    const chassisGeo = new THREE.BoxGeometry(1.35, 0.38, 1.8);
    const chassis = new THREE.Mesh(chassisGeo, baseFrameMat);
    chassis.position.y = 0.26;
    group.add(chassis);

    // Upper Front Glacis Sloped Armor (Team Color)
    const hoodGeo = new THREE.BoxGeometry(1.15, 0.12, 0.65);
    const hood = new THREE.Mesh(hoodGeo, armorPlateMat);
    hood.name = 'armorPlate';
    hood.rotation.x = -Math.PI / 9;
    hood.position.set(0, 0.42, 0.62);
    group.add(hood);

    // Front Chevron Insignia Plate
    const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.3), neonAccentMat);
    chevron.name = 'glowAccent';
    chevron.rotation.x = -Math.PI / 9;
    chevron.position.set(0, 0.49, 0.62);
    group.add(chevron);

    // Side Neon Runners
    const stripeGeo = new THREE.BoxGeometry(0.06, 0.08, 1.4);
    const s1 = new THREE.Mesh(stripeGeo, neonAccentMat);
    s1.name = 'glowAccent';
    s1.position.set(-0.69, 0.32, 0);
    const s2 = new THREE.Mesh(stripeGeo, neonAccentMat);
    s2.name = 'glowAccent';
    s2.position.set(0.69, 0.32, 0);
    group.add(s1, s2);

    // Front Xenon Headlights
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), headlightMat);
    hl1.name = 'headlight';
    hl1.position.set(-0.55, 0.32, 0.92);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), headlightMat);
    hl2.name = 'headlight';
    hl2.position.set(0.55, 0.32, 0.92);
    group.add(hl1, hl2);

    // Rear Red Taillights
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), taillightMat);
    tl1.name = 'taillight';
    tl1.position.set(-0.55, 0.32, -0.91);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), taillightMat);
    tl2.name = 'taillight';
    tl2.position.set(0.55, 0.32, -0.91);
    group.add(tl1, tl2);

    // Caterpillar Treads & Road Wheels
    const treadGeo = new THREE.BoxGeometry(0.32, 0.36, 1.95);
    const t1 = new THREE.Mesh(treadGeo, treadMat);
    t1.position.set(-0.84, 0.19, 0);
    const t2 = new THREE.Mesh(treadGeo, treadMat);
    t2.position.set(0.84, 0.19, 0);
    group.add(t1, t2);

    addRoadWheels(group, [-0.65, -0.22, 0.22, 0.65], 0.98, 0.15, 0.18);

    // Turret Assembly
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turretGroup';
    turretGroup.position.set(0, 0.52, 0);

    // Lower Turret Collar (Dark Steel)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.1, 14), baseFrameMat);
    collar.position.y = 0.06;
    turretGroup.add(collar);

    // Main Armored Turret Dome (Team Color)
    const domeGeo = new THREE.CylinderGeometry(0.52, 0.64, 0.32, 16);
    const dome = new THREE.Mesh(domeGeo, armorPlateMat);
    dome.name = 'armorPlate';
    dome.position.y = 0.22;
    turretGroup.add(dome);

    // Commander Hatch
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), baseFrameMat);
    hatch.position.set(-0.1, 0.38, -0.1);
    turretGroup.add(hatch);

    // Cannon Barrel
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.35, 12), cannonMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(0, 0.22, 0.88);
    turretGroup.add(cannon);

    // Glowing Neon Muzzle Brake
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), neonAccentMat);
    muzzle.name = 'glowAccent';
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.22, 1.56);
    turretGroup.add(muzzle);

    group.add(turretGroup);
  }
  // ---------------------------------------------------------------------
  // LEVEL 2: HEAVY ASSAULT DESTROYER (TWIN CANNONS & SIDE SKIRTS & MISSILE PODS)
  // ---------------------------------------------------------------------
  else if (level === 2) {
    // Chassis (Dark Tactical Titanium)
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.44, 2.1);
    const chassis = new THREE.Mesh(chassisGeo, baseFrameMat);
    chassis.position.y = 0.3;
    group.add(chassis);

    // Heavy Angled Front Glacis / Plow (Team Color Armor)
    const frontPlowGeo = new THREE.BoxGeometry(1.35, 0.2, 0.75);
    const frontPlow = new THREE.Mesh(frontPlowGeo, armorPlateMat);
    frontPlow.name = 'armorPlate';
    frontPlow.rotation.x = -Math.PI / 6;
    frontPlow.position.set(0, 0.44, 0.88);
    group.add(frontPlow);

    // Glowing V-Stripe on Plow
    const vStripe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.25), neonAccentMat);
    vStripe.name = 'glowAccent';
    vStripe.rotation.x = -Math.PI / 6;
    vStripe.position.set(0, 0.52, 0.88);
    group.add(vStripe);

    // Armored Side Skirts (Team Color)
    const skirtGeo = new THREE.BoxGeometry(0.08, 0.28, 1.95);
    const skirtLeft = new THREE.Mesh(skirtGeo, armorPlateMat);
    skirtLeft.name = 'armorPlate';
    skirtLeft.position.set(-1.08, 0.28, 0);
    const skirtRight = new THREE.Mesh(skirtGeo, armorPlateMat);
    skirtRight.name = 'armorPlate';
    skirtRight.position.set(1.08, 0.28, 0);
    group.add(skirtLeft, skirtRight);

    // Side Skirt Neon Runners
    const sStripeGeo = new THREE.BoxGeometry(0.04, 0.06, 1.85);
    const ssL = new THREE.Mesh(sStripeGeo, neonAccentMat);
    ssL.name = 'glowAccent';
    ssL.position.set(-1.13, 0.34, 0);
    const ssR = new THREE.Mesh(sStripeGeo, neonAccentMat);
    ssR.name = 'glowAccent';
    ssR.position.set(1.13, 0.34, 0);
    group.add(ssL, ssR);

    // Headlights & Taillights
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.06), headlightMat);
    hl1.name = 'headlight';
    hl1.position.set(-0.65, 0.36, 1.06);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.06), headlightMat);
    hl2.name = 'headlight';
    hl2.position.set(0.65, 0.36, 1.06);
    group.add(hl1, hl2);

    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.05), taillightMat);
    tl1.name = 'taillight';
    tl1.position.set(-0.65, 0.36, -1.06);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.05), taillightMat);
    tl2.name = 'taillight';
    tl2.position.set(0.65, 0.36, -1.06);
    group.add(tl1, tl2);

    // Treads & Road Wheels
    const treadGeo = new THREE.BoxGeometry(0.36, 0.4, 2.2);
    const t1 = new THREE.Mesh(treadGeo, treadMat);
    t1.position.set(-0.92, 0.21, 0);
    const t2 = new THREE.Mesh(treadGeo, treadMat);
    t2.position.set(0.92, 0.21, 0);
    group.add(t1, t2);

    addRoadWheels(group, [-0.75, -0.38, 0, 0.38, 0.75], 1.07, 0.16, 0.2);

    // Turret Assembly (Twin Heavy Cannons + Missile Launchers)
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turretGroup';
    turretGroup.position.set(0, 0.58, 0);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.1, 16), baseFrameMat);
    collar.position.y = 0.06;
    turretGroup.add(collar);

    const domeGeo = new THREE.CylinderGeometry(0.62, 0.76, 0.38, 16);
    const dome = new THREE.Mesh(domeGeo, armorPlateMat);
    dome.name = 'armorPlate';
    dome.position.y = 0.25;
    turretGroup.add(dome);

    // Twin Cannons
    const cGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.45, 12);
    const c1 = new THREE.Mesh(cGeo, cannonMat);
    c1.rotation.x = Math.PI / 2;
    c1.position.set(-0.24, 0.25, 0.95);
    const c2 = new THREE.Mesh(cGeo, cannonMat);
    c2.rotation.x = Math.PI / 2;
    c2.position.set(0.24, 0.25, 0.95);

    const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 12), neonAccentMat);
    m1.name = 'glowAccent';
    m1.rotation.x = Math.PI / 2;
    m1.position.set(-0.24, 0.25, 1.66);
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 12), neonAccentMat);
    m2.name = 'glowAccent';
    m2.rotation.x = Math.PI / 2;
    m2.position.set(0.24, 0.25, 1.66);

    // Side Missile Pods (Dark Gunmetal with Team Colored Warhead Tips)
    const podGeo = new THREE.BoxGeometry(0.28, 0.28, 0.5);
    const podL = new THREE.Mesh(podGeo, baseFrameMat);
    podL.position.set(-0.68, 0.32, 0.05);
    const podR = new THREE.Mesh(podGeo, baseFrameMat);
    podR.position.set(0.68, 0.32, 0.05);

    const rocketTipGeo = new THREE.ConeGeometry(0.05, 0.12, 8);
    const tipL = new THREE.Mesh(rocketTipGeo, neonAccentMat);
    tipL.name = 'glowAccent';
    tipL.rotation.x = Math.PI / 2;
    tipL.position.set(-0.68, 0.32, 0.33);
    const tipR = new THREE.Mesh(rocketTipGeo, neonAccentMat);
    tipR.name = 'glowAccent';
    tipR.rotation.x = Math.PI / 2;
    tipR.position.set(0.68, 0.32, 0.33);

    turretGroup.add(c1, c2, m1, m2, podL, podR, tipL, tipR);
    group.add(turretGroup);
  }
  // ---------------------------------------------------------------------
  // LEVEL 3: PLASMA RAILGUN TITAN (HOVER WINGS & PLASMA CRYSTAL CORE)
  // ---------------------------------------------------------------------
  else if (level === 3) {
    // Chassis (Dark Tactical Titanium)
    const chassisGeo = new THREE.BoxGeometry(1.75, 0.46, 2.3);
    const chassis = new THREE.Mesh(chassisGeo, baseFrameMat);
    chassis.position.y = 0.34;
    group.add(chassis);

    // Front Delta Stealth Wedge (Team Color Armor)
    const wedgeGeo = new THREE.ConeGeometry(0.9, 0.85, 4);
    const wedge = new THREE.Mesh(wedgeGeo, armorPlateMat);
    wedge.name = 'armorPlate';
    wedge.rotation.x = Math.PI / 2;
    wedge.rotation.z = Math.PI / 4;
    wedge.position.set(0, 0.42, 1.25);
    group.add(wedge);

    // Hover Stabilizer Wings (Team Color with Glowing Neon Edges)
    const wingGeo = new THREE.BoxGeometry(0.5, 0.1, 1.7);
    const wingLeft = new THREE.Mesh(wingGeo, armorPlateMat);
    wingLeft.name = 'armorPlate';
    wingLeft.rotation.z = -Math.PI / 14;
    wingLeft.position.set(-1.18, 0.44, -0.1);

    const wingRight = new THREE.Mesh(wingGeo, armorPlateMat);
    wingRight.name = 'armorPlate';
    wingRight.rotation.z = Math.PI / 14;
    wingRight.position.set(1.18, 0.44, -0.1);
    group.add(wingLeft, wingRight);

    const wingEdgeGeo = new THREE.BoxGeometry(0.06, 0.12, 1.72);
    const edgeL = new THREE.Mesh(wingEdgeGeo, neonAccentMat);
    edgeL.name = 'glowAccent';
    edgeL.rotation.z = -Math.PI / 14;
    edgeL.position.set(-1.43, 0.47, -0.1);
    const edgeR = new THREE.Mesh(wingEdgeGeo, neonAccentMat);
    edgeR.name = 'glowAccent';
    edgeR.rotation.z = Math.PI / 14;
    edgeR.position.set(1.43, 0.47, -0.1);
    group.add(edgeL, edgeR);

    // Rear Plasma Ion Thrusters
    const turbineGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.65, 14);
    const tL = new THREE.Mesh(turbineGeo, cannonMat);
    tL.rotation.x = Math.PI / 2;
    tL.position.set(-0.55, 0.42, -1.15);
    const tR = new THREE.Mesh(turbineGeo, cannonMat);
    tR.rotation.x = Math.PI / 2;
    tR.position.set(0.55, 0.42, -1.15);

    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const nL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), nozzleMat);
    nL.rotation.x = Math.PI / 2;
    nL.position.set(-0.55, 0.42, -1.48);
    const nR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), nozzleMat);
    nR.rotation.x = Math.PI / 2;
    nR.position.set(0.55, 0.42, -1.48);
    group.add(tL, tR, nL, nR);

    // Treads & Road Wheels
    const treadGeo = new THREE.BoxGeometry(0.38, 0.42, 2.3);
    const trL = new THREE.Mesh(treadGeo, treadMat);
    trL.position.set(-0.98, 0.22, 0);
    const trR = new THREE.Mesh(treadGeo, treadMat);
    trR.position.set(0.98, 0.22, 0);
    group.add(trL, trR);

    addRoadWheels(group, [-0.8, -0.4, 0, 0.4, 0.8], 1.15, 0.17, 0.22);

    // Turret Assembly (Plasma Core + Twin Railguns)
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turretGroup';
    turretGroup.position.set(0, 0.64, 0);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.12, 16), baseFrameMat);
    collar.position.y = 0.06;
    turretGroup.add(collar);

    const domeGeo = new THREE.CylinderGeometry(0.68, 0.8, 0.42, 18);
    const dome = new THREE.Mesh(domeGeo, armorPlateMat);
    dome.name = 'armorPlate';
    dome.position.y = 0.28;
    turretGroup.add(dome);

    // Floating Holographic Halo Ring
    const haloGeo = new THREE.TorusGeometry(0.85, 0.04, 8, 24);
    const halo = new THREE.Mesh(haloGeo, neonAccentMat);
    halo.name = 'glowAccent';
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.35;
    turretGroup.add(halo);

    // Triple Railgun Accelerator Barrels (Level 3)
    const cGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.7, 14);
    const c1 = new THREE.Mesh(cGeo, cannonMat);
    c1.rotation.x = Math.PI / 2;
    c1.position.set(-0.28, 0.28, 1.05);
    const c2 = new THREE.Mesh(cGeo, cannonMat);
    c2.rotation.x = Math.PI / 2;
    c2.position.set(0, 0.35, 1.15);
    const c3 = new THREE.Mesh(cGeo, cannonMat);
    c3.rotation.x = Math.PI / 2;
    c3.position.set(0.28, 0.28, 1.05);

    const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), neonAccentMat);
    m1.name = 'glowAccent';
    m1.rotation.x = Math.PI / 2;
    m1.position.set(-0.28, 0.28, 1.88);
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), neonAccentMat);
    m2.name = 'glowAccent';
    m2.rotation.x = Math.PI / 2;
    m2.position.set(0, 0.35, 1.98);
    const m3 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), neonAccentMat);
    m3.name = 'glowAccent';
    m3.rotation.x = Math.PI / 2;
    m3.position.set(0.28, 0.28, 1.88);

    // Floating Plasma Crystal Core
    const coreGeo = new THREE.OctahedronGeometry(0.26);
    const coreMesh = new THREE.Mesh(coreGeo, neonAccentMat);
    coreMesh.name = 'glowAccent';
    coreMesh.position.set(0, 0.56, 0.08);
    turretGroup.add(coreMesh);

    turretGroup.add(c1, c2, c3, m1, m2, m3);
    group.add(turretGroup);
  }
  // ---------------------------------------------------------------------
  // LEVEL 4: APEX DREADNOUGHT BEHEMOTH (QUAD TREADS & QUAD HEAVY CANNONS & CROWN)
  // ---------------------------------------------------------------------
  else {
    // Massive Heavy Chassis (Dark Military Titanium)
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.54, 2.5);
    const chassis = new THREE.Mesh(chassisGeo, baseFrameMat);
    chassis.position.y = 0.38;
    group.add(chassis);

    // Front Heavy Breaching Dozer Shield (Team Color Armor)
    const plowGeo = new THREE.BoxGeometry(1.75, 0.26, 0.85);
    const plow = new THREE.Mesh(plowGeo, armorPlateMat);
    plow.name = 'armorPlate';
    plow.rotation.x = -Math.PI / 5;
    plow.position.set(0, 0.5, 1.2);
    group.add(plow);

    // Warning Chevron Decal on Dozer
    const plowStripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), neonAccentMat);
    plowStripe.name = 'glowAccent';
    plowStripe.rotation.x = -Math.PI / 5;
    plowStripe.position.set(0, 0.58, 1.2);
    group.add(plowStripe);

    // Quad Caterpillar Treads (2 Front, 2 Rear)
    const qTreadGeo = new THREE.BoxGeometry(0.42, 0.44, 1.15);
    const frontLeftTread = new THREE.Mesh(qTreadGeo, treadMat);
    frontLeftTread.position.set(-1.15, 0.23, 0.75);
    const frontRightTread = new THREE.Mesh(qTreadGeo, treadMat);
    frontRightTread.position.set(1.15, 0.23, 0.75);
    const rearLeftTread = new THREE.Mesh(qTreadGeo, treadMat);
    rearLeftTread.position.set(-1.15, 0.23, -0.75);
    const rearRightTread = new THREE.Mesh(qTreadGeo, treadMat);
    rearRightTread.position.set(1.15, 0.23, -0.75);
    group.add(frontLeftTread, frontRightTread, rearLeftTread, rearRightTread);

    // Quad Track Armor Guards (Team Color Neon Runners)
    const capGeo = new THREE.BoxGeometry(0.46, 0.12, 1.2);
    const cap1 = new THREE.Mesh(capGeo, neonAccentMat);
    cap1.name = 'glowAccent';
    cap1.position.set(-1.15, 0.48, 0.75);
    const cap2 = new THREE.Mesh(capGeo, neonAccentMat);
    cap2.name = 'glowAccent';
    cap2.position.set(1.15, 0.48, 0.75);
    const cap3 = new THREE.Mesh(capGeo, neonAccentMat);
    cap3.name = 'glowAccent';
    cap3.position.set(-1.15, 0.48, -0.75);
    const cap4 = new THREE.Mesh(capGeo, neonAccentMat);
    cap4.name = 'glowAccent';
    cap4.position.set(1.15, 0.48, -0.75);
    group.add(cap1, cap2, cap3, cap4);

    // Road Wheels on All 4 Pods
    addRoadWheels(group, [0.55, 0.95], 1.34, 0.16, 0.22);
    addRoadWheels(group, [-0.95, -0.55], 1.34, 0.16, 0.22);

    // Turret Assembly (Quad Heavy Siege Cannons + Commander Crown)
    const turretGroup = new THREE.Group();
    turretGroup.name = 'turretGroup';
    turretGroup.position.set(0, 0.72, 0);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.14, 20), baseFrameMat);
    collar.position.y = 0.08;
    turretGroup.add(collar);

    const domeGeo = new THREE.CylinderGeometry(0.8, 0.94, 0.48, 20);
    const dome = new THREE.Mesh(domeGeo, armorPlateMat);
    dome.name = 'armorPlate';
    dome.position.y = 0.32;
    turretGroup.add(dome);

    // Quad Siege Cannons (4 Barrels: -0.42, -0.14, +0.14, +0.42)
    const cGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.85, 14);
    const barrelXs = [-0.42, -0.14, 0.14, 0.42];
    const barrelYs = [0.26, 0.36, 0.36, 0.26];
    const barrelZs = [1.1, 1.25, 1.25, 1.1];

    barrelXs.forEach((bx, idx) => {
      const by = barrelYs[idx];
      const bz = barrelZs[idx];
      const cannon = new THREE.Mesh(cGeo, cannonMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(bx, by, bz);

      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 12), neonAccentMat);
      muzzle.name = 'glowAccent';
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(bx, by, bz + 0.91);

      turretGroup.add(cannon, muzzle);
    });

    // Dual Flank Missile Launchers
    const mLauncherGeo = new THREE.BoxGeometry(0.38, 0.38, 0.6);
    const launcherL = new THREE.Mesh(mLauncherGeo, baseFrameMat);
    launcherL.position.set(-0.88, 0.42, 0.1);
    const launcherR = new THREE.Mesh(mLauncherGeo, baseFrameMat);
    launcherR.position.set(0.88, 0.42, 0.1);

    turretGroup.add(launcherL, launcherR);

    // Apex Glowing Golden / Team Crown
    const crownGeo = new THREE.TorusGeometry(1.0, 0.05, 8, 32);
    const crownMesh = new THREE.Mesh(crownGeo, neonAccentMat);
    crownMesh.name = 'glowAccent';
    crownMesh.rotation.x = Math.PI / 2;
    crownMesh.position.y = 0.68;
    turretGroup.add(crownMesh);

    group.add(turretGroup);
  }

  // Tactical Underglow Ring & Crosshair Reticle on Ground
  const auraGeo = new THREE.RingGeometry(1.2, 1.38, 32);
  const auraMat = new THREE.MeshBasicMaterial({
    color: teamColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
  });
  const auraMesh = new THREE.Mesh(auraGeo, auraMat);
  auraMesh.rotation.x = -Math.PI / 2;
  auraMesh.position.y = 0.02;
  group.add(auraMesh);

  // 4 Directional Reticle Ticks
  const tickGeo = new THREE.BoxGeometry(0.06, 0.02, 0.35);
  const tickMat = new THREE.MeshBasicMaterial({ color: teamColor });
  const tickN = new THREE.Mesh(tickGeo, tickMat);
  tickN.position.set(0, 0.02, 1.3);
  const tickS = new THREE.Mesh(tickGeo, tickMat);
  tickS.position.set(0, 0.02, -1.3);
  const tickW = new THREE.Mesh(tickGeo, tickMat);
  tickW.rotation.y = Math.PI / 2;
  tickW.position.set(-1.3, 0.02, 0);
  const tickE = new THREE.Mesh(tickGeo, tickMat);
  tickE.rotation.y = Math.PI / 2;
  tickE.position.set(1.3, 0.02, 0);
  group.add(tickN, tickS, tickW, tickE);

  return group;
}

/**
 * 3D Particle Generators & Combat FX Functions (Ultra-Vibrant TikTok Live Arcade Edition)
 */

// 1. 3D Aerial Celebratory Firework Burst (Multi-color sparkling sphere)
function spawn3DFirework(scene: THREE.Scene, x: number, y: number, z: number, colorHex?: string) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, y, z);

  const colors = [0xff0055, 0xffaa00, 0x00ffcc, 0xff00ff, 0xffee00, 0x00ff66];
  const chosenColor = colorHex ? new THREE.Color(colorHex) : new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

  // Core Bright Flash
  const flashGeo = new THREE.SphereGeometry(0.5, 12, 12);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  fxGroup.add(flash);

  // 36 Exploding Spark Shells
  const sparkCount = 36;
  const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const sparks: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];

  for (let i = 0; i < sparkCount; i++) {
    const pMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? chosenColor : new THREE.Color(0xffffff),
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    const speed = 5 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    const vx = Math.sin(phi) * Math.cos(theta) * speed;
    const vy = Math.sin(phi) * Math.sin(theta) * speed;
    const vz = Math.cos(phi) * speed;

    mesh.position.set(0, 0, 0);
    fxGroup.add(mesh);
    sparks.push({ mesh, vx, vy, vz });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 0.85;

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      flash.scale.setScalar(1 + progress * 2);
      flashMat.opacity = Math.max(0, 1 - progress * 2.5);

      sparks.forEach((s) => {
        s.vy -= 9.8 * dt; // gravity
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 2. 3D Victory Confetti Shower (Arena-wide celebration rain)
function spawn3DConfettiVictory(scene: THREE.Scene) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(0, 12, 0);

  const confettiCount = 80;
  const palette = [0xff0055, 0x00f0ff, 0xffea00, 0x39ff14, 0xff00aa, 0xffffff, 0xff9900];
  const items: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; rotX: number; rotY: number; rotZ: number }> = [];

  const rectGeo = new THREE.PlaneGeometry(0.25, 0.4);

  for (let i = 0; i < confettiCount; i++) {
    const color = new THREE.Color(palette[i % palette.length]);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(rectGeo, mat);

    const x = (Math.random() - 0.5) * 20;
    const y = Math.random() * 6;
    const z = (Math.random() - 0.5) * 16;
    mesh.position.set(x, y, z);

    fxGroup.add(mesh);
    items.push({
      mesh,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(2.5 + Math.random() * 3.5),
      vz: (Math.random() - 0.5) * 1.5,
      rotX: (Math.random() - 0.5) * 10,
      rotY: (Math.random() - 0.5) * 10,
      rotZ: (Math.random() - 0.5) * 10,
    });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 4.0;

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      items.forEach((item) => {
        item.mesh.position.x += (item.vx + Math.sin(life * 3 + item.mesh.position.y) * 0.8) * dt;
        item.mesh.position.y += item.vy * dt;
        item.mesh.position.z += item.vz * dt;

        item.mesh.rotation.x += item.rotX * dt;
        item.mesh.rotation.y += item.rotY * dt;
        item.mesh.rotation.z += item.rotZ * dt;

        if (progress > 0.7) {
          (item.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) / 0.3;
        }
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 3. 3D Fiery Multi-Layer Plasma Explosion with Flying Shrapnel & Ground Shockwaves
function spawn3DExplosion(scene: THREE.Scene, x: number, z: number, colorHex: string) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, 0.4, z);

  const mainColor = new THREE.Color(colorHex);

  // 1. Core Blazing Fireball Sphere
  const sphereGeo = new THREE.SphereGeometry(0.45, 16, 16);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 1.0,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  fxGroup.add(sphereMesh);

  // 2. Inner White-Hot Flash
  const coreFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 })
  );
  fxGroup.add(coreFlash);

  // 3. Primary Ground Shockwave Ring
  const ringGeo = new THREE.RingGeometry(0.3, 0.6, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: mainColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = -0.35;
  fxGroup.add(ringMesh);

  // 4. Secondary Outer Neon Blast Ring
  const outerRingGeo = new THREE.TorusGeometry(0.7, 0.08, 8, 24);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xffea00,
    transparent: true,
    opacity: 0.9,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.2;
  fxGroup.add(outerRing);

  // 5. Flying Glowing Shrapnel & Spark Particles (32 particles)
  const particleCount = 32;
  const particles: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
  const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  for (let i = 0; i < particleCount; i++) {
    const isGold = i % 3 === 0;
    const isWhite = i % 3 === 1;
    const pMat = new THREE.MeshBasicMaterial({
      color: isGold ? new THREE.Color(0xffdd00) : isWhite ? new THREE.Color(0xffffff) : mainColor,
      transparent: true,
      opacity: 1.0,
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    const speed = 5 + Math.random() * 8;
    const angle = Math.random() * Math.PI * 2;
    const pitch = Math.random() * Math.PI * 0.45;

    const vx = Math.cos(angle) * Math.cos(pitch) * speed;
    const vy = Math.sin(pitch) * speed + 3;
    const vz = Math.sin(angle) * Math.cos(pitch) * speed;

    pMesh.position.set(0, 0, 0);
    fxGroup.add(pMesh);
    particles.push({ mesh: pMesh, vx, vy, vz });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 0.6; // 600ms

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      // Expand spheres & fade out
      const scale = 0.4 + progress * 4.8;
      sphereMesh.scale.set(scale, scale, scale);
      sphereMat.opacity = Math.max(0, 1 - progress);

      coreFlash.scale.setScalar(1 + progress * 3);
      (coreFlash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress * 2);

      // Expand ground ring
      const ringScale = 1 + progress * 8.0;
      ringMesh.scale.set(ringScale, ringScale, 1);
      ringMat.opacity = Math.max(0, 1 - progress);

      // Expand secondary blast ring
      const outerScale = 1 + progress * 6.0;
      outerRing.scale.set(outerScale, outerScale, outerScale);
      outerRingMat.opacity = Math.max(0, 1 - progress);

      // Move debris particles with gravity
      particles.forEach((p) => {
        p.vy -= 18 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += dt * 8;
        p.mesh.rotation.y += dt * 8;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 4. 3D Muzzle Flash Starburst & Cannon Blast Shockwave
function spawn3DMuzzleFlash(scene: THREE.Scene, x: number, z: number, colorHex: string) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, 0.5, z);

  const mainColor = new THREE.Color(colorHex);

  // High-Luminance Flash Core
  const flashGeo = new THREE.SphereGeometry(0.48, 12, 12);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
  });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  fxGroup.add(flashMesh);

  // Outer Blast Shockwave Torus
  const ringGeo = new THREE.TorusGeometry(0.45, 0.12, 8, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: mainColor,
    transparent: true,
    opacity: 0.95,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  fxGroup.add(ringMesh);

  // 8 Forward-Spurting Spark Embers
  const sparks: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
  const sGeo = new THREE.SphereGeometry(0.08, 6, 6);
  for (let i = 0; i < 8; i++) {
    const sMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 1.0 });
    const sMesh = new THREE.Mesh(sGeo, sMat);
    const ang = Math.random() * Math.PI * 2;
    const spd = 4 + Math.random() * 5;
    sMesh.position.set(0, 0, 0);
    fxGroup.add(sMesh);
    sparks.push({ mesh: sMesh, vx: Math.cos(ang) * spd, vy: (Math.random() - 0.2) * 3, vz: Math.sin(ang) * spd });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 0.2; // 200ms burst

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;
      const scale = 1 + progress * 2.5;

      flashMesh.scale.set(scale, scale, scale);
      flashMat.opacity = 1 - progress;

      ringMesh.scale.set(scale, scale, scale);
      ringMat.opacity = 1 - progress;

      sparks.forEach((s) => {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 5. 3D Evolution Ascension Light Beam & Spiraling Energy Vortex
function spawn3DEvolutionBeam(scene: THREE.Scene, x: number, z: number, colorHex: string) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, 0, z);

  const teamColor = new THREE.Color(colorHex);

  // Outer Ascension Beam Cylinder
  const beamGeo = new THREE.CylinderGeometry(1.2, 1.6, 16, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: teamColor,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = 8;
  fxGroup.add(beamMesh);

  // Inner Core Pillar of Brilliant White Light
  const coreBeamGeo = new THREE.CylinderGeometry(0.45, 0.6, 16, 16, 1, true);
  const coreBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat);
  coreBeam.position.y = 8;
  fxGroup.add(coreBeam);

  // Concentric Spinning Golden Helix Rings
  const ringGeo = new THREE.TorusGeometry(1.4, 0.1, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.95 });
  const rings: THREE.Mesh[] = [];

  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 2.8;
    fxGroup.add(ring);
    rings.push(ring);
  }

  // Golden Starburst Fireworks at Crown Peak
  const crownGeo = new THREE.TorusGeometry(1.8, 0.12, 8, 32);
  const crownMat = new THREE.MeshBasicMaterial({ color: 0xff0077, transparent: true, opacity: 0.9 });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 14;
  fxGroup.add(crown);

  // 36 Ascending Star Sparkles & Glowing Crystals
  const sparkCount = 36;
  const pGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const sparkles: Array<{ mesh: THREE.Mesh; angle: number; radius: number; speedY: number }> = [];

  for (let i = 0; i < sparkCount; i++) {
    const isTeam = i % 2 === 0;
    const pMat = new THREE.MeshBasicMaterial({
      color: isTeam ? teamColor : new THREE.Color(0xffea00),
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    const angle = (i / sparkCount) * Math.PI * 2;
    const radius = 0.9 + Math.random() * 0.8;
    const speedY = 5 + Math.random() * 6;
    mesh.position.set(Math.cos(angle) * radius, Math.random() * 4, Math.sin(angle) * radius);
    fxGroup.add(mesh);
    sparkles.push({ mesh, angle, radius, speedY });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 1.2; // 1.2 seconds

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      beamMat.opacity = Math.sin(progress * Math.PI) * 0.9;
      coreBeamMat.opacity = Math.sin(progress * Math.PI) * 0.98;

      beamMesh.rotation.y += dt * 4.5;
      crown.rotation.z += dt * 6.0;
      crown.scale.setScalar(1 + Math.sin(life * 8) * 0.3);

      rings.forEach((ring, idx) => {
        ring.position.y += dt * 11;
        if (ring.position.y > 15) ring.position.y = 0;
        ring.rotation.z += dt * (idx % 2 === 0 ? 3 : -3);
        ring.scale.setScalar(1 + Math.sin(life * 6 + idx) * 0.28);
      });

      sparkles.forEach((s) => {
        s.angle += dt * 7;
        s.mesh.position.y += s.speedY * dt;
        s.mesh.position.x = Math.cos(s.angle) * s.radius;
        s.mesh.position.z = Math.sin(s.angle) * s.radius;
        if (s.mesh.position.y > 15) s.mesh.position.y = 0;
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 6. 3D Impact Sparks Burst on Tank Hit (Bright Electric Arc Flash)
function spawn3DHitSparks(scene: THREE.Scene, x: number, z: number, colorHex: string) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, 0.5, z);

  const mainColor = new THREE.Color(colorHex);
  const sparkCount = 20;
  const pGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const sparks: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];

  // Central Hit Star Flash
  const flashMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 })
  );
  fxGroup.add(flashMesh);

  for (let i = 0; i < sparkCount; i++) {
    const pMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xffea00 : mainColor,
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    const vx = Math.cos(angle) * speed;
    const vy = 2 + Math.random() * 5;
    const vz = Math.sin(angle) * speed;
    mesh.position.set(0, 0, 0);
    fxGroup.add(mesh);
    sparks.push({ mesh, vx, vy, vz });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 0.4; // 400ms

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      flashMesh.scale.setScalar(1 + progress * 3);
      (flashMesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress * 2.5;

      sparks.forEach((s) => {
        s.vy -= 16 * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

// 7. 3D Healing Aura Pulse (Rising Emerald Hearts & Medical Crosses)
function spawn3DHealAura(scene: THREE.Scene, x: number, z: number) {
  const fxGroup = new THREE.Group();
  fxGroup.position.set(x, 0.1, z);

  // Double Ground Rings
  const ringGeo = new THREE.RingGeometry(0.4, 1.6, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  fxGroup.add(ringMesh);

  // 14 Rising Green & Golden Energy Orbs + 3D Cross Particles
  const orbCount = 14;
  const pGeo = new THREE.SphereGeometry(0.14, 8, 8);
  const orbs: Array<{ mesh: THREE.Mesh; angle: number; radius: number; vy: number }> = [];

  for (let i = 0; i < orbCount; i++) {
    const isGold = i % 3 === 0;
    const pMat = new THREE.MeshBasicMaterial({
      color: isGold ? 0xffea00 : 0x00ff88,
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    const angle = (i / orbCount) * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.8;
    mesh.position.set(Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius);
    fxGroup.add(mesh);
    orbs.push({ mesh, angle, radius, vy: 3.0 + Math.random() * 3.5 });
  }

  scene.add(fxGroup);

  let life = 0;
  const maxLife = 0.95;

  return {
    mesh: fxGroup,
    update: (dt: number) => {
      life += dt;
      const progress = life / maxLife;

      ringMesh.scale.set(1 + progress * 0.8, 1 + progress * 0.8, 1);
      ringMat.opacity = 1 - progress;

      orbs.forEach((o) => {
        o.angle += dt * 6;
        o.mesh.position.y += o.vy * dt;
        o.mesh.position.x = Math.cos(o.angle) * o.radius;
        o.mesh.position.z = Math.sin(o.angle) * o.radius;
        (o.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
      });

      if (life >= maxLife) {
        scene.remove(fxGroup);
        disposeThreeObject(fxGroup);
        return false;
      }
      return true;
    },
  };
}

