# THULIR — IoT & AI-Driven Groundwater Restoration Platform

> **Startup Summit 2.0 / Pasumai Hackathon**  
> *Real-time monitoring, predictive siltation modeling, and multi-channel emergency field dispatch for groundwater recharge infrastructure.*

---

## 🌊 Overview

**THULIR** is a cyber-ecological water intelligence platform designed to monitor, protect, and restore rural rainwater harvesting and groundwater recharge structures (check dams, percolation ponds, recharge shafts) across Tamil Nadu.

By combining IoT edge telemetry with hydrological AI modeling, THULIR detects siltation buildup, predicts efficiency collapse before monsoon arrival, and equips both non-technical Panchayat officers and State Water Resources Department (WRD) engineers with actionable insights.

---

## 🚀 Key Features

### 1. Infiltration Efficiency Index (IEI)
A transparent, multi-criteria hydrological formula assessing structure health:
$$\text{IEI} = 0.45 \times \text{PPS} + 0.40 \times \text{CRS} + 0.15 \times \text{Integrity}$$
- **PPS (Percolation Performance Score):** Ratio of observed percolation rate ($mm/day$) to baseline benchmark.
- **CRS (Capacity Retention Score):** Retained storage capacity accounting for silt accumulation bed depth ($cm$).
- **Integrity Score:** Hydrograph recession curvature analysis to detect potential structural breach.

### 2. Predictive Siltation & Cost of Inaction
- **OLS Linear Trend Regression:** Predicts exact days until a structure degrades from Warning ($\text{Amber}$) to Critical ($\text{Red}$).
- **Hydro-Economic Impact Modeling:** Quantifies lost recharge volume ($m^3$), agricultural crop deficit ($\text{Acres}$ of irrigation lost), and deferred economic value ($\text{₹}$).

### 3. Limited-Budget ROI Ranking
- Prioritizes desilting work orders by **Capital Recharge Efficiency**:
  $$\text{Recharge per Rupee} = \frac{\text{Lost Recharge Value (₹)}}{\text{Estimated Desilting Cost (₹)}}$$

### 4. Audience-Adaptive Density UX
- **`VIEW: SIMPLE` (Panchayat Presidents & VAOs):** Color-coded status (`🟢 Functional`, `🟡 Degraded`, `🔴 Critical`) and single plain-language actionable instructions.
- **`VIEW: DETAILED` (WRD Engineers & Hydrologists):** Full decimal indices, formula explainability popovers, timeseries rate curves, sensor data quality indicators, and desilting before/after impact analytics.

### 5. PWA Offline Resilience & 1-Click Field Dispatch
- **Progressive Web App (PWA):** Service worker runtime caching (`NetworkFirst` with offline fallback) ensuring full dashboard accessibility in remote rural areas without internet.
- **Instant WhatsApp Dispatch:** 1-click trigger via `wa.me` opening pre-drafted bilingual work orders directly in WhatsApp with zero confirmation delay.
- **Offline Cellular SMS Protocol:** Direct device-native SMS intent (`sms:`) for 100% free offline transmission over 2G networks without paid SMS gateway dependencies.

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet (`react-leaflet`), Chart.js (`react-chartjs-2`), Lucide React, `vite-plugin-pwa`.
- **Backend:** Node.js, Express, TypeScript, Firebase Admin SDK / In-Memory Resilient Fallback Store.
- **Basemap:** Esri World Dark Gray Canvas (keyless, zero watermark).

---

## 🏃 Quickstart

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 2. Run Locally
```bash
# Run both frontend and backend concurrently
npm run dev:all
```
- **Dashboard UI:** [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
- **REST API:** [http://localhost:4000](http://localhost:4000)

---

## 📄 API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/structures` | `GET` | List all structures with latest computed hydrological metrics |
| `/structures/:id` | `GET` | Detailed telemetry and computed data for a structure |
| `/structures/:id/desilting-events` | `GET` | Historical desilting restoration events |
| `/workorders` | `GET` | Active maintenance queue sorted by Urgency or Budget ROI |
| `/summary` | `GET` | Catchment-wide aggregate stats (total lost recharge, acres, ₹ value) |
| `/telemetry` | `POST` | Ingest IoT sensor readings from edge nodes |