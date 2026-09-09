/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  THULIR — Infiltration Efficiency Index (IEI) Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  PERCOLATION PERFORMANCE SCORE (PPS)
 *    observed_percolation_mm_day = ((depth_t1 - depth_t2) / days_between(t1, t2)) × 10
 *    PPS = min(1, observed_percolation_mm_day / structure.benchmark_percolation_mm_day)
 *
 *  CAPACITY RETENTION SCORE (CRS)
 *    silt_depth_cm = structure.baseline_bed_distance_cm − latest_reading.bed_distance_cm
 *    capacity_loss_pct = (silt_depth_cm / structure.original_effective_depth_cm) × 100
 *    CRS = 1 − (capacity_loss_pct / 100), clamped to [0, 1]
 *
 *  STRUCTURAL INTEGRITY FLAG
 *    If water_depth_cm drops to <5% of the recent post-rain peak within a single
 *    reading interval (breach), Integrity = 0.5. Otherwise Integrity = 1.0.
 *
 *  COMPOSITE IEI
 *    IEI = (0.45 × PPS) + (0.40 × CRS) + (0.15 × Integrity)
 *    status = 'green' if IEI ≥ 0.70, 'amber' if 0.40 ≤ IEI < 0.70, else 'red'
 *
 *  LOST RECHARGE ESTIMATE
 *    lost_recharge_m3_est_per_monsoon =
 *      ((benchmark − observed) × surface_area_m2 × 90) / 1000
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db } from './firebase';
import { Structure, TelemetryReading, Computed } from './types';
import { sendMaintenanceAlert } from './whatsapp';

const MONSOON_STORAGE_DAYS = 90;

// Prompt 23 — Cost-of-inaction constants
// ~4000 m³ seasonal irrigation per acre for one crop cycle (approximate, for pitch purposes)
const IRRIGATION_M3_PER_ACRE = 4000;
// ₹25/m³ placeholder — should be sourced from local tanker-water or borewell-recharge cost data before real deployment
const GROUNDWATER_COST_PROXY_INR_PER_M3 = 25;

// Prompt 26 — Desilting cost constant
// ₹150/m³ of silt removed (illustrative — varies by region and contractor)
const DESILTING_COST_INR_PER_M3 = 150;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(isoA: string, isoB: string): number {
  const msPerDay = 86_400_000;
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) / msPerDay;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deriveStatus(iei: number): 'green' | 'amber' | 'red' {
  if (iei >= 0.70) return 'green';
  if (iei >= 0.40) return 'amber';
  return 'red';
}

// ─── Prompt 22: Linear regression for time-to-red prediction ───────────────

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Core computation for one structure ────────────────────────────────────────

