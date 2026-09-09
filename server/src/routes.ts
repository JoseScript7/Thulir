import { Router, Request, Response } from 'express';
import { db } from './firebase';
import { Structure, TelemetryReading, Computed } from './types';

const router = Router();

// ─── POST /telemetry ───────────────────────────────────────────────────────────

router.post('/telemetry', async (req: Request, res: Response) => {
  try {
    const reading: TelemetryReading = req.body;

    const missing: string[] = [];
    if (!reading.structure_id) missing.push('structure_id');
    if (!reading.timestamp) missing.push('timestamp');
    if (reading.water_depth_cm == null) missing.push('water_depth_cm');
    if (reading.bed_distance_cm == null) missing.push('bed_distance_cm');

    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    await db.collection('telemetry').add({
      ...reading,
      received_at: new Date().toISOString(),
    });

    res.status(201).json(reading);
  } catch (err: any) {
    console.error('POST /telemetry error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /structures ───────────────────────────────────────────────────────────

router.get('/structures', async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const typeFilter = req.query.type as string | undefined;

    let structuresQuery = db.collection('structures').orderBy('structure_id');
    const structuresSnap = await structuresQuery.get();
    const structures: Structure[] = structuresSnap.docs.map(
      (doc: any) => doc.data() as Structure
    );

    const computedSnap = await db.collection('computed').get();
    const computedMap = new Map<string, Computed>();
    computedSnap.docs.forEach((doc: any) => {
      computedMap.set(doc.id, doc.data() as Computed);
    });

    let results = structures.map((s) => {
      const c = computedMap.get(s.structure_id) || null;
      return { ...s, computed: c };
    });

    if (typeFilter) {
      results = results.filter((r) => r.type === typeFilter);
    }
    if (statusFilter) {
      results = results.filter((r) => r.computed?.status === statusFilter);
    }

    res.json(results);
  } catch (err: any) {
    console.error('GET /structures error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /structures/:id ───────────────────────────────────────────────────────

router.get('/structures/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const structureDoc = await db.collection('structures').doc(id).get();
    if (!structureDoc.exists) {
      res.status(404).json({ error: `Structure ${id} not found` });
      return;
    }
    const structure = structureDoc.data() as Structure;

    const computedDoc = await db.collection('computed').doc(id).get();
    const computed = computedDoc.exists ? (computedDoc.data() as Computed) : null;

    const telemetrySnap = await db
      .collection('telemetry')
      .where('structure_id', '==', id)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const telemetry: TelemetryReading[] = telemetrySnap.docs.map(
      (doc: any) => doc.data() as TelemetryReading
    );

    res.json({ ...structure, computed, telemetry });
  } catch (err: any) {
    console.error(`GET /structures/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /structures/:id/desilting-events (Prompt 24) ──────────────────────────

router.get('/structures/:id/desilting-events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const histSnap = await db
      .collection('computed_history')
      .where('structure_id', '==', id)
      .orderBy('history_timestamp', 'asc')
      .get();

    if (histSnap.size < 2) {
      res.json([]);
      return;
    }

    const history = histSnap.docs.map((d: any) => d.data());
    const events: any[] = [];

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      const drop = prev.capacity_loss_pct - curr.capacity_loss_pct;
      if (drop > 20) {
        // Find IEI ~7 days after (or closest available)
        const eventTime = new Date(curr.history_timestamp || curr.last_updated).getTime();
        const sevenDaysLater = eventTime + 7 * 24 * 60 * 60 * 1000;

        let iei7dAfter = curr.infiltration_efficiency_index;
        for (let j = i + 1; j < history.length; j++) {
          const t = new Date(history[j].history_timestamp || history[j].last_updated).getTime();
          if (t >= sevenDaysLater || j === history.length - 1) {
            iei7dAfter = history[j].infiltration_efficiency_index;
            break;
          }
        }

        events.push({
          timestamp: curr.history_timestamp || curr.last_updated,
          iei_before: prev.infiltration_efficiency_index,
          iei_7d_after: iei7dAfter,
        });
      }
    }

    res.json(events);
  } catch (err: any) {
    console.error(`GET /structures/${req.params.id}/desilting-events error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /workorders ───────────────────────────────────────────────────────────

router.get('/workorders', async (req: Request, res: Response) => {
  try {
    const computedSnap = await db.collection('computed').get();
    const allComputed: Computed[] = computedSnap.docs.map(
      (doc: any) => doc.data() as Computed
    );

    const urgent = allComputed
      .filter((c) => c.status !== 'green')
      .sort((a, b) => a.infiltration_efficiency_index - b.infiltration_efficiency_index);

    const structuresSnap = await db.collection('structures').get();
    const structureMap = new Map<string, Structure>();
    structuresSnap.docs.forEach((doc: any) => {
      const s = doc.data() as Structure;
      structureMap.set(s.structure_id, s);
    });

    const workorders = urgent.map((c) => {
      const s = structureMap.get(c.structure_id);
      const name = s?.name || c.structure_id;
      const lostM3 = Math.round(c.lost_recharge_m3_est_per_monsoon);
      const capLoss = Math.round(c.capacity_loss_pct);

      let ticket: string;
      if (c.status === 'red') {
        ticket =
          `URGENT — dispatch now. ${c.structure_id} (${name}): ` +
          `desilt immediately — ${capLoss}% capacity lost, ` +
          `est. ${lostM3.toLocaleString()} m³/yr recharge at risk`;
      } else {
        ticket =
          `${c.structure_id} (${name}): ` +
          `desilt before monsoon — ${capLoss}% capacity lost, ` +
          `est. ${lostM3.toLocaleString()} m³/yr recharge at risk`;
      }

      return {
        ...c,
        structure_name: name,
        structure_type: s?.type || null,
        ticket,
      };
    });

    res.json(workorders);
  } catch (err: any) {
    console.error('GET /workorders error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /summary ──────────────────────────────────────────────────────────────

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const structuresSnap = await db.collection('structures').get();
    const total_structures = structuresSnap.size;

    const computedSnap = await db.collection('computed').get();
    let count_green = 0;
    let count_amber = 0;
    let count_red = 0;
    let total_lost_recharge_m3 = 0;
    let total_lost_irrigation_acres = 0;
    let total_lost_value_inr = 0;

    computedSnap.docs.forEach((doc: any) => {
      const c = doc.data() as Computed;
      switch (c.status) {
        case 'green': count_green++; break;
        case 'amber': count_amber++; break;
        case 'red': count_red++; break;
      }
      total_lost_recharge_m3 += c.lost_recharge_m3_est_per_monsoon || 0;
      total_lost_irrigation_acres += c.lost_irrigation_acres_equiv || 0;
      total_lost_value_inr += c.lost_value_inr_equiv || 0;
    });

    res.json({
      total_structures,
      count_green,
      count_amber,
      count_red,
      total_lost_recharge_m3: Math.round(total_lost_recharge_m3),
      total_lost_irrigation_acres: Math.round(total_lost_irrigation_acres * 100) / 100,
      total_lost_value_inr: Math.round(total_lost_value_inr),
    });
  } catch (err: any) {
    console.error('GET /summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
