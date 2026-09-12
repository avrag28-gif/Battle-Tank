/**
 * TikTok Live 3D Tank Battle - Procedural Web Audio Sound Synthesizer & Background Music (BGM)
 * Zero-latency arcade sound FX and Background Music generator without external asset dependencies.
 */

class SoundEngine {
  private ctx?: AudioContext;
  public enabled: boolean = true;
  public bgmEnabled: boolean = true;
  private bgmInterval: any = null;
  private bgmStep: number = 0;
  private cachedNoiseBuffer?: AudioBuffer;
  private lastLaserShotTime: number = 0;
  private lastHitSoundTime: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.cachedNoiseBuffer) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.cachedNoiseBuffer = buffer;
    }
    return this.cachedNoiseBuffer;
  }

  /**
   * Continuous Procedural Synth Battle Background Music (BGM)
   */
  public startBGM() {
    if (this.bgmInterval) return;
    this.initCtx();

    // 128 BPM = ~117ms per 16th note step
    const stepDuration = 0.117;

    this.bgmInterval = setInterval(() => {
      if (!this.enabled || !this.bgmEnabled || !this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;
      this.bgmStep++;

      // 1. Synth Bassline (E Minor progression: E1 -> G1 -> A1 -> B1)
      const bassNotes = [82.41, 82.41, 98.0, 82.41, 110.0, 82.41, 123.47, 110.0];
      if (step % 2 === 0) {
        const bassFreq = bassNotes[(Math.floor(step / 2) + Math.floor(this.bgmStep / 16) * 2) % bassNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        gain.gain.setValueAtTime(0.85, now); // Boosted Bassline (from 0.38)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
      }

      // 2. Punchy Kick Drum (Quarter notes: step 0, 4, 8, 12)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();

        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.09);

        kickGain.gain.setValueAtTime(0.95, now); // Boosted Kick (from 0.55)
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);

        kickOsc.start(now);
        kickOsc.stop(now + 0.09);
      }

      // 3. Hi-Hat White Noise Pulse with Cached Buffer
      if (step % 2 === 1) {
        const noiseBuf = this.getNoiseBuffer();
        if (noiseBuf) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuf;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 5500;

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.45, now); // Boosted Hi-Hat (from 0.18)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          noise.start(now);
          noise.stop(now + 0.035);
        }
      }

      // 4. Ambient Arpeggio Lead (Pentatonic E Minor)
      if (step % 4 === 0) {
        const leadScale = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25]; // E4, G4, A4, B4, D5, E5
        const leadFreq = leadScale[(step / 4 + Math.floor(this.bgmStep / 8)) % leadScale.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(leadFreq, now);

        gain.gain.setValueAtTime(0.55, now); // Boosted Lead Arpeggio (from 0.22)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      }
    }, stepDuration * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public toggleBGM(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.bgmEnabled;
  }

  /**
   * CANNON FIRING (Tembakan Meriam Tank Realistis)
   */
  public playLaserShot(evolutionLevel: number = 1) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: Heavy Kinetic Bass Cannon Boom (Thump)
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();

    thumpOsc.type = 'triangle';
    // Higher evolution levels get slightly deeper, heavier sounds
    const startFreq = 220 - evolutionLevel * 10;
    const endFreq = 20;

    thumpOsc.frequency.setValueAtTime(startFreq, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

    // Heavy direct low-end thump
    thumpGain.gain.setValueAtTime(0.95, now); // Max low-end punch
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.ctx.destination);

    thumpOsc.start(now);
    thumpOsc.stop(now + 0.18);

    // Layer 2: Gunpowder Explosion Blast (Filtered White Noise Crack)
    const noiseBuf = this.getNoiseBuffer();
    if (noiseBuf) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      // Evolution level modifies the frequency character of the blast
      const filterFreq = Math.max(400, 1200 - evolutionLevel * 120);
      noiseFilter.frequency.setValueAtTime(filterFreq, now);
      noiseFilter.Q.setValueAtTime(2.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now); // Louder blast crack
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.14);
    }

    // Layer 3: Mechanical Metallic Shell Crack (Releasing sound)
    const ringOsc = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();

    ringOsc.type = 'sawtooth';
    ringOsc.frequency.setValueAtTime(450, now);
    ringOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    const ringFilter = this.ctx.createBiquadFilter();
    ringFilter.type = 'lowpass';
    ringFilter.frequency.value = 800;

    ringGain.gain.setValueAtTime(0.45, now); // Louder metallic ring
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    ringOsc.connect(ringFilter);
    ringFilter.connect(ringGain);
    ringGain.connect(this.ctx.destination);

    ringOsc.start(now);
    ringOsc.stop(now + 0.08);
  }

  /**
   * BULLET HIT TANK (Suara ketika peluru kena tank - Metallic Armor Impact Clang & Blast)
   */
  public playHit() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: Metallic Ricochet Clang (Triangle Pitch Drop)
    const clangOsc = this.ctx.createOscillator();
    const clangGain = this.ctx.createGain();

    clangOsc.type = 'triangle';
    clangOsc.frequency.setValueAtTime(2200, now);
    clangOsc.frequency.exponentialRampToValueAtTime(450, now + 0.14);

    clangGain.gain.setValueAtTime(0.90, now); // Louder metallic clang
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    clangOsc.connect(clangGain);
    clangGain.connect(this.ctx.destination);

    clangOsc.start(now);
    clangOsc.stop(now + 0.14);

    // Layer 2: Heavy Metal Armor Thud Impact (Bass Punch)
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(240, now);
    bassOsc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    bassGain.gain.setValueAtTime(0.95, now); // Louder armor thud
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);

    bassOsc.start(now);
    bassOsc.stop(now + 0.18);

    // Layer 3: Spark Noise Burst
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, now); // Louder spark crackle
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
  }

  /**
   * EXPLOSION / TANK DESTRUCTION (Ledakan Besar)
   */
  public playExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: Sub-Bass Boom Sweep
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(200, now);
    bassOsc.frequency.exponentialRampToValueAtTime(20, now + 0.55);

    bassGain.gain.setValueAtTime(1.0, now); // Max power explosion boom
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);

    bassOsc.start(now);
    bassOsc.stop(now + 0.55);

    // Layer 2: Crash Noise Blast
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(35, now + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now); // Max power explosion blast noise
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  /**
   * HEAL (DONUT GIFT - Tambah Darah)
   */
  public playHeal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = this.ctx.currentTime + idx * 0.06;
      gain.gain.setValueAtTime(0.65, startTime); // Louder heal sound
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  /**
   * EVOLUTION LEVEL UP (CAP GIFT - Level Up)
   */
  public playEvolution() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const startTime = this.ctx.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(0.75, startTime); // Louder level up arpeggio
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  }

  /**
   * JOIN ARENA (ROSE GIFT - Masuk Arena)
   */
  public playJoin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.ctx.currentTime + idx * 0.07;
      gain.gain.setValueAtTime(0.70, startTime); // Louder join notification
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  /**
   * SPECIAL BARRAGE ATTACK
   */
  public playSpecial() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    gain.gain.setValueAtTime(0.85, now); // Louder special attack whistle
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * COUNTDOWN BEEP
   */
  public playBeep(highPitch: boolean = false) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = highPitch ? 880 : 440;

    gain.gain.setValueAtTime(0.70, this.ctx.currentTime); // Louder match countdown ticker
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  /**
   * MATCH VICTORY
   */
  public playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const tune = [
      { freq: 523.25, duration: 0.15 },
      { freq: 659.25, duration: 0.15 },
      { freq: 783.99, duration: 0.15 },
      { freq: 1046.5, duration: 0.45 },
    ];

    let timeOffset = 0;
    for (const note of tune) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = note.freq;

      const startTime = this.ctx.currentTime + timeOffset;
      gain.gain.setValueAtTime(0.85, startTime); // Louder victory tune
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.duration);

      timeOffset += note.duration * 0.85;
    }
  }
}

export const soundEngine = new SoundEngine();