async function computeForStructure(structure: Structure): Promise<Computed | null> {
  const sid = structure.structure_id;

  // Fetch the last 20 readings
  const snap = await db
    .collection('telemetry')
    .where('structure_id', '==', sid)
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get();

  if (snap.size < 2) {
    console.log(`  ⏭  ${sid}: <2 readings, skipping`);
    return null;
  }

  const readings: TelemetryReading[] = snap.docs.map(
    (doc: any) => doc.data() as TelemetryReading
  );

  const latest = readings[0];

  // ─── Capacity Retention Score (CRS) ───
  const silt_depth_cm = structure.baseline_bed_distance_cm - latest.bed_distance_cm;
  const capacity_loss_pct = clamp(
    (silt_depth_cm / structure.original_effective_depth_cm) * 100,
    0, 100
  );
  const CRS = clamp(1 - capacity_loss_pct / 100, 0, 1);

  // ─── Percolation Performance Score (PPS) ───
  let observed_percolation_mm_day = 0;
  let PPS = 0;
  let foundRecession = false;

  for (let i = 0; i < readings.length - 1; i++) {
    const newer = readings[i];
    const older = readings[i + 1];

    if (older.water_depth_cm > newer.water_depth_cm) {
      const days = daysBetween(older.timestamp, newer.timestamp);
      if (days > 0) {
        observed_percolation_mm_day =
          ((older.water_depth_cm - newer.water_depth_cm) / days) * 10;
        PPS = Math.min(1, observed_percolation_mm_day / structure.benchmark_percolation_mm_day);
        foundRecession = true;
        break;
      }
    }
  }

  if (!foundRecession) {
    console.log(`  ⏭  ${sid}: no dry-recession pair found, skipping`);
    return null;
  }

  // ─── Structural Integrity Flag ───
  let integrity = 1.0;

  for (let i = 0; i < readings.length - 1; i++) {
    const current = readings[i];
    const previous = readings[i + 1];

    if (
      previous.water_depth_cm > 20 &&
      current.water_depth_cm < previous.water_depth_cm * 0.05
    ) {
      integrity = 0.5;
      console.log(
        `  🚨 ${sid}: breach detected — ` +
        `${previous.water_depth_cm} cm → ${current.water_depth_cm} cm`
      );
      break;
    }
  }

  // ─── Composite IEI ───
  const iei = 0.45 * PPS + 0.40 * CRS + 0.15 * integrity;
  const status = deriveStatus(iei);

  // ─── Lost recharge estimate ───
  const lost_recharge_m3_est_per_monsoon = Math.max(
    0,
    ((structure.benchmark_percolation_mm_day - observed_percolation_mm_day) *
      structure.surface_area_m2 *
      MONSOON_STORAGE_DAYS) / 1000
  );

  // ─── Prompt 23: Cost-of-inaction ───
  const lost_irrigation_acres_equiv = Math.round(
    (lost_recharge_m3_est_per_monsoon / IRRIGATION_M3_PER_ACRE) * 100
  ) / 100;
  const lost_value_inr_equiv = Math.round(
    lost_recharge_m3_est_per_monsoon * GROUNDWATER_COST_PROXY_INR_PER_M3
  );

  // ─── Prompt 26: Desilting cost / ROI ───
  const silt_volume_m3 = (capacity_loss_pct / 100) * structure.original_capacity_m3;
  const desilting_cost_est_inr = Math.round(silt_volume_m3 * DESILTING_COST_INR_PER_M3);
  const recharge_per_rupee = desilting_cost_est_inr > 0
    ? Math.round((lost_value_inr_equiv / desilting_cost_est_inr) * 100) / 100
    : 0;

  // ─── Prompt 28: Data quality ───
  const readingTime = new Date((latest as any).received_at || latest.timestamp).getTime();
  const now = Date.now();
  const ageMs = now - readingTime;
  const thirtyMin = 30 * 60 * 1000;
  const sixHours = 6 * 60 * 60 * 1000;

  const low_battery = (latest.battery_voltage != null && latest.battery_voltage < 3.4);

  let data_quality: 'good' | 'stale' | 'offline';
  if (ageMs < thirtyMin && (latest.battery_voltage == null || latest.battery_voltage >= 3.5)) {
    data_quality = 'good';
  } else if (ageMs < sixHours) {
    data_quality = 'stale';
  } else {
    data_quality = 'offline';
  }

  // ─── Prompt 22: predicted_days_to_red — computed after upserting (needs history) ───
  // Placeholder — set after history check in recomputeAll
  const computed: Computed = {
    structure_id: sid,
    silt_depth_cm: Math.round(silt_depth_cm * 10) / 10,
    capacity_loss_pct: Math.round(capacity_loss_pct * 10) / 10,
    observed_percolation_mm_day: Math.round(observed_percolation_mm_day * 100) / 100,
    infiltration_efficiency_index: Math.round(iei * 1000) / 1000,
    status,
    lost_recharge_m3_est_per_monsoon: Math.round(lost_recharge_m3_est_per_monsoon),
    last_updated: new Date().toISOString(),
    pps: Math.round(PPS * 1000) / 1000,
    crs: Math.round(CRS * 1000) / 1000,
    integrity,
    predicted_days_to_red: null,
    lost_irrigation_acres_equiv,
    lost_value_inr_equiv,
    desilting_cost_est_inr,
    recharge_per_rupee,
    roi_score: recharge_per_rupee,
    data_quality,
    low_battery,
  };

  return computed;
}

