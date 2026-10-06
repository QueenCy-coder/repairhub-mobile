// App launch behaviour: every time the user opens the app (cold start, or tapping the icon after it was in the
// background) it plays the blue RepairHub launch screen and starts at the welcome screen. Hand-offs we start
// ourselves (Maps, phone, share sheet, photo picker) don't count as leaving the app.
type Listener = (then?: string) => void;
const listeners = new Set<Listener>();
let externalUntil = 0;

/** Show the launch animation, then go to `then` (default: the welcome screen). */
export function playLaunch(then?: string) { listeners.forEach(l => l(then)); }
export function onLaunch(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Call before opening Maps / the dialler / the share sheet so returning to RepairHub resumes where you were. */
export function markExternal(ms = 10 * 60 * 1000) { externalUntil = Date.now() + ms; }
export function consumeExternal() { const was = Date.now() < externalUntil; externalUntil = 0; return was; }
