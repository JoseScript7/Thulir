// Thin fetch wrapper for the Thulir API with offline caching fallback

import type { StructureWithComputed, StructureDetail, Summary, WorkOrder, DesiltingEvent } from './types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem('thulir_last_sync_timestamp');
  } catch (_) {
    return null;
  }
}

function setLastSyncTime(iso: string) {
  try {
    localStorage.setItem('thulir_last_sync_timestamp', iso);
  } catch (_) {}
}

async function fetchJSON<T>(path: string): Promise<T> {
  const cacheKey = `thulir_cache_${path}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
      throw new Error(`API ${path} returned ${res.status}`);
    }
    const data = await res.json();
    const nowISO = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(nowISO);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (_) {}
    return data as T;
  } catch (err) {
    // Attempt to return cached response when offline or network fails
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (_) {}
    throw err;
  }
}

export function getStructures(): Promise<StructureWithComputed[]> {
  return fetchJSON('/structures');
}

export function getStructure(id: string): Promise<StructureDetail> {
  return fetchJSON(`/structures/${id}`);
}

export function getWorkOrders(): Promise<WorkOrder[]> {
  return fetchJSON('/workorders');
}

export function getSummary(): Promise<Summary> {
  return fetchJSON('/summary');
}

export function getDesiltingEvents(id: string): Promise<DesiltingEvent[]> {
  return fetchJSON(`/structures/${id}/desilting-events`);
}
