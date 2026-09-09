import http from 'http';
import { db } from './firebase';
import { Structure, TelemetryReading } from './types';

const PORT = process.env.PORT || 4000;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function randDate(startMs: number, endMs: number): string {
  return new Date(startMs + Math.random() * (endMs - startMs))
    .toISOString()
    .split('T')[0];
}

// ─── Structure seed data ───────────────────────────────────────────────────────

const NAMES = [
  'Keezhkulam Pond',
  'Vadatheru Tank',
  'Arasur Check Dam',
  'Pallipuram Pond',
  'Siruganur Percolation Pond',
  'Thiruvalur Dam',
  'Kaniyambadi Pond',
  'Gudiyatham Check Dam',
  'Ambur Percolation Pond',
  'Vaniyambadi Check Dam',
];

// 6 percolation_pond, then 4 check_dam
const TYPES: ('percolation_pond' | 'check_dam')[] = [
  'percolation_pond', 'percolation_pond', 'percolation_pond',
  'percolation_pond', 'percolation_pond', 'percolation_pond',
  'check_dam', 'check_dam', 'check_dam', 'check_dam',
];

function generateStructures(): Structure[] {
  const now = Date.now();
  const thirtyMonthsAgo = now - 30 * 30 * 24 * 60 * 60 * 1000; // ~30 months

  return Array.from({ length: 10 }, (_, i) => {
    const type = TYPES[i];
    const isPond = type === 'percolation_pond';
    const depth = randInt(120, 200); // cm — internally consistent pair

    return {
      structure_id: `STR-${String(i + 1).padStart(3, '0')}`,
      name: NAMES[i],
      type,
      lat: Math.round(rand(12.20, 12.30) * 100000) / 100000,
      lng: Math.round(rand(79.00, 79.15) * 100000) / 100000,
      catchment_area_m2: randInt(20000, 80000),
      surface_area_m2: randInt(800, 2000),
      original_capacity_m3: randInt(5000, 12000),
      benchmark_percolation_mm_day: Math.round(
        (isPond ? rand(20, 35) : rand(10, 20)) * 10
      ) / 10,
      commissioned_date: randDate(
        new Date(2018, 0, 1).getTime(),
        new Date(2022, 11, 31).getTime()
      ),
      last_desilted_date: randDate(thirtyMonthsAgo, now),
      baseline_bed_distance_cm: depth,
      original_effective_depth_cm: depth,
    };
  });
}

// ─── Simulation state ──────────────────────────────────────────────────────────

interface SimState {
  structure: Structure;
  capacity_loss_pct: number;
  days_since_rain: number;
  water_depth_cm: number;
  tick_count: number;
  simulated_time: number; // epoch ms — advances 12h per tick for realistic timestamps
}

const SIM_TICK_MS = 12 * 60 * 60 * 1000; // 12 hours per tick in simulated time

function initSimStates(structures: Structure[]): SimState[] {
  const startTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // start 30 days ago
  return structures.map((s) => ({
    structure: s,
    // Weighted toward higher values (Haryana worst-case distribution):
    // Math.pow(random, 0.5) skews the distribution toward the upper end
    capacity_loss_pct: Math.round(Math.pow(Math.random(), 0.5) * 70 * 10) / 10,
    days_since_rain: randInt(0, 30),
    water_depth_cm: Math.round(rand(5, s.original_effective_depth_cm * 0.6) * 10) / 10,
    tick_count: 0,
    simulated_time: startTime,
  }));
}

// ─── HTTP POST to own /telemetry ───────────────────────────────────────────────

