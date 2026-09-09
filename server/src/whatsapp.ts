/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  THULIR — WhatsApp Maintenance Alerts via Twilio Sandbox
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Sends a WhatsApp message when a structure transitions to RED status.
 *  Uses the same ticket-text format as the /workorders endpoint.
 *
 *  Required env vars (see .env.example):
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *    TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO
 */

import type { Structure, Computed } from './types';

// Lazy-load Twilio client only when credentials are present
let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.warn('⚠️  Twilio not configured — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to enable WhatsApp alerts');
    return null;
  }

  try {
    // Dynamic require so the app doesn't crash if twilio isn't installed
    const Twilio = require('twilio');
    twilioClient = Twilio(sid, token);
    return twilioClient;
  } catch (err: any) {
    console.warn('⚠️  Twilio SDK not installed — run: npm install twilio');
    return null;
  }
}

export async function sendMaintenanceAlert(
  structure: Structure,
  computed: Computed
): Promise<void> {
  const client = getTwilioClient();
  if (!client) return;

  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  if (!from || !to) {
    console.warn('⚠️  TWILIO_WHATSAPP_FROM / TWILIO_WHATSAPP_TO not set, skipping alert');
    return;
  }

  const capLoss = Math.round(computed.capacity_loss_pct);
  const lostM3 = Math.round(computed.lost_recharge_m3_est_per_monsoon);

  const body =
    `🚨 THULIR ALERT\n\n` +
    `URGENT — dispatch now.\n` +
    `${structure.structure_id} (${structure.name}):\n` +
    `desilt immediately — ${capLoss}% capacity lost,\n` +
    `est. ${lostM3.toLocaleString()} m³/yr recharge at risk\n\n` +
    `IEI: ${computed.infiltration_efficiency_index.toFixed(3)}\n` +
    `Status: ${computed.status.toUpperCase()}`;

  try {
    const msg = await client.messages.create({
      body,
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
    });
    console.log(`📲 WhatsApp alert sent for ${structure.structure_id} — SID: ${msg.sid}`);
  } catch (err: any) {
    // Log but don't crash — Twilio sandbox auth issues shouldn't kill the engine
    console.error(`📲 WhatsApp alert FAILED for ${structure.structure_id}: ${err.message}`);
  }
}