// ─── Public: recompute all structures ──────────────────────────────────────────

export async function recomputeAll(): Promise<void> {
  const start = Date.now();
  console.log('⚙️  IEI Engine: recomputing all structures…');

  try {
    const structuresSnap = await db.collection('structures').get();
    if (structuresSnap.empty) {
      console.log('⚙️  IEI Engine: no structures found, nothing to compute.');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const doc of structuresSnap.docs) {
      const structure = (doc as any).data() as Structure;

      try {
        const computed = await computeForStructure(structure);

        if (computed) {
          // Check for red transition before overwriting
          let previousStatus: string | null = null;
          try {
            const prevDoc = await db.collection('computed').doc(structure.structure_id).get();
            if (prevDoc.exists) {
              previousStatus = (prevDoc.data() as Computed).status;
            }
          } catch (_) {
            // If we can't read the previous doc, skip transition check
          }

          // ─── Prompt 22: Append to computed_history ───
          try {
            const historyId = `${computed.structure_id}_${Date.now()}`;
            await db.collection('computed_history').doc(historyId).set({
              ...computed,
              history_timestamp: new Date().toISOString(),
            });

            // Cleanup: keep only last 20 entries per structure
            const histSnap = await db
              .collection('computed_history')
              .where('structure_id', '==', computed.structure_id)
              .orderBy('history_timestamp', 'desc')
              .get();

            if (histSnap.size > 20) {
              const toDelete = histSnap.docs.slice(20);
              for (const d of toDelete) {
                await db.collection('computed_history').doc((d as any).id).delete();
              }
            }

            // ─── Predict days-to-red ───
            if (computed.status !== 'red' && histSnap.size >= 3) {
              const points = histSnap.docs
                .map((d: any) => d.data())
                .reverse() // oldest first
                .slice(-5) // last 5
                .map((h: any) => ({
                  x: new Date(h.history_timestamp || h.last_updated).getTime() / 86_400_000, // days
                  y: h.infiltration_efficiency_index as number,
                }));

              const reg = linearRegression(points);
              if (reg && reg.slope < -0.0001) {
                const daysToRed = (0.40 - computed.infiltration_efficiency_index) / reg.slope;
                if (daysToRed > 0 && daysToRed < 365) {
                  computed.predicted_days_to_red = Math.max(1, Math.round(daysToRed));
                }
              }
            }
          } catch (histErr: any) {
            // Don't let history tracking break the main computation
            console.error(`  ⚠ History tracking error for ${structure.structure_id}: ${histErr.message}`);
          }

          await db
            .collection('computed')
            .doc(structure.structure_id)
            .set(computed);
          updated++;

          const icon =
            computed.status === 'green' ? '🟢' :
            computed.status === 'amber' ? '🟡' : '🔴';
          console.log(
            `  ${icon} ${computed.structure_id}: ` +
            `IEI=${computed.infiltration_efficiency_index} ` +
            `PPS-perc=${computed.observed_percolation_mm_day}mm/d ` +
            `silt=${computed.capacity_loss_pct}% ` +
            `lost=${computed.lost_recharge_m3_est_per_monsoon}m³`
          );

          // Fire WhatsApp alert only on non-red → red transition
          if (computed.status === 'red' && previousStatus !== 'red') {
            console.log(`  📲 Red transition detected for ${structure.structure_id}, sending alert…`);
            try {
              await sendMaintenanceAlert(structure, computed);
            } catch (alertErr: any) {
              console.error(`  📲 Alert send failed: ${alertErr.message}`);
            }
          }
        } else {
          skipped++;
        }
      } catch (err: any) {
        console.error(`  ✗ ${structure.structure_id}: ${err.message}`);
        skipped++;
      }
    }

    const elapsed = Date.now() - start;
    console.log(
      `⚙️  IEI Engine: done in ${elapsed}ms — ${updated} updated, ${skipped} skipped`
    );
  } catch (err: any) {
    console.error('⚙️  IEI Engine error:', err.message);
  }
}
