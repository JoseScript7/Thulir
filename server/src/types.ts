export interface Structure {
  structure_id: string;
  name: string;
  type: 'check_dam' | 'percolation_pond' | 'recharge_pit';
  lat: number;
  lng: number;
  catchment_area_m2: number;
  surface_area_m2: number;
  original_capacity_m3: number;
  benchmark_percolation_mm_day: number;
  commissioned_date: string;
  last_desilted_date: string;
  baseline_bed_distance_cm: number;       // sensor-to-bed distance at commissioning/last desilt, needed for silt calc
  original_effective_depth_cm: number;    // needed for capacity_loss_pct calc
}

export interface TelemetryReading {
  structure_id: string;
  timestamp: string;
  water_depth_cm: number;
  bed_distance_cm: number;
  turbidity_ntu?: number;
  battery_voltage?: number;
}

export interface Computed {
  structure_id: string;
  silt_depth_cm: number;
  capacity_loss_pct: number;
  observed_percolation_mm_day: number;
  infiltration_efficiency_index: number;
  status: 'green' | 'amber' | 'red';
  lost_recharge_m3_est_per_monsoon: number;
  last_updated: string;

  // Sub-scores (Prompt 25 — score transparency)
  pps: number;
  crs: number;
  integrity: number;

  // Time-to-red prediction (Prompt 22)
  predicted_days_to_red: number | null;

  // Cost-of-inaction (Prompt 23)
  lost_irrigation_acres_equiv: number;
  lost_value_inr_equiv: number;

  // ROI ranking (Prompt 26)
  desilting_cost_est_inr: number;
  recharge_per_rupee: number;
  roi_score?: number;

  // Data quality (Prompt 28)
  data_quality: 'good' | 'stale' | 'offline';
  low_battery: boolean;
}
