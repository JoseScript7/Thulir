// Frontend mirror of server/src/types.ts — shared data shapes

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
  baseline_bed_distance_cm: number;
  original_effective_depth_cm: number;
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
  // Sub-scores
  pps: number;
  crs: number;
  integrity: number;
  // Time-to-red prediction
  predicted_days_to_red: number | null;
  // Cost-of-inaction
  lost_irrigation_acres_equiv: number;
  lost_value_inr_equiv: number;
  // ROI
  desilting_cost_est_inr: number;
  recharge_per_rupee: number;
  roi_score?: number;
  // Data quality
  data_quality: 'good' | 'stale' | 'offline';
  low_battery: boolean;
}

export interface StructureWithComputed extends Structure {
  computed: Computed | null;
}

export interface StructureDetail extends Structure {
  computed: Computed | null;
  telemetry: TelemetryReading[];
}

export interface Summary {
  total_structures: number;
  count_green: number;
  count_amber: number;
  count_red: number;
  total_lost_recharge_m3: number;
  total_lost_irrigation_acres: number;
  total_lost_value_inr: number;
}

export interface WorkOrder extends Computed {
  structure_name: string;
  structure_type: string | null;
  ticket: string;
}

export interface DesiltingEvent {
  timestamp: string;
  iei_before: number;
  iei_7d_after: number;
}
