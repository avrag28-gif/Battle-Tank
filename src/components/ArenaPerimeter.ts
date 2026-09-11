import * as THREE from 'three';

export interface ArenaPerimeterObjects {
  group: THREE.Group;
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

/**
 * Generates high-detail industrial military sci-fi decorations
 * for the battlefield arena perimeter:
 * - Reinforced stepped outer foundation platform
 * - Heavy modular blast walls with structural reinforcement ribs
 * - Hazard warning chevron stripes
 * - Glowing neon energy conduit rail & semi-transparent holographic energy fence
 * - 4 Corner observation pylons with floodlights, rotating radar arrays, and strobes
 * - Welded steel anti-tank Czech hedgehogs in wall recesses
 * - Tactical power generator units with cooling vents
 * - Perimeter hazard security bollards with pulsing warning lights
 */
export function createArenaPerimeter(arenaSize = 16.8): ArenaPerimeterObjects {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'arenaPerimeterRoot';

  const half = arenaSize / 2; // 8.4
  const wallHeight = 0.65;
  const wallThick = 0.55;

  // Shared Tactical Materials
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x181e28,
    metalness: 0.85,
    roughness: 0.25,
  });

  const armorPlateMat = new THREE.MeshStandardMaterial({
    color: 0x252e3d,
    metalness: 0.7,
    roughness: 0.35,
  });

  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.3,
    metalness: 0.5,
    roughness: 0.4,
  });

  const hazardDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.6,
    roughness: 0.5,
  });

  const energyRailMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: new THREE.Color(0x00f0ff),
    emissiveIntensity: 1.6,
    metalness: 0.2,
    roughness: 0.1,
  });

  const forcefieldMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    wireframe: true,
  });

  const floodlightLensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 2.8,
    roughness: 0.1,
  });

  const beaconStrobeMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: new THREE.Color(0xff1122),
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });

  const bollardLightMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const czechHedgehogMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.9,
    roughness: 0.3,
  });

  // -------------------------------------------------------------
  // 1. REINFORCED LOWER PLATFORM / FOUNDATION APRON
  // -------------------------------------------------------------
  const apronGeo = new THREE.BoxGeometry(arenaSize + 2.4, 0.4, arenaSize + 2.4);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x0e131b,
    metalness: 0.9,
    roughness: 0.6,
  });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.y = -0.21;
  apronMesh.receiveShadow = true;
  rootGroup.add(apronMesh);

  // Outer bevel trench lip
  const outerBorderGeo = new THREE.RingGeometry(half + 0.3, half + 1.1, 4);
  const outerBorderMat = new THREE.MeshStandardMaterial({
    color: 0x1e2634,
    metalness: 0.75,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const outerBorderMesh = new THREE.Mesh(outerBorderGeo, outerBorderMat);
  outerBorderMesh.rotation.x = -Math.PI / 2;
  outerBorderMesh.rotation.z = Math.PI / 4;
  outerBorderMesh.position.y = -0.005;
  rootGroup.add(outerBorderMesh);

  // -------------------------------------------------------------
  // 2. MODULAR BLAST WALLS (4 SIDES) WITH RIBS & HAZARDS
  // -------------------------------------------------------------
  const wallBaseGeo = new THREE.BoxGeometry(arenaSize, wallHeight, wallThick);
  const wallCapGeo = new THREE.BoxGeometry(arenaSize + 0.1, 0.1, wallThick + 0.08);
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, arenaSize, 8);
  const forcefieldGeo = new THREE.PlaneGeometry(arenaSize, 0.7);

  // Helper to build one side wall group
  const createWallSide = (rotationY: number, pos: THREE.Vector3) => {
    const sideGroup = new THREE.Group();
    sideGroup.position.copy(pos);
    sideGroup.rotation.y = rotationY;

    // Heavy Concrete / Steel Blast Wall Body
    const wallMesh = new THREE.Mesh(wallBaseGeo, darkSteelMat);
    wallMesh.position.y = wallHeight / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    sideGroup.add(wallMesh);

    // Armored Top Cap
    const capMesh = new THREE.Mesh(wallCapGeo, armorPlateMat);
    capMesh.position.y = wallHeight + 0.04;
    sideGroup.add(capMesh);

    // Glowing Neon Energy Conduit Rail running on top
    const railMesh = new THREE.Mesh(railGeo, energyRailMat);
    railMesh.rotation.z = Math.PI / 2;
    railMesh.position.y = wallHeight + 0.11;
    sideGroup.add(railMesh);

    // Semi-Transparent Energy Shield Grid Barrier
    const forcefieldMesh = new THREE.Mesh(forcefieldGeo, forcefieldMat);
    forcefieldMesh.position.set(0, wallHeight + 0.45, -wallThick / 2 + 0.02);
    sideGroup.add(forcefieldMesh);

    // Structural Reinforcement Buttresses (Ribs) every 2.4 meters
    const ribGeo = new THREE.BoxGeometry(0.18, wallHeight + 0.12, wallThick + 0.2);
    for (let x = -half + 2.0; x <= half - 2.0; x += 2.4) {
      const rib = new THREE.Mesh(ribGeo, armorPlateMat);
      rib.position.set(x, (wallHeight + 0.12) / 2, 0);
      sideGroup.add(rib);

      // Warning hazard chevron stripes on face of each rib
      const stripeYellow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), hazardYellowMat);
      stripeYellow.position.set(x, wallHeight * 0.65, wallThick / 2 + 0.08);
      const stripeDark = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), hazardDarkMat);
      stripeDark.position.set(x, wallHeight * 0.45, wallThick / 2 + 0.08);
      sideGroup.add(stripeYellow, stripeDark);
    }

    // Hazard Bollards on inner safety lip
    const bollardBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8);
    const bollardLightGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8);
    for (let x = -half + 3.2; x <= half - 3.2; x += 4.0) {
      const bBase = new THREE.Mesh(bollardBaseGeo, darkSteelMat);
      bBase.position.set(x, 0.175, wallThick / 2 + 0.15);
      const bLight = new THREE.Mesh(bollardLightGeo, bollardLightMat);
      bLight.position.set(x, 0.38, wallThick / 2 + 0.15);
      bLight.name = 'bollardLight';
      sideGroup.add(bBase, bLight);
    }

    return sideGroup;
  };

  // 4 Sides: North, South, East, West
  const northWall = createWallSide(0, new THREE.Vector3(0, 0, -half));
  const southWall = createWallSide(Math.PI, new THREE.Vector3(0, 0, half));
  const eastWall = createWallSide(-Math.PI / 2, new THREE.Vector3(half, 0, 0));
  const westWall = createWallSide(Math.PI / 2, new THREE.Vector3(-half, 0, 0));

  rootGroup.add(northWall, southWall, eastWall, westWall);

  // -------------------------------------------------------------
  // 3. 4 CORNER OBSERVATION & DEFENSE PYLONS
  // -------------------------------------------------------------
  const radarArrays: THREE.Group[] = [];
  const beaconLights: THREE.Mesh[] = [];

  const cornerPositions = [
    { x: -half, z: -half, rotY: Math.PI / 4 },
    { x: half, z: -half, rotY: -Math.PI / 4 },
    { x: half, z: half, rotY: -3 * Math.PI / 4 },
    { x: -half, z: half, rotY: 3 * Math.PI / 4 },
  ];

  cornerPositions.forEach((cp) => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(cp.x, 0, cp.z);
    towerGroup.rotation.y = cp.rotY;

    // Hexagonal Fortress Tower Base
    const towerGeo = new THREE.CylinderGeometry(0.85, 1.1, 1.6, 6);
    const tower = new THREE.Mesh(towerGeo, armorPlateMat);
    tower.position.y = 0.8;
    tower.castShadow = true;
    towerGroup.add(tower);

    // Upper Balcony Ring
    const balconyGeo = new THREE.CylinderGeometry(1.0, 0.85, 0.15, 6);
    const balcony = new THREE.Mesh(balconyGeo, darkSteelMat);
    balcony.position.y = 1.65;
    towerGroup.add(balcony);

    // Glowing Ring Trim on Tower Midsection
    const ringGlowGeo = new THREE.TorusGeometry(0.92, 0.03, 6, 12);
    const ringGlow = new THREE.Mesh(ringGlowGeo, energyRailMat);
    ringGlow.rotation.x = Math.PI / 2;
    ringGlow.position.y = 0.85;
    towerGroup.add(ringGlow);

    // Angled Arena Stadium Floodlights (Twin Halogen Projectors aimed inward)
    const floodlightHousingGeo = new THREE.BoxGeometry(0.4, 0.28, 0.35);
    const flHousing = new THREE.Mesh(floodlightHousingGeo, darkSteelMat);
    flHousing.rotation.x = Math.PI / 6; // Angled down toward battlefield
    flHousing.position.set(0, 1.85, 0.35);

    const flLens1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), floodlightLensMat);
    flLens1.rotation.x = Math.PI / 2;
    flLens1.position.set(-0.11, 0, 0.18);
    const flLens2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), floodlightLensMat);
    flLens2.rotation.x = Math.PI / 2;
    flLens2.position.set(0.11, 0, 0.18);
    flHousing.add(flLens1, flLens2);
    towerGroup.add(flHousing);

    // High-Gain Rotating Radar Array Dish on top
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 1.95, -0.2);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), darkSteelMat);
    mast.position.y = 0.25;
    radarGroup.add(mast);

    const dishGeo = new THREE.CylinderGeometry(0.28, 0.05, 0.15, 12, 1, true);
    const dish = new THREE.Mesh(dishGeo, darkSteelMat);
    dish.rotation.x = Math.PI / 3;
    dish.position.y = 0.55;
    radarGroup.add(dish);

    const feedHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 8), energyRailMat);
    feedHorn.rotation.x = Math.PI / 3;
    feedHorn.position.set(0, 0.62, 0.1);
    radarGroup.add(feedHorn);

    towerGroup.add(radarGroup);
    radarArrays.push(radarGroup);

    // Aviation Warning Red Strobe Beacon at the peak
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), beaconStrobeMat);
    beacon.position.set(0, 2.7, -0.2);
    towerGroup.add(beacon);
    beaconLights.push(beacon);

    rootGroup.add(towerGroup);
  });

  // -------------------------------------------------------------
  // 4. PERIMETER TACTICAL PROPS: CZECH HEDGEHOGS & POWER GENERATORS
  // -------------------------------------------------------------
  // Helper: Czech Hedgehog (Welded 3-Axis Steel Anti-Tank Obstacle)
  const createCzechHedgehog = () => {
    const hedgehog = new THREE.Group();
    const beamGeo = new THREE.BoxGeometry(0.1, 1.1, 0.1);

    const b1 = new THREE.Mesh(beamGeo, czechHedgehogMat);
    b1.rotation.z = Math.PI / 4;
    const b2 = new THREE.Mesh(beamGeo, czechHedgehogMat);
    b2.rotation.z = -Math.PI / 4;
    const b3 = new THREE.Mesh(beamGeo, czechHedgehogMat);
    b3.rotation.x = Math.PI / 4;

    hedgehog.add(b1, b2, b3);
    hedgehog.scale.set(0.7, 0.7, 0.7);
    hedgehog.position.y = 0.35;
    return hedgehog;
  };

  // Place 4 Czech Hedgehogs tucked safely against the outer boundary recesses
  const hPos = [
    { x: -half + 1.2, z: -half + 3.0, rot: 0.3 },
    { x: half - 1.2, z: -half + 3.0, rot: -0.5 },
    { x: half - 1.2, z: half - 3.0, rot: 1.1 },
    { x: -half + 1.2, z: half - 3.0, rot: -0.8 },
  ];
  hPos.forEach((hp) => {
    const h = createCzechHedgehog();
    h.position.set(hp.x, 0.3, hp.z);
    h.rotation.y = hp.rot;
    rootGroup.add(h);
  });

  // Helper: Tactical Power Generator Station with glowing vents
  const createGeneratorStation = () => {
    const genGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(0.9, 0.55, 0.5);
    const box = new THREE.Mesh(boxGeo, darkSteelMat);
    box.position.y = 0.275;
    genGroup.add(box);

    // Glowing Neon Radiator Vents
    const ventGeo = new THREE.PlaneGeometry(0.7, 0.25);
    const ventMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const vent = new THREE.Mesh(ventGeo, ventMat);
    vent.position.set(0, 0.3, 0.255);
    genGroup.add(vent);

    // Warning Light
    const indLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), beaconStrobeMat);
    indLight.position.set(0.3, 0.58, 0.15);
    genGroup.add(indLight);

    return genGroup;
  };

  // 2 Generators along North and South outer recesses
  const genNorth = createGeneratorStation();
  genNorth.position.set(3.5, 0, -half + 0.4);
  const genSouth = createGeneratorStation();
  genSouth.rotation.y = Math.PI;
  genSouth.position.set(-3.5, 0, half - 0.4);
  rootGroup.add(genNorth, genSouth);

  // -------------------------------------------------------------
  // ANIMATION TICK: Rotates radars, strobes aviation warning beacons
  // -------------------------------------------------------------
  const update = (dt: number, time: number) => {
    // Spin radar dishes smoothly
    for (const radar of radarArrays) {
      radar.rotation.y += 0.025;
    }

    // Strobe corner aviation beacons (crisp rhythmic blinking pulse)
    const strobeIntensity = 1.0 + Math.sin(time * 6) * 1.8;
    beaconStrobeMat.emissiveIntensity = Math.max(0.2, strobeIntensity);

    // Gentle hum of forcefield shield
    forcefieldMat.opacity = 0.15 + Math.sin(time * 2.5) * 0.08;

    // Gentle pulse of bollard hazard lights
    bollardLightMat.emissiveIntensity = 1.2 + Math.sin(time * 3.5) * 0.6;
  };

  const dispose = () => {
    // Dispose geometry and materials
    apronGeo.dispose();
    apronMat.dispose();
    wallBaseGeo.dispose();
    wallCapGeo.dispose();
    railGeo.dispose();
    forcefieldGeo.dispose();
    darkSteelMat.dispose();
    armorPlateMat.dispose();
    hazardYellowMat.dispose();
    hazardDarkMat.dispose();
    energyRailMat.dispose();
    forcefieldMat.dispose();
    floodlightLensMat.dispose();
    beaconStrobeMat.dispose();
    bollardLightMat.dispose();
    czechHedgehogMat.dispose();
  };

  return {
    group: rootGroup,
    update,
    dispose,
  };
}