function postTelemetry(reading: TelemetryReading): void {
  const data = JSON.stringify(reading);

  const req = http.request(
    {
      hostname: 'localhost',
      port: Number(PORT),
      path: '/telemetry',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    (res) => {
      res.resume(); // drain
    }
  );

  req.on('error', (err) => {
    console.error(`  ✗ Mock POST failed for ${reading.structure_id}: ${err.message}`);
  });

  req.write(data);
  req.end();
}

// ─── Firestore seeding ─────────────────────────────────────────────────────────

async function seedStructures(structures: Structure[]): Promise<void> {
  try {
    const snapshot = await db.collection('structures').limit(1).get();
    if (!snapshot.empty) {
      console.log('📦 Structures collection already seeded — skipping.');
      return;
    }

    const batch = db.batch();
    for (const s of structures) {
      batch.set(db.collection('structures').doc(s.structure_id), s);
    }
    await batch.commit();
    console.log(`📦 Seeded ${structures.length} structures into Firestore.`);
  } catch (err: any) {
    console.warn('⚠️  Could not seed structures (Firestore down?):', err.message);
  }
}

// ─── Simulation tick ───────────────────────────────────────────────────────────

let desiltCounter = 0;

function simulateTick(states: SimState[]): void {
  desiltCounter++;

  // ─ Desilting event: one random structure every ~8 ticks (~5 min at 30-60s) ─
  if (desiltCounter >= 8) {
    desiltCounter = 0;
    const idx = randInt(0, states.length - 1);
    const old = states[idx].capacity_loss_pct;
    states[idx].capacity_loss_pct = Math.round(rand(0, 5) * 10) / 10;
    console.log(
      `🔧 DESILTING: ${states[idx].structure.structure_id} ` +
      `capacity_loss ${old.toFixed(1)}% → ${states[idx].capacity_loss_pct.toFixed(1)}%`
    );
  }

  for (const state of states) {
    state.tick_count++;
    const s = state.structure;

    // ─── Rainfall event (~15%) ───
    if (Math.random() < 0.15) {
      const refill = rand(30, s.original_effective_depth_cm * 0.5);
      state.water_depth_cm = Math.min(
        s.original_effective_depth_cm * 0.95,
        state.water_depth_cm + refill
      );
      state.days_since_rain = 0;

      // Rare breach (~1/30 within rain → effective ~1/200 overall)
      if (Math.random() < 1 / 30) {
        state.water_depth_cm = Math.round(rand(0.5, 3) * 10) / 10;
        console.log(
          `🚨 BREACH: ${s.structure_id} water dropped to ${state.water_depth_cm} cm!`
        );
      }
    } else {
      // ─── Normal recession ───
      state.days_since_rain++;
      const efficiency = 1 - state.capacity_loss_pct / 100;
      // Each tick ≈ 0.5 simulated days (accelerated for demo visibility)
      const percolation_cm =
        (s.benchmark_percolation_mm_day * efficiency) / 10 * 0.5;
      const noise = rand(-0.3, 0.3);
      state.water_depth_cm = Math.max(
        0,
        state.water_depth_cm - percolation_cm + noise
      );
    }

    // ─── Siltation random walk (slow upward drift) ───
    state.capacity_loss_pct = Math.max(
      0,
      Math.min(95, state.capacity_loss_pct + rand(-0.1, 0.4))
    );
    state.capacity_loss_pct =
      Math.round(state.capacity_loss_pct * 10) / 10;

    // ─── Derive bed_distance_cm from silt state ───
    const silt_depth_cm =
      (state.capacity_loss_pct / 100) * s.original_effective_depth_cm;
    const bed_distance_cm = s.baseline_bed_distance_cm - silt_depth_cm;

    // Round water_depth for clean output
    state.water_depth_cm =
      Math.round(state.water_depth_cm * 10) / 10;

    // ─── Build & POST TelemetryReading ───
    const reading: TelemetryReading = {
      structure_id: s.structure_id,
      timestamp: new Date(state.simulated_time).toISOString(),
      water_depth_cm: state.water_depth_cm,
      bed_distance_cm: Math.round(bed_distance_cm * 10) / 10,
      turbidity_ntu: Math.round(rand(5, 80) * 10) / 10,
      battery_voltage: Math.round(rand(3.2, 4.2) * 100) / 100,
    };

    postTelemetry(reading);

    console.log(
      `📡 ${s.structure_id} | water: ${reading.water_depth_cm} cm | ` +
      `silt_loss: ${state.capacity_loss_pct}%`
    );

    // Advance simulated time by 12h
    state.simulated_time += SIM_TICK_MS;
  }
}

// ─── Public entry point ────────────────────────────────────────────────────────

export async function startMockGenerator(): Promise<void> {
  console.log('🎭 Mock data generator starting…');

  const structures = generateStructures();
  await seedStructures(structures);

  const states = initSimStates(structures);

  // Recursive setTimeout for randomized intervals
  function scheduleTick(): void {
    const intervalMs = rand(30, 60) * 1000;
    setTimeout(() => {
      simulateTick(states);
      scheduleTick();
    }, intervalMs);
  }

  // Fire initial ticks after a short delay (let Express finish binding)
  setTimeout(() => {
    for (let i = 0; i < 6; i++) {
      simulateTick(states);
    }
    scheduleTick();
    console.log(
      `🎭 Mock generator running: ${structures.length} structures, ` +
      `ticking every 30–60 s`
    );
  }, 1000);
}
