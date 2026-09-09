import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Computed } from '../../api/types';

interface StructureInfo {
  structure_id: string;
  name: string;
  type?: string;
  lat?: number;
  lng?: number;
}

interface Props {
  structure: StructureInfo;
  computed?: Computed | null;
  onClose: () => void;
}

const RECIPIENT_PRESETS = [
  { label: 'Village Administrative Officer (VAO)', phone: '+919445012345' },
  { label: 'Panchayat Development Officer (BDO)', phone: '+919442067890' },
  { label: 'Water Resources Dept (WRD) Engineer', phone: '+919841054321' },
  { label: 'Custom Phone Number', phone: '' },
];

export default function OfflineDispatchModal({ structure, computed, onClose }: Props) {
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);
  const [customPhone, setCustomPhone] = useState('');
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [copied, setCopied] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const targetPhone =
    selectedRecipientIndex === RECIPIENT_PRESETS.length - 1
      ? customPhone
      : RECIPIENT_PRESETS[selectedRecipientIndex].phone;

  const typeName = (structure.type || 'Structure').replace(/_/g, ' ');
  const statusUpper = computed?.status ? computed.status.toUpperCase() : 'ALERT';
  const ieiVal = computed?.infiltration_efficiency_index != null ? computed.infiltration_efficiency_index.toFixed(2) : 'N/A';
  const siltCm = computed?.silt_depth_cm ?? 0;
  const capLoss = computed?.capacity_loss_pct ?? 0;
  const lostM3 = computed?.lost_recharge_m3_est_per_monsoon?.toLocaleString() ?? '0';
  const latLngStr = structure.lat && structure.lng ? `${structure.lat.toFixed(4)}, ${structure.lng.toFixed(4)}` : 'Catchment Site';

  // Construct structured SMS message
  const generatedMessage = language === 'en'
    ? `[THULIR OFFLINE ALERT - URGENT]
Structure: ${structure.name} (${typeName})
GPS: ${latLngStr}
Status: ${statusUpper} | IEI: ${ieiVal}
Silt Bed: ${siltCm} cm (${capLoss}% capacity lost)
Lost Recharge: ${lostM3} m³ per monsoon
Action: Desilting recommended immediately before monsoon runoff.
${customNote ? `Note: ${customNote}` : ''}
Sent via THULIR Offline Field Dispatch`
    : `[துளிர் அவசர எச்சரிக்கை / THULIR ALERT]
அமைப்பு: ${structure.name} (${typeName})
இடம் (GPS): ${latLngStr}
நிலை: ${statusUpper === 'RED' ? 'அபாயகரம் (CRITICAL)' : 'பராமரிப்பு தேவை (WARNING)'} | IEI: ${ieiVal}
வண்டல் மண்: ${siltCm} செ.மீ (${capLoss}% இழப்பு)
இழக்கப்படும் மழைநீர்: ${lostM3} க.மீ
தேவையான நடவடிக்கை: பருவமழை தொடங்கும் முன் உடனடியாக தூர்வாரவும்.
${customNote ? `குறிப்பு: ${customNote}` : ''}
துளிர் ஆஃப்லைன் கள எச்சரிக்கை`;

  const handleSendWhatsApp = () => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const encodedBody = encodeURIComponent(generatedMessage);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedBody}`
      : `https://api.whatsapp.com/send?text=${encodedBody}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendSMS = () => {
    const cleanPhone = targetPhone.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(generatedMessage);
    window.location.href = `sms:${cleanPhone}?body=${encodedBody}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0D0D0D] border border-white/20 rounded-lg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4 font-manrope text-white animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold text-[13px] flex items-center gap-1">
                ⚡ EMERGENCY FIELD DISPATCH
              </span>
              <span className="bg-white/10 text-white/60 text-[10px] px-2 py-0.5 rounded uppercase">
                WhatsApp + Offline SMS
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-[#AFDDFF] mt-1">
              {structure.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-[20px] leading-none px-2 py-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Recipient Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">
            Send Alert To Recipient:
          </label>
          <select
            value={selectedRecipientIndex}
            onChange={(e) => setSelectedRecipientIndex(Number(e.target.value))}
            className="w-full bg-black border border-white/20 text-white text-[12px] p-2.5 rounded focus:outline-none focus:border-[#AFDDFF]"
          >
            {RECIPIENT_PRESETS.map((preset, idx) => (
              <option key={idx} value={idx} className="bg-black text-white">
                {preset.label} {preset.phone ? `(${preset.phone})` : ''}
              </option>
            ))}
          </select>

          {selectedRecipientIndex === RECIPIENT_PRESETS.length - 1 && (
            <input
              type="tel"
              placeholder="Enter mobile number with country code, e.g. +91 94450..."
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="w-full bg-black border border-white/20 text-white text-[12px] p-2.5 rounded mt-1.5 focus:outline-none focus:border-[#AFDDFF]"
            />
          )}
        </div>

        {/* Language selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">
            Message Language:
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[#AFDDFF] text-black font-bold shadow-sm'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                language === 'ta'
                  ? 'bg-[#AFDDFF] text-black font-bold shadow-sm'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              தமிழ் (Tamil)
            </button>
          </div>
        </div>

        {/* Formatted Message Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <span className="uppercase tracking-wider font-semibold">Message Payload Preview:</span>
            <span>{generatedMessage.length} chars</span>
          </div>
          <pre className="w-full bg-black border border-white/15 p-3 rounded text-[11px] text-[#AFDDFF]/90 font-mono whitespace-pre-wrap leading-[16px] max-h-[140px] overflow-y-auto">
            {generatedMessage}
          </pre>
        </div>

        {/* Optional field note */}
        <div>
          <input
            type="text"
            placeholder="Add optional field note (e.g. 'Inspected at 2 PM by VAO')..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full bg-black border border-white/15 text-white text-[11px] px-3 py-2 rounded focus:outline-none focus:border-[#AFDDFF]"
          />
        </div>

        {/* Action Buttons — Direct instant dispatch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="bg-[#25D366] hover:bg-[#1EBE5D] text-black font-bold text-[12px] py-2.5 px-3 rounded transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span>💬</span> Send WhatsApp (Instant)
          </button>
          <button
            type="button"
            onClick={handleSendSMS}
            className="bg-[#AFDDFF] hover:bg-[#8ecbee] text-black font-bold text-[12px] py-2.5 px-3 rounded transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span>📲</span> Send SMS (Offline)
          </button>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="text-white/60 hover:text-white text-[11px] py-1 px-2 transition-colors cursor-pointer flex items-center gap-1"
          >
            {copied ? '✓ Copied to clipboard!' : '📋 Copy text to clipboard'}
          </button>
        </div>

        {/* Footer info banner */}
        <p className="text-[10px] text-white/40 text-center leading-[14px]">
          Direct 1-click dispatch via WhatsApp Click-to-Chat & Cellular SMS (`sms:`). Zero extra confirmation prompts or gateway fees.
        </p>
      </div>
    </div>,
    document.body
  );
}
