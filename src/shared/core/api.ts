// HTTP client for the RepairHub API (Express + MongoDB, JWT bearer auth).
// Every response is { success, message, data, meta }; errors are { success: false, message, errors }.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Media } from './data';

/**
 * API address. Set EXPO_PUBLIC_API_URL in .env (the team's live server) or .env.local (this machine).
 * "local" means the API running on the computer that serves the app (port 5055), reachable from the
 * web preview, the Simulator and phones on the same Wi-Fi.
 */
export const API_URL = (() => {
  const v = (process.env.EXPO_PUBLIC_API_URL ?? '').trim() || 'https://repairhub-api-1.onrender.com/api';
  if (v !== 'local') return v.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:5055/api`;
  const host = (Constants.expoConfig?.hostUri ?? '').split(':')[0];
  return `http://${host && !/exp\.direct|ngrok/.test(host) ? host : 'localhost'}:5055/api`;
})();

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) { super(message); }
}

// Kept on globalThis so a hot reload of this file during development doesn't sign the person out.
const g = globalThis as { __repairhubToken?: string | null };
export const setToken = (t: string | null) => { g.__repairhubToken = t; };
export const hasToken = () => !!g.__repairhubToken;

/** Called when the server says the session is no longer valid (expired or revoked token). */
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (f: (() => void) | null) => { onUnauthorized = f; };

type Opts = { body?: unknown; form?: FormData; query?: Record<string, string | number | boolean | undefined>; timeoutMs?: number };

export async function api<T = any>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, o: Opts = {}): Promise<T> {
  const qs = o.query ? Object.entries(o.query).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = g.__repairhubToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  const ctl = new AbortController();
  // The hosted API sleeps when idle and can take most of a minute to wake up.
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 70000);
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`;
  let res: { ok: boolean; status: number; json: () => Promise<any> };
  try {
    res = o.form && Platform.OS !== 'web'
      ? await sendForm(method, url, headers, o.form, ctl.signal)
      : await fetch(url, { method, headers, body: o.form ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined), signal: ctl.signal });
  } catch (e) {
    if (__DEV__) console.warn(`RepairHub API ${method} ${path} failed before a response:`, e instanceof Error ? e.message : e);
    throw new ApiError(ctl.signal.aborted ? 'RepairHub is taking too long to respond. Try again.' : 'Can’t reach RepairHub. Check your internet connection.', 0);
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    if (res.status === 401 && token) onUnauthorized?.();
    // Joi errors come back as a list; show the first one in plain words.
    const first = Array.isArray(json.errors) ? json.errors[0]?.message ?? json.errors[0] : undefined;
    throw new ApiError(String(first || json.message || `Request failed (${res.status})`).replace(/"/g, ''), res.status, json.errors);
  }
  return json.data as T;
}

/**
 * Multipart upload on phones. Expo's fetch only takes Blob parts, while picked photos are file URIs; React Native's
 * XMLHttpRequest streams `{ uri, name, type }` parts straight from disk, so uploads go through it.
 */
function sendForm(method: string, url: string, headers: Record<string, string>, form: FormData, signal: AbortSignal) {
  return new Promise<{ ok: boolean; status: number; json: () => Promise<any> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json: async () => JSON.parse(xhr.responseText || '{}') });
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Timed out'));
    signal.addEventListener('abort', () => { xhr.abort(); reject(new Error('Aborted')); });
    xhr.send(form);
  });
}

/** Adds picked photos/videos to a multipart form (native file URIs, or blobs in the web preview). */
export async function appendMedia(form: FormData, field: string, items: Media[]) {
  for (const [i, m] of items.entries()) {
    const type = m.type === 'video' ? 'video/mp4' : 'image/jpeg';
    const name = m.name || `${field}-${i + 1}.${m.type === 'video' ? 'mp4' : 'jpg'}`;
    if (Platform.OS === 'web' || /^(blob:|data:|https?:)/.test(m.uri)) {
      const blob = await (await fetch(m.uri)).blob();
      form.append(field, blob, name);
    } else {
      form.append(field, { uri: m.uri, name, type } as unknown as Blob);
    }
  }
}

/** "65f1…c9a2" → "RH-C9A2": a short, stable reference for people (support calls, receipts). */
export const shortRef = (id?: string | null, prefix = 'RH') => (id ? `${prefix}-${id.slice(-4).toUpperCase()}` : `${prefix}-····`);
