import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, setOnUnauthorized, setToken } from './api';
import * as backend from './backend';
import { initialState, nowLabel, QueuedUpdate, Role, State, techStages, updateLabel } from './data';

const KEY = 'repairhub.api.v1';
/**
 * The API allows about 300 requests per 15 minutes per device, so the app doesn't reload everything on a timer:
 * every POLL_MS it asks only for the newest notification, and reloads in full when that changes (the server
 * notifies both sides of almost every event), every FULL_MS as a safety net, and right after the person's own actions.
 */
const POLL_MS = 12000;
const FULL_MS = 120000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/** Which role this device is currently showing (set by the tab layouts); decides which pushes it shows. */
let deviceRole: Role | null = null;
export const setDeviceRole = (r: Role | null) => { deviceRole = r; };
export const getDeviceRole = () => deviceRole;

type Patch = Partial<State> | ((s: State) => Partial<State>);
type Store = {
  s: State;
  set: (p: Patch) => void;
  /** Latest state, for async work that outlives a render. */
  get: () => State;
  toast: (msg: string) => void;
  /** In-app toast + local push. Server notifications arrive on their own; this is for this device's own actions. */
  notify: (title: string, body: string, route?: string, role?: Role) => void;
  /** Technician status update. Queued when offline, sent as soon as the device is back online. */
  techUpdate: (u: Omit<QueuedUpdate, 'id' | 'at'>) => void;
  /** Runs an API action with a busy flag; shows the server's message if it fails. Returns false on failure. */
  run: (fn: () => Promise<unknown>, okMsg?: string) => Promise<boolean>;
  /** Fetch the latest from the server now. */
  refreshNow: () => Promise<void>;
  busy: boolean;
  online: boolean; deviceOnline: boolean; ready: boolean;
  /** Connected to the RepairHub API. */
  live: boolean;
  reset: () => void;
};
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(true);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sRef = useRef(s);
  sRef.current = s;
  const get = useCallback(() => sRef.current, []);
  // Applied to the latest state right away (not when React next renders), so code that reads `get()` straight after
  // an update sees it: e.g. login → load profile → choose the screen from the verification status.
  const set = useCallback((p: Patch) => {
    const prev = sRef.current, next = { ...prev, ...(typeof p === 'function' ? p(prev) : p) };
    sRef.current = next;
    setS(next);
  }, []);

  /** Swap in a whole new state (saved data, signed out). */
  const replace = useCallback((next: State) => { sRef.current = next; setS(next); }, []);

  const toast = useCallback((msg: string) => {
    set({ toast: msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => set({ toast: null }), 3200);
  }, [set]);

  const notify = useCallback((title: string, body: string, _route?: string, role: Role = 'customer') => {
    if (role === deviceRole) toast(`🔔 ${title}`);
  }, [toast]);

  // Hydrate the saved session (survives app restarts).
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // Browser previews store picks as blob: URLs, which die on reload. Drop them instead of showing broken thumbnails.
        const alive = (list?: { uri: string }[]) => (list ?? []).filter(m => !m.uri.startsWith('blob:'));
        if (saved.api?.token) setToken(saved.api.token);
        replace({ ...initialState(), ...saved, photos: alive(saved.photos), progressPhotos: alive(saved.progressPhotos), claimMedia: alive(saved.claimMedia), disputeMedia: alive(saved.disputeMedia), toast: null });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [replace]);

  // Persist (debounced).
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify({ ...s, toast: null })).catch(() => {}); }, 300);
  }, [s, ready]);

  // Real connectivity.
  useEffect(() => NetInfo.addEventListener(st => setDeviceOnline(st.isConnected !== false && st.isInternetReachable !== false)), []);
  const online = deviceOnline && !s.simOffline;
  const onlineRef = useRef(online);
  onlineRef.current = online;

  // An expired or revoked session sends the person back to log in.
  useEffect(() => {
    setOnUnauthorized(() => {
      setToken(null);
      replace({ ...initialState(), toast: 'Your session has expired. Please log in again.' });
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    });
    return () => setOnUnauthorized(null);
  }, [replace]);

  /* ───── Server sync: poll the API while signed in ───── */
  const seen = useRef<Set<string> | null>(null);
  /** Only news from after the app opened raises a banner or push (older ones are just listed). */
  const openedAt = useRef(Date.now());
  const refreshNow = useCallback(async () => {
    if (!sRef.current.api || !onlineRef.current) return;
    try {
      await backend.refresh(get, set);
      setLive(true);
      // New server notifications → banner + local push (the first load only records what's already there).
      const notes = sRef.current.notifications.filter(n => n.id);
      if (!seen.current) seen.current = new Set(notes.map(n => n.id!));
      else {
        const fresh = notes.filter(n => !seen.current!.has(n.id!) && (n.ts ?? 0) > openedAt.current - 30000);
        notes.forEach(n => seen.current!.add(n.id!));
        fresh.forEach(n => seen.current!.add(n.id!));
        if (fresh[0] && sRef.current.api?.role === deviceRole) {
          toast(`🔔 ${fresh[0].body}`);
          fresh.slice(0, 3).forEach(n => Notifications.scheduleNotificationAsync({ content: { title: n.title, body: n.body, data: n.route ? { route: n.route } : {} }, trigger: null }).catch(() => {}));
        }
      }
    } catch (e) {
      setLive(false);
      if (__DEV__) console.warn('RepairHub refresh failed:', e instanceof Error ? e.message : e);
      if (e instanceof ApiError && e.status === 0) return; // offline / waking up: try again on the next tick
    }
  }, [get, set, toast]);

  const apiUser = s.api?.userId;
  useEffect(() => {
    seen.current = null;
    openedAt.current = Date.now();
    if (!ready || !apiUser) return;
    let alive = true, lastFull = 0, lastNote = '';
    const full = async () => { lastFull = Date.now(); await refreshNow(); lastNote = backend.lastSeenNote(); };
    const tick = async () => {
      if (!alive || !onlineRef.current) return;
      if (Date.now() - lastFull > FULL_MS) return full();
      try {
        const top = await backend.latestNote();
        setLive(true);
        if (top !== lastNote) { lastNote = top; await full(); }
      } catch { setLive(false); }
    };
    full();
    const id = setInterval(tick, POLL_MS);
    // Coming back to the app: catch up straight away.
    const sub = AppState.addEventListener('change', st => { if (st === 'active' && Date.now() - lastFull > 30000) full(); });
    return () => { alive = false; clearInterval(id); sub.remove(); };
  }, [ready, apiUser, refreshNow]);

  const run = useCallback(async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast(okMsg);
      backend.refreshIfStale(get, set).catch(() => {});
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast, get, set]);

  /* ───── Technician updates (offline queue) ───── */
  const send = useCallback(async (u: QueuedUpdate) => {
    const cur = sRef.current, home = cur.mode === 'home';
    const label = u.kind === 'parts' ? 'Paused · waiting for parts' : u.stage ? techStages(home).find(x => x.stage === u.stage)?.title ?? 'Status updated' : updateLabel(u.kind, u.status, cur, home, u.stage);
    await backend.updateJob(get, set, { stage: u.stage, parts: u.kind === 'parts', label, note: u.note || undefined });
    return label;
  }, [get, set]);

  const techUpdate = useCallback((u: Omit<QueuedUpdate, 'id' | 'at'>) => {
    const item: QueuedUpdate = { ...u, id: String(Date.now()), at: nowLabel() };
    if (!online) {
      set(prev => ({ queue: [...prev.queue, item] }));
      toast('Saved offline · will sync when you’re back online');
      return;
    }
    run(async () => { const label = await send(item); toast(`Status updated · ${label}`); });
  }, [online, set, toast, run, send]);

  // Replay the offline queue in order once connectivity returns.
  useEffect(() => {
    if (!online || !s.queue.length) return;
    (async () => {
      const q = [...sRef.current.queue];
      set({ queue: [] });
      let n = 0;
      for (const u of q) { try { await send(u); n++; } catch { /* the server rejected an out-of-date step; skip it */ } }
      set({ lastSync: nowLabel() });
      toast(`Back online · synced ${n} update${n === 1 ? '' : 's'}`);
    })();
  }, [online, s.queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => { setToken(null); replace(initialState()); AsyncStorage.removeItem(KEY).catch(() => {}); }, [replace]);

  return <Ctx.Provider value={{ s, set, get, toast, notify, techUpdate, run, refreshNow, busy, online, deviceOnline, ready, reset, live }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}
