// RepairHub API ⇄ app state.
// The screens were designed around one live repair per person (the `State` fields: cat, model, status, …).
// `refresh` loads the signed-in person's data from the API into those fields; the actions below send what
// the person does to the API and then refresh. The server is the source of truth for everything shared.
import { api, apiWithMeta, appendMedia, ApiError, setToken, shortRef } from './api';
import { addressPoint, bestPoint, distanceKm, fromGeo, Point } from './geo';
import {
  Account, DoneJob, initialState, Job, JobStatus, Media, nowLabel, PayoutAccount, Quote, Role, State, TechQuote, agoLabel, areaOf,
} from './data';

export type ApiSession = { token: string; userId: string; role: Role; email: string; name: string; phone: string; createdAt: number };
type Set = (p: Partial<State> | ((s: State) => Partial<State>)) => void;
type Get = () => State;

/* ───────── small mappers ───────── */

const ts = (d?: string | null) => (d ? new Date(d).getTime() : 0);
/** Server phone "08030000001" → app format "803 000 0001". */
const localPhone = (p?: string | null) => { const d = (p ?? '').replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d; };
/** App phone "803 000 0001" → "08030000001" (the API's Nigerian number format). */
export const apiPhone = (p: string) => { const d = p.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''); return d ? `0${d}` : ''; };
/** Who this person is in the app's records (phone if they gave one, else their account id). */
export const personKey = (u: { phone?: string | null; _id?: string; userId?: string }) => localPhone(u.phone) || String(u._id ?? u.userId ?? '');
const months = (days?: number) => Math.max(0, Math.round((days ?? 0) / 30));

/**
 * Old requests had no preferred date / time / service-mode fields, so they were packed at the end of the
 * description ("…\n\nPreferred: Mon 20 Oct · 2:00 pm · Home service"). New requests carry them as real
 * fields (preferredDate / preferredTime / serviceMode). packDesc/unpackDesc remain to read older requests —
 * see prefsOf below, which prefers the structured fields.
 */
const PREF = '\n\nPreferred: ';
export const packDesc = (s: Pick<State, 'desc' | 'prefDate' | 'prefTime' | 'mode'>) => `${s.desc.trim()}${PREF}${s.prefDate} · ${s.prefTime} · ${s.mode === 'home' ? 'Home service' : 'Workshop visit'}`;
export function unpackDesc(raw = '') {
  const text = raw.replace(/\r\n/g, '\n'); // multipart uploads turn line breaks into CRLF
  const i = text.lastIndexOf(PREF);
  if (i < 0) return { desc: text, prefDate: '', prefTime: '', mode: 'shop' as const };
  const [prefDate = '', prefTime = '', how = ''] = text.slice(i + PREF.length).split(' · ');
  return { desc: text.slice(0, i), prefDate, prefTime, mode: /home/i.test(how) ? ('home' as const) : ('shop' as const) };
}

/**
 * Preferred date / time / service mode from a request. Newer requests carry them as their own
 * fields (preferredDate / preferredTime / serviceMode); older ones packed them into the
 * description ("…PREF Mon 20 Oct · 2:00 pm · Home"). Both are handled here.
 */
function prefsOf(r: any) {
  const desc = String(r?.problemDescription ?? '').replace(/\r\n/g, '\n');
  if (r?.preferredDate || r?.preferredTime || r?.serviceMode)
    return { desc, prefDate: r.preferredDate ?? '', prefTime: r.preferredTime ?? '', mode: (r.serviceMode === 'home' ? 'home' : 'shop') as 'home' | 'shop' };
  return unpackDesc(desc);
}

/** "Thu 8 Oct" + "10:00 AM – 1:00 PM" → the next such date/time in the future (ISO), as the API requires. */
export function toISO(date: string, time: string) {
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const now = new Date();
  const dm = /(\d{1,2})\s+([a-z]{3})/i.exec(date);
  const d = dm ? new Date(now.getFullYear(), MON.indexOf(dm[2].toLowerCase().slice(0, 3)), Number(dm[1])) : new Date(now.getTime() + 864e5);
  const tm = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(time);
  // "4:00 – 6:00 PM": the AM/PM after the range applies to its start too.
  const half = tm?.[3] ?? /(am|pm)/i.exec(time)?.[1] ?? '';
  let h = tm ? Number(tm[1]) % 12 + (/pm/i.test(half) ? 12 : 0) : 10;
  if (tm && !tm[3] && Number(tm[1]) >= 13) h = Number(tm[1]);
  d.setHours(h, tm?.[2] ? Number(tm[2]) : 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setFullYear(d.getFullYear() + (dm && d.getMonth() < now.getMonth() ? 1 : 0));
  return (d.getTime() > now.getTime() + 60e3 ? d : new Date(now.getTime() + 2 * 3600e3)).toISOString();
}

/** The booked time window (kept in the appointment's notes); after a reschedule only the new start time exists. */
const apptTime = (appt: any, at: Date) => (appt.status !== 'rescheduled' && appt.notes) || `${at.getHours() % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'AM' : 'PM'}`;

/** Technician stage (app) ⇄ job status (API). Stage 1 has its own server status for home visits. */
const apiStatusFor = (stage: number | undefined, home: boolean) =>
  stage === 1 ? (home ? 'on_the_way' : 'diagnosing') : stage === 2 ? 'in_progress' : stage === 5 ? 'quality_check' : stage === 6 ? 'completed' : undefined;
function jobToApp(job: any): { status: JobStatus; techStage: number; parts: boolean; partsUsed: boolean } {
  const hist: any[] = job.statusHistory ?? [];
  const noted = [...hist].reverse().map(h => Number(/\[stage:(\d)\]/.exec(h.note ?? '')?.[1])).find(n => n > 0) ?? 0;
  const partsUsed = hist.some(h => h.status === 'awaiting_parts');
  const st = job.status === 'disputed' ? job.statusBeforeDispute ?? 'in_progress' : job.status;
  const released = ['released', 'cash_settled'].includes(job.payment?.status);
  switch (st) {
    case 'accepted': return { status: JobStatus.Accepted, techStage: 0, parts: false, partsUsed };
    case 'diagnosing': case 'on_the_way': return { status: JobStatus.OnTheWay, techStage: 1, parts: false, partsUsed };
    case 'awaiting_parts': return { status: JobStatus.InProgress, techStage: Math.max(2, noted), parts: true, partsUsed: true };
    case 'on_hold': case 'in_progress': case 'quality_check': case 'ready':
      return { status: JobStatus.InProgress, techStage: Math.max(st === 'quality_check' || st === 'ready' ? 5 : 2, Math.min(noted, 5)), parts: false, partsUsed };
    case 'completed': return { status: released ? JobStatus.Released : JobStatus.Completed, techStage: 6, parts: false, partsUsed };
    default: return { status: JobStatus.Accepted, techStage: 0, parts: false, partsUsed };
  }
}
const LOG_LABEL: Record<string, string> = { accepted: 'Booked · paid into escrow', on_the_way: 'On the way', diagnosing: 'On the way / device received', awaiting_parts: 'Paused · waiting for parts', in_progress: 'Repair in progress', quality_check: 'Testing', ready: 'Ready', on_hold: 'On hold', completed: 'Repair completed · awaiting customer', disputed: 'Problem reported', cancelled: 'Cancelled' };
/** "17:45" today, otherwise "6 Oct, 17:45" (screens add "Today," themselves). */
const fmtAt = (d: string) => {
  const t = new Date(d), hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return t.toDateString() === new Date().toDateString() ? hm : `${t.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()]}, ${hm}`;
};
/** Status history → the app's update log. Our notes look like "[stage:3] Diagnosis completed — <technician's note>". */
const NOTE_SEP = ' — ';
const jobLog = (job: any) => (job.statusHistory ?? []).map((h: any) => {
  const raw = String(h.note ?? '').replace(/\[stage:\d\]\s*/, ''), i = raw.indexOf(NOTE_SEP);
  return { label: (i > 0 ? raw.slice(0, i) : raw) || LOG_LABEL[h.status] || h.status, note: i > 0 ? raw.slice(i + NOTE_SEP.length) : undefined, at: fmtAt(h.changedAt), stage: Number(/\[stage:(\d)\]/.exec(h.note ?? '')?.[1]) || undefined };
});

const NOTE_TITLE: Record<string, string> = { repair_request: 'New repair request', quotation: 'Quotes', appointment: 'Booking', status_update: 'Repair update', payment: 'Payment', warranty: 'Warranty', review: 'New review', dispute: 'Problem reported', verification: 'Verification', team: 'Team' };
const noteRoute = (role: Role, type: string) => role === 'technician'
  ? ({ repair_request: '/jobs', quotation: '/jobs', appointment: '/job', status_update: '/job', payment: '/earnings', warranty: '/tech-claim', review: '/reviews', dispute: '/job', verification: '/verification' } as Record<string, string>)[type]
  : role === 'service_center'
  ? ({ repair_request: '/center-jobs', quotation: '/center-jobs', appointment: '/job', status_update: '/job', payment: '/center-earnings', warranty: '/center-profile', review: '/center-profile', dispute: '/job', verification: '/center-profile', team: '/center-team' } as Record<string, string>)[type]
  : ({ quotation: '/compare', appointment: '/appointments', status_update: '/track', payment: '/track', warranty: '/warranty', review: '/repairs', dispute: '/track' } as Record<string, string>)[type];

/* ───────── session ───────── */

const sessionFrom = (user: any, token: string): ApiSession => ({ token, userId: user._id, role: user.role, email: user.email, name: user.fullName, phone: localPhone(user.phone), createdAt: ts(user.createdAt) });

/** Fresh state for a person who just signed in: nothing from whoever used this device before. */
function signedIn(sess: ApiSession): Partial<State> {
  const base = initialState(), key = sess.phone || sess.userId;
  const common = { ...base, api: sess, email: sess.email, accounts: [], notifications: [], toast: null };
  if (sess.role === 'technician') return { ...common, signupRole: 'technician', techName: sess.name, techPhone: key, techIsNew: true };
  if (sess.role === 'service_center') return { ...common, signupRole: 'service_center', phone: key, centerName: sess.name, techName: sess.name, techIsNew: true };
  return { ...common, signupRole: 'customer', fullName: sess.name, phone: key, custIsNew: true };
}

/**
 * Create the account. It starts unverified and no session is started: the person confirms an email
 * address or phone number with `sendVerificationCode` + `confirmVerification`, then logs in.
 */
export async function register(p: { role: Role; fullName: string; email: string; phone: string; password: string; businessName?: string }) {
  const d = await api<{ user: any }>('POST', '/users/register', { body: { fullName: p.fullName, email: p.email.trim().toLowerCase(), password: p.password, role: p.role, ...(p.phone ? { phone: apiPhone(p.phone) } : {}), ...(p.businessName ? { businessName: p.businessName } : {}) } }).catch(e => {
    throw e instanceof ApiError && e.status === 409 ? new ApiError('An account already uses this email. Log in instead.', 409) : e;
  });
  return d.user;
}

/** Send a 6-digit code to the account's email address or phone number (the person chooses which). */
type VerifySent = { sent: boolean; verified?: boolean; channel: 'email' | 'phone'; destination?: string; code?: string; expiresInMinutes?: number };
export async function sendVerificationCode(email: string, channel: 'email' | 'phone'): Promise<VerifySent> {
  // A server without the verification endpoints (404) has already activated the account: go straight to log-in.
  return api<VerifySent>('POST', '/users/verify/send', { body: { email: email.trim().toLowerCase(), channel } }).catch(e => {
    if (e instanceof ApiError && e.status === 404) return { sent: false, verified: true, channel };
    throw e;
  });
}

/** Redeem the code and activate the account; the person then logs in. */
export async function confirmVerification(email: string, code: string) {
  return api<{ verified: boolean }>('POST', '/users/verify/confirm', { body: { email: email.trim().toLowerCase(), code } });
}

export async function login(p: { role: Role; email: string; password: string }, set: Set) {
  const d = await api<{ user: any; token: string }>('POST', '/users/login', { body: { email: p.email.trim().toLowerCase(), password: p.password } }).catch(e => {
    throw e instanceof ApiError && e.status === 401 ? new ApiError('Incorrect email or password. Try again.', 401) : e;
  });
  if (d.user.role !== p.role) {
    const what = d.user.role === 'technician' ? 'a technician' : d.user.role === 'customer' ? 'a customer' : `a ${String(d.user.role).replace('_', ' ')}`;
    throw new ApiError(`This email belongs to ${what} account. Go back and choose “${d.user.role === 'technician' ? 'I’m a technician' : 'I need a repair'}”.`, 409);
  }
  const sess = sessionFrom(d.user, d.token);
  setToken(sess.token);
  set(signedIn(sess));
  return sess;
}

export function logout(set: Set) {
  setToken(null);
  profileFor = ''; afterFor = ''; appointments.clear(); requests.clear(); warrantyInfo.clear(); techProf = null; centerProf = null; techReviews = []; baseFilled = false; extrasDue = true; topNote = '';
  set({ ...initialState(), api: null });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api('POST', '/users/change-password', { body: { currentPassword, newPassword } });
}

/** Request a password-reset token (1h expiry). The API returns it here — the app is the delivery channel. */
export async function forgotPassword(email: string) {
  return api<{ sent: boolean; resetToken?: string; expiresInMinutes?: number }>('POST', '/users/forgot-password', { body: { email: email.trim().toLowerCase() } });
}

/** Set a new password with the token from `forgotPassword`. */
export async function resetPassword(token: string, newPassword: string) {
  await api('POST', '/users/reset-password', { body: { token, newPassword } });
}

export async function updateMe(p: { fullName?: string; phone?: string }, set: Set, get: Get) {
  const u = await api<any>('PATCH', `/users/${get().api!.userId}`, { body: { ...(p.fullName ? { fullName: p.fullName } : {}), ...(p.phone ? { phone: apiPhone(p.phone) } : {}) } });
  set(s => ({ api: s.api && { ...s.api, name: u.fullName, phone: localPhone(u.phone) } }));
}

/* ───────── categories ───────── */

/** The server's top-level category names, mapped to the names the app uses. */
const CAT_ALIAS: Record<string, string> = { Phones: 'Smartphones', Televisions: 'TVs', 'Refrigerators & freezers': 'Refrigerators' };
async function categories(set: Set, get: Get) {
  if (Object.keys(get().catIds ?? {}).length) return get().catIds;
  const list = await api<any[]>('GET', '/service-categories');
  // Only top-level categories: sub-categories (Screen replacement, Battery …) are not device types.
  const map = Object.fromEntries(list.filter(c => !c.parentCategory && c.isActive !== false).map(c => [CAT_ALIAS[c.name] ?? c.name, c._id]));
  set({ catIds: map });
  return map as Record<string, string>;
}
const catName = (s: State, id: any) => (typeof id === 'object' && id?.name && (CAT_ALIAS[id.name] ?? id.name)) || Object.entries(s.catIds ?? {}).find(([, v]) => v === String(id))?.[0] || 'Smartphones';

/* ───────── refresh (server → app state) ───────── */

/** Newest notification (id + time): a cheap signal that something changed for this person on the server. */
export async function latestNote(): Promise<string> {
  const [n] = await api<any[]>('GET', '/notifications', { query: { limit: 1 } });
  // Compared by time, not id: notifications created in the same instant can come back in either order.
  const sig = n ? String(n.createdAt) : '';
  if (n && ['payment', 'review', 'verification', 'warranty', 'dispute'].includes(n.type) && sig !== topNote) extrasDue = true;
  return sig;
}
/** The newest notification seen by the last refresh. */
export const lastSeenNote = () => topNote;
/** Ask the next refresh to reload wallet, transactions, reviews and profile (e.g. the Earnings screen opened). */
export const wantExtras = () => { extrasDue = true; };

// Cached between refreshes (they rarely change): technicians' public profiles, appointments, the customer profile.
const techProfiles = new Map<string, any>();
const appointments = new Map<string, any>();
const requests = new Map<string, any>();
const warrantyInfo = new Map<string, { id: string; until: number }>();
let profileFor = '';
export const forgetAppointment = (id?: string | null) => { if (id) appointments.delete(id); };
const appointment = async (id?: string | null) => {
  if (!id) return null;
  if (!appointments.has(id)) appointments.set(id, await api<any>('GET', `/appointments/${id}`).catch(() => null));
  return appointments.get(id);
};

let inFlight: Promise<void> | null = null;
export function refresh(get: Get, set: Set): Promise<void> {
  if (inFlight) return inFlight;
  const s = get();
  if (!s.api) return Promise.resolve();
  inFlight = (s.api.role === 'technician' ? refreshTech(get, set) : s.api.role === 'service_center' ? refreshCenter(get, set) : refreshCustomer(get, set)).then(() => { doneAt = Date.now(); }).finally(() => { inFlight = null; });
  return inFlight;
}
let doneAt = 0;
/** Refresh unless an action already did a moment ago (keeps request counts down). */
export const refreshIfStale = (get: Get, set: Set, ms = 3000) => (Date.now() - doneAt < ms ? Promise.resolve() : refresh(get, set));

let topNote = '';
/** Set when a payment/review/verification notification arrives: the next refresh reloads the extras too. */
let extrasDue = true;
async function notifications(get: Get, set: Set) {
  const me = get(), role = me.api!.role, to = role === 'technician' ? me.techPhone : me.phone;
  const { data: list, meta } = await apiWithMeta<any[]>('GET', '/notifications', { query: { limit: 40 } });
  topNote = list[0] ? String(list[0].createdAt) : '';
  set({ unreadCount: typeof meta.unreadCount === 'number' ? meta.unreadCount : undefined, notifications: list.map(n => ({ id: n._id, title: NOTE_TITLE[n.type] ?? 'RepairHub', body: n.message, at: nowLabel(new Date(n.createdAt)), ts: ts(n.createdAt), route: noteRoute(role, n.type), role, to, read: n.isRead })) });
}

/** Quotes on the customer's request, in the app's Quote shape; technicians are added to `accounts` for their profiles. */
async function loadQuotes(rid: string, get: Get, set: Set, at: Point | null) {
  const list = await api<any[]>('GET', `/quotations/repair-request/${rid}`);
  const quotes: Quote[] = list.map(q => ({
    id: q._id, name: q.technicianId?.userId?.fullName ?? 'Technician', rating: Math.round((q.technicianId?.ratingAvg ?? 0) * 10) / 10, jobs: q.technicianId?.jobsCompleted ?? 0,
    km: NaN, reviews: q.technicianId?.ratingCount ?? 0, areas: q.technicianId?.serviceAreas ?? [], labour: q.laborCost ?? 0, parts: q.partsCost ?? 0, total: q.price, days: q.estimatedDays ?? 0,
    warr: months(q.warrantyDays), warrDays: q.warrantyDays ?? 0, note: q.notes ?? '', techId: q.technicianId?._id, accepted: q.status === 'accepted', expiresAt: ts(q.expiresAt),
  }));
  // Public profiles for the technicians who quoted (skills, bio, experience).
  const profiles = await Promise.all(quotes.map(async q => {
    if (!q.techId) return null;
    if (!techProfiles.has(q.techId)) techProfiles.set(q.techId, await api<any>('GET', `/technician-profiles/${q.techId}`).catch(() => null));
    return techProfiles.get(q.techId);
  }));
  // Distance from each technician's base location to the repair (when both are known).
  profiles.forEach((p, i) => { const b = fromGeo(p?.baseLocation); if (b && at) quotes[i].km = Math.round(distanceKm(b, at) * 10) / 10; });
  const cur = get();
  const accounts: Account[] = quotes.map((q, i) => {
    const p = profiles[i];
    return { role: 'technician', name: q.name, phone: '', email: '', pwHash: null, provider: 'password', onboarded: true, createdAt: ts(p?.createdAt),
      verif: 'verified', skills: (p?.serviceCategoryIds ?? []).map((c: any) => catName(cur, c)), areas: p?.serviceAreas ?? q.areas ?? [],
      apiId: q.techId, bio: p?.bio, years: p?.experienceYears, rating: q.rating, reviews: q.reviews ?? 0, jobs: q.jobs } as Account;
  });
  set(p => ({ apiQuotes: quotes, accounts: [...accounts, ...p.accounts.filter(a => !accounts.some(b => b.name === a.name))] }));
  return quotes;
}

let afterFor = '';
async function refreshCustomer(get: Get, set: Set) {
  await categories(set, get);
  const me0 = get().api!.userId, needProfile = profileFor !== me0;
  const [reqs, jobs, prof] = await Promise.all([api<any[]>('GET', '/repair-requests', { query: { limit: 50 } }), api<any[]>('GET', '/repair-jobs', { query: { limit: 50 } }), needProfile ? api<any>('GET', '/customer-profiles/me') : null]);
  if (needProfile) profileFor = me0;
  // The saved home address lives on the server; a customer who has one has finished set-up (on any device).
  if (prof?.address) set(p => ({ custAddress: prof.address, custOnboarded: true, location: p.location || prof.address }));
  else if (needProfile && !get().custAddress) set({ custOnboarded: false });
  const s = get(), me = s.phone;
  const jobOf = (rid: string) => jobs.find(j => String(j.repairRequestId?._id ?? j.repairRequestId) === rid);
  // Finished: cancelled, refunded, or completed and paid out. (The job is checked too: after a refund ruling the
  // API leaves the request itself "in progress".)
  const finished = (r: any) => { const j = jobOf(r._id); return r.status === 'cancelled' || j?.status === 'cancelled' || j?.payment?.status === 'refunded' || (r.status === 'completed' && ['released', 'cash_settled'].includes(j?.payment?.status)); };
  // The live request: the one on screen, or (fresh sign-in) the newest one still in progress.
  const live = (s.rid ? reqs.find(r => r._id === s.rid) : null) ?? (!s.rid && s.status === JobStatus.None ? reqs.find(r => !finished(r)) : null);

  // Earlier requests become the history list (finished or cancelled).
  const past = reqs.filter(r => r._id !== live?._id && finished(r));
  // Warranty id and expiry for each completed repair (the API creates one per completed job; cached, they don't change).
  await Promise.all(past.map(r => jobOf(r._id)).filter(j => j && j.status === 'completed' && ['released', 'cash_settled'].includes(j.payment?.status)).map(async j => {
    if (!warrantyInfo.has(j._id)) { const w = await api<any>('GET', `/warranty-records/job/${j._id}`).catch(() => null); if (w) warrantyInfo.set(j._id, { id: w._id, until: ts(w.expiresAt) }); }
  }));
  // Names of the technicians on earlier jobs (public profiles, cached).
  await Promise.all(past.map(r => jobOf(r._id)?.technicianId).filter(Boolean).map(async (tid: string) => {
    if (!techProfiles.has(String(tid))) techProfiles.set(String(tid), await api<any>('GET', `/technician-profiles/${tid}`).catch(() => null));
  }));
  const doneJobs: DoneJob[] = past.map(r => {
    const j = jobOf(r._id), u = prefsOf(r);
    return { tech: j ? String(j.technicianUserId) : '', techName: j ? techProfiles.get(String(j.technicianId))?.userId?.fullName ?? '' : '', custPhone: me, id: shortRef(r._id), dev: r.brandModel || r.itemType, cust: s.fullName, cat: catName(s, r.serviceCategoryId),
      service: u.desc.split(/[,.]/)[0], gross: j && ['released', 'cash_settled', 'refunded'].includes(j.payment?.status) ? j.price : 0, warr: months(j?.warrantyDays), warrDays: j?.warrantyDays, warrId: warrantyInfo.get(j?._id)?.id, warrUntil: warrantyInfo.get(j?._id)?.until, at: ts(j?.completedAt ?? r.updatedAt), rating: 0,
      status: r.status === 'cancelled' || j?.status === 'cancelled' ? 'Cancelled' : 'Completed', before: r.mediaUrls?.[0], apiJobId: j?._id } as DoneJob;
  });
  set({ doneJobs });

  if (!live) {
    // The request on screen was removed or belongs to someone else: show no live request.
    if (s.rid) set({ rid: null, jobId: null, status: JobStatus.None });
    return notifications(get, set);
  }
  const u = prefsOf(live);
  const base: Partial<State> = {
    rid: live._id, cat: catName(s, live.serviceCategoryId), model: live.brandModel || live.itemType, desc: u.desc, location: live.address ?? '',
    prefDate: u.prefDate, prefTime: u.prefTime, mode: u.mode, requestAt: ts(live.createdAt), owner: { name: s.fullName, phone: me, photo: s.custPhoto },
    photos: (live.mediaUrls ?? []).map((uri: string) => ({ uri, type: /\.(mp4|mov)$/i.test(uri) ? 'video' : 'image' } as Media)), cancelled: live.status === 'cancelled',
  };
  if (live.status === 'cancelled') { set({ ...base, status: JobStatus.None, sel: null }); return notifications(get, set); }

  const quotes = await loadQuotes(live._id, get, set, fromGeo(live.location));
  const job = jobOf(live._id);
  if (!job) {
    set({ ...base, status: quotes.length ? JobStatus.Quoted : JobStatus.Requested, quoted: quotes.length > 0, quotesIn: quotes.length, jobId: null, sel: get().sel && quotes.some(q => q.id === get().sel) ? get().sel : null });
    return notifications(get, set);
  }
  const full = await api<any>('GET', `/repair-jobs/${job._id}`);
  const appt = await appointment(full.appointmentId);
  const sel = quotes.find(q => q.id === String(full.quotationId))?.id ?? String(full.quotationId);
  const paid = ['held', 'cash', 'released', 'cash_settled'].includes(full.payment?.status);
  const at = appt ? new Date(appt.scheduledAt) : null;
  const when = at ? { date: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${at.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][at.getMonth()]}`, time: apptTime(appt, at) } : {};
  const mapped = jobToApp(full);
  // Name and phone of the technician (shown once booked) for the call button and profile.
  const tq = quotes.find(q => q.id === sel);
  if (full.contact && tq) set(p => ({ accounts: p.accounts.map(a => (a.name === tq.name ? { ...a, phone: localPhone(full.contact.phone) } : a)), qBy: { name: tq.name, phone: localPhone(full.contact.phone), rating: tq.rating, jobs: tq.jobs } }));

  const extra: Partial<State> = { jobId: full._id, apptId: full.appointmentId ?? null, sel, ...when, rescheduled: appt?.status === 'rescheduled' ? 1 : 0, jobLog: jobLog(full), completedAt: ts(full.completedAt), payState: full.payment?.status };
  // Cancelled (or refunded after a reported problem): show it as cancelled, with the refund and RepairHub's decision.
  if (full.status === 'cancelled' || full.payment?.status === 'refunded') {
    const disputes = await api<any[]>('GET', '/disputes').catch(() => []);
    const d = disputes.find(x => String(x.repairJobId?._id ?? x.repairJobId) === String(full._id));
    set({ ...base, ...extra, status: JobStatus.None, cancelled: true, refund: full.payment?.status === 'refunded' ? full.price : 0,
      dispute: d ? { id: shortRef(d._id, 'D'), status: d.status === 'open' ? 'Under review' : 'Resolved', outcome: d.resolution?.note || 'RepairHub refunded your payment.' } : null });
    return notifications(get, set);
  }
  if (!paid) { set({ ...base, ...extra, status: JobStatus.Quoted, quoted: true }); return notifications(get, set); }

  // Warranty, dispute and review — once there's something to show, and then only when news arrives.
  const after = mapped.status >= JobStatus.Completed || full.status === 'disputed';
  if (!after || (!extrasDue && afterFor === full._id)) {
    set({ ...base, ...extra, ...mapped, quoted: true });
    return notifications(get, set);
  }
  extrasDue = false; afterFor = full._id;
  const [warranty, disputes, reviews] = await Promise.all([
    mapped.status >= JobStatus.Completed ? api<any>('GET', `/warranty-records/job/${full._id}`).catch(() => null) : null,
    api<any[]>('GET', '/disputes').catch(() => []),
    mapped.status >= JobStatus.Released && tq?.techId ? api<any[]>('GET', `/reviews/technician/${tq.techId}`).catch(() => []) : [],
  ]);
  const d = (disputes as any[]).find(x => String(x.repairJobId?._id ?? x.repairJobId) === String(full._id));
  const c = warranty?.claims?.[warranty.claims.length - 1];
  const r = (reviews as any[]).find(x => String(x.repairJobId) === String(full._id));
  set({
    ...base, ...extra, ...mapped, quoted: true,
    warrantyId: warranty?._id ?? null, warrantyUntil: ts(warranty?.expiresAt),
    claim: c ? { status: c.status === 'open' ? 'Submitted' : 'Resolved', issue: c.description, date: nowLabel(new Date(c.createdAt)), at: ts(c.createdAt), outcome: c.status === 'resolved' ? (c.resolutionNote || 'The technician fixed the problem under warranty.') : c.status === 'rejected' ? (c.resolutionNote || 'This fault isn’t covered by the warranty.') : undefined, resolvedAt: c.resolvedAt ? nowLabel(new Date(c.resolvedAt)) : undefined, resolution: c.status, apiId: c._id } as State['claim'] : null,
    dispute: d ? { id: shortRef(d._id, 'D'), status: d.status === 'open' ? 'Under review' : 'Resolved', outcome: d.resolution?.note || ({ release: 'RepairHub reviewed both sides and released the payment to the technician.', refund: 'RepairHub refunded your payment.', partial: `RepairHub refunded part of your payment${d.resolution?.refundAmount ? ` (₦${d.resolution.refundAmount})` : ''}.` } as Record<string, string>)[d.resolution?.decision] } : null,
    ...(r ? { reviewed: true, rating: r.rating, tags: r.tags ?? [], reviewText: r.comment ?? '', reply: r.reply ?? '', replied: !!r.repliedAt } : {}),
  });
  return notifications(get, set);
}

/** "Diagnosis completed" and "Repair in progress" share the API's in_progress status, so this device keeps them. */
function keepLocalStages(prev: State, jobId: string, mapped: ReturnType<typeof jobToApp>, log: State['jobLog']) {
  if (prev.jobId !== jobId || mapped.status !== JobStatus.InProgress) return { jobLog: log };
  const extra = (prev.jobLog ?? []).filter(e => (e.stage === 3 || e.stage === 4) && !log.some(l => l.stage === e.stage));
  return { techStage: Math.max(mapped.techStage, Math.min(prev.techStage ?? 0, 4)), jobLog: [...log, ...extra] };
}

let techProf: any = null;
let techReviews: any[] = [];
let baseFilled = false;
async function refreshTech(get: Get, set: Set) {
  await categories(set, get);
  const extras = extrasDue || !techProf || techProf.verificationStatus !== 'verified';
  extrasDue = false;
  // The technician's own profile (verification, rating): reloaded while under review, or with the extras.
  const prof = extras ? (techProf = await api<any>('GET', '/technician-profiles/me')) : techProf;
  const s0 = get();
  const skills = (prof.serviceCategoryIds ?? []).map((c: any) => catName(s0, c));
  const techVerif = prof.verificationStatus === 'verified' ? 'verified' : prof.verificationStatus === 'rejected' ? 'rejected' : prof.verificationDocs?.length ? 'pending' : 'new';
  set({ techProfileId: prof._id, techVerif, rejectNote: prof.verificationFeedback ?? '', ...(skills.length ? { skills } : {}), ...(prof.serviceAreas?.length ? { areas: prof.serviceAreas } : {}),
    techRating: { avg: prof.ratingAvg ?? 0, count: prof.ratingCount ?? 0, jobs: prof.jobsCompleted ?? 0 }, techSubmittedAt: ts(prof.updatedAt) });
  if (techVerif !== 'verified') return notifications(get, set);
  // Technicians who registered before locations were saved: use their first service area's centre (no prompt).
  if (!fromGeo(prof.baseLocation) && prof.serviceAreas?.length && !baseFilled) {
    baseFilled = true;
    const a = addressPoint(prof.serviceAreas[0]);
    if (a) {
      await api('PATCH', `/technician-profiles/${prof._id}`, { body: { baseLocation: a } }).catch(() => {});
      prof.baseLocation = { type: 'Point', coordinates: [a.lng, a.lat] };
    }
  }
  set({ techPoint: fromGeo(prof.baseLocation) });

  const [open, mine, jobs, wallet, txns, reviews] = await Promise.all([
    api<any[]>('GET', '/repair-requests', { query: { limit: 50 } }),
    api<any[]>('GET', '/quotations/mine'),
    api<any[]>('GET', '/repair-jobs', { query: { limit: 50 } }),
    extras ? api<any>('GET', '/wallets/me') : null,
    extras ? api<any[]>('GET', '/transactions/me', { query: { limit: 50 } }) : null,
    extras ? api<any[]>('GET', `/reviews/technician/${prof._id}`).catch(() => []) : null,
  ]);
  if (reviews) techReviews = reviews;
  const s = get();
  const base = fromGeo(prof.baseLocation);
  const board: Job[] = open.map(r => {
    const u = prefsOf(r), at = fromGeo(r.location);
    return { id: r._id, cust: 'Customer', dev: r.brandModel || r.itemType, issue: u.desc, cat: catName(s, r.serviceCategoryId), area: areaOf(r.address ?? ''),
      km: base && at ? Math.round(distanceKm(base, at) * 10) / 10 : NaN, ago: agoLabel(ts(r.createdAt)),
      photos: r.mediaUrls?.length ?? 0, when: u.prefDate ? `${u.prefDate}${u.prefTime ? `, ${u.prefTime}` : ''}` : 'Flexible', mode: u.mode === 'home' ? 'Home service' : 'Visit shop', media: r.mediaUrls ?? [], address: r.address ?? '' } as Job;
  });
  // Nearest first; requests without a location keep their order at the end.
  board.sort((a, b) => (Number.isFinite(a.km) ? a.km : Infinity) - (Number.isFinite(b.km) ? b.km : Infinity));
  const quoteStatus: Record<string, string> = Object.fromEntries(mine.map(q => [String(q.repairRequestId?._id ?? q.repairRequestId), q.status]));
  const otherQuotes: Record<string, TechQuote> = Object.fromEntries(mine.filter(q => ['pending', 'accepted'].includes(q.status)).map(q => [String(q.repairRequestId?._id ?? q.repairRequestId),
    { labour: q.laborCost ?? 0, parts: q.partsCost ?? 0, days: q.estimatedDays ?? 0, warr: months(q.warrantyDays), note: q.notes ?? '', qid: q._id, status: q.status } as TechQuote]));
  const settled = (j: any) => ['released', 'refunded', 'cash_settled'].includes(j.payment?.status) || j.status === 'cancelled';
  const paid = (j: any) => ['held', 'cash', 'released', 'cash_settled'].includes(j.payment?.status);
  const liveJob = jobs.find(j => !settled(j) && paid(j));
  // Finished jobs: the job list only carries the item type, so each request's model is loaded once and cached.
  const finished = jobs.filter(j => j.status === 'completed' && settled(j));
  await Promise.all(finished.map(async j => {
    const rid = String(j.repairRequestId?._id ?? j.repairRequestId);
    if (!requests.has(rid)) requests.set(rid, await api<any>('GET', `/repair-requests/${rid}`).catch(() => null));
  }));
  const doneJobs: DoneJob[] = finished.map(j => {
    const r = techReviews.find(x => String(x.repairJobId) === String(j._id)), rq = requests.get(String(j.repairRequestId?._id ?? j.repairRequestId));
    return { tech: s.techPhone ?? '', techName: s.techName, custPhone: String(j.customerUserId), id: shortRef(j.repairRequestId?._id ?? j.repairRequestId), dev: rq?.brandModel || j.repairRequestId?.itemType || 'Device',
      cust: 'Customer', cat: rq ? catName(s, rq.serviceCategoryId) : j.repairRequestId?.itemType ?? 'Smartphones', before: rq?.mediaUrls?.[0], service: prefsOf(j.repairRequestId).desc.split(/[,.]/)[0], gross: j.price, warr: months(j.warrantyDays), at: ts(j.completedAt),
      rating: r?.rating ?? 0, reviewText: r?.comment, tags: r?.tags, status: 'Completed', apiJobId: j._id, reviewId: r?._id, reply: r?.reply ?? '' } as DoneJob;
  });
  // The API keeps bank details only inside each withdrawal: on a new phone, reuse the latest one as the payout account.
  const lastWd = txns?.find(t => t.type === 'withdrawal' && t.payoutDetails?.accountNumber);
  if (lastWd && !get().payoutAccount) set({ payoutAccount: { bank: lastWd.payoutDetails.bankName, number: lastWd.payoutDetails.accountNumber, name: lastWd.payoutDetails.accountName } });
  set({
    board, otherQuotes, quoteStatus, doneJobs,
    ...(wallet ? { wallet: { balance: wallet.balance ?? 0, withdrawable: wallet.withdrawable ?? wallet.balance ?? 0 } } : {}),
    ...(txns ? { apiTxns: txns.map(t => ({ id: t._id, type: t.type, amount: t.amount, status: t.status, at: ts(t.createdAt), ref: t.reference, bank: t.payoutDetails?.bankName, acct: t.payoutDetails?.accountNumber, name: t.payoutDetails?.accountName, jobId: t.repairJobId ? String(t.repairJobId) : undefined })) } : {}),
  });

  if (!liveJob) {
    if (s.jobId) set({ jobId: null, rid: null, status: JobStatus.None, sel: null, quoted: false, qBy: null });
    return notifications(get, set);
  }
  const full = await api<any>('GET', `/repair-jobs/${liveJob._id}`);
  const appt = await appointment(full.appointmentId);
  const req = full.repairRequestId ?? {};
  const u = prefsOf(req);
  const q = mine.find(x => x._id === String(full.quotationId));
  const at = appt ? new Date(appt.scheduledAt) : null;
  const mapped = jobToApp(full);
  // Applied to the latest state: a stage the technician saved while this refresh was loading must survive.
  set(p => ({
    rid: req._id ?? null, jobId: full._id, apptId: full.appointmentId ?? null, cat: catName(get(), q?.repairRequestId?.serviceCategoryId ?? req.serviceCategoryId) || req.itemType,
    model: req.brandModel || req.itemType, desc: u.desc, location: req.address ?? appt?.address ?? '', prefDate: u.prefDate, prefTime: u.prefTime, mode: appt?.serviceMode === 'onsite' || u.mode === 'home' ? 'home' : 'shop',
    ...(at ? { date: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${at.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][at.getMonth()]}`, time: apptTime(appt, at) } : {}),
    owner: full.contact ? { name: full.contact.name, phone: localPhone(full.contact.phone), photo: null } : null,
    photos: (req.mediaUrls ?? []).map((uri: string) => ({ uri, type: 'image' } as Media)),
    sel: 'emeka', quoted: true, qBy: { name: s.techName, phone: s.techPhone ?? '', rating: s.techRating?.avg ?? 0, jobs: s.techRating?.jobs ?? 0 },
    qLabour: q?.laborCost ?? full.price, qParts: q?.partsCost ?? 0, qDays: q?.estimatedDays ?? 1, qWarr: months(full.warrantyDays), qNote: q?.notes ?? '',
    ...mapped, ...keepLocalStages(p, full._id, mapped, jobLog(full)), completedAt: ts(full.completedAt), requestAt: ts(req.createdAt ?? full.createdAt), payState: full.payment?.status,
    dispute: full.status === 'disputed' ? { id: 'D', status: 'Under review' } : null,
  }));
  return notifications(get, set);
}

let centerProf: any = null;
/** A service center's own world: profile + verification, team, open requests, quotes, jobs, wallet. */
async function refreshCenter(get: Get, set: Set) {
  await categories(set, get);
  const extras = extrasDue || !centerProf || centerProf.verificationStatus !== 'verified';
  extrasDue = false;
  // The center's own profile (verification, rating): reloaded while under review, or with the extras.
  const prof = extras ? (centerProf = await api<any>('GET', '/service-centers/me')) : centerProf;
  const s0 = get();
  const skills = (prof.serviceCategoryIds ?? []).map((c: any) => catName(s0, c));
  const centerVerif = prof.verificationStatus === 'verified' ? 'verified' : prof.verificationStatus === 'rejected' ? 'rejected' : prof.verificationDocs?.length ? 'pending' : 'new';
  set({
    centerId: prof._id, centerVerif, rejectNote: prof.verificationFeedback ?? '',
    centerName: prof.businessName ?? s0.centerName, centerDesc: prof.description ?? '', centerAddress: prof.address ?? s0.centerAddress,
    ...(skills.length ? { skills } : {}),
    ...((prof.areas?.length ?? 0) ? { areas: prof.areas } : {}),
    // techRating mirrors the center's rating so the shared helpers (useWallet, mini stats) work unchanged.
    centerRating: { avg: prof.ratingAvg ?? 0, count: prof.ratingCount ?? 0, jobs: prof.jobsCompleted ?? 0 },
    techRating: { avg: prof.ratingAvg ?? 0, count: prof.ratingCount ?? 0, jobs: prof.jobsCompleted ?? 0 },
    techSubmittedAt: ts(prof.updatedAt), centerSubmittedAt: ts(prof.updatedAt),
  });
  if (centerVerif !== 'verified') return notifications(get, set);
  // Team members: technicians whose profile lists this center as their employer.
  const team = await api<any[]>('GET', `/service-centers/${prof._id}/team`);
  set({ centerTeam: team.map(m => ({ id: m._id, name: m.userId?.fullName ?? 'Technician', email: m.userId?.email ?? '', phone: localPhone(m.userId?.phone) })) });

  const [open, mine, jobs, wallet, txns] = await Promise.all([
    api<any[]>('GET', '/repair-requests', { query: { limit: 50 } }),
    api<any[]>('GET', '/quotations/mine'),
    api<any[]>('GET', '/repair-jobs', { query: { limit: 50 } }),
    extras ? api<any>('GET', '/wallets/me') : null,
    extras ? api<any[]>('GET', '/transactions/me', { query: { limit: 50 } }) : null,
  ]);
  const s = get();
  const base = fromGeo(prof.location);
  const board: Job[] = open.map(r => {
    const u = prefsOf(r), at = fromGeo(r.location);
    return { id: r._id, cust: 'Customer', dev: r.brandModel || r.itemType, issue: u.desc, cat: catName(s, r.serviceCategoryId), area: areaOf(r.address ?? ''),
      km: base && at ? Math.round(distanceKm(base, at) * 10) / 10 : NaN, ago: agoLabel(ts(r.createdAt)),
      photos: r.mediaUrls?.length ?? 0, when: u.prefDate ? `${u.prefDate}${u.prefTime ? `, ${u.prefTime}` : ''}` : 'Flexible', mode: u.mode === 'home' ? 'Home service' : 'Visit shop', media: r.mediaUrls ?? [], address: r.address ?? '' } as Job;
  });
  // Nearest first; requests without a location keep their order at the end.
  board.sort((a, b) => (Number.isFinite(a.km) ? a.km : Infinity) - (Number.isFinite(b.km) ? b.km : Infinity));
  // Quotes this center has sent, keyed by request id (with the team member the work was assigned to).
  const quoteStatus: Record<string, string> = Object.fromEntries(mine.map(q => [String(q.repairRequestId?._id ?? q.repairRequestId), q.status]));
  const otherQuotes: Record<string, TechQuote> = Object.fromEntries(mine.filter(q => ['pending', 'accepted'].includes(q.status)).map(q => [String(q.repairRequestId?._id ?? q.repairRequestId),
    { labour: q.laborCost ?? 0, parts: q.partsCost ?? 0, days: q.estimatedDays ?? 0, warr: months(q.warrantyDays), note: q.notes ?? '', qid: q._id, status: q.status, technicianId: q.technicianId ? String(q.technicianId) : undefined } as TechQuote]));
  const settled = (j: any) => ['released', 'refunded', 'cash_settled'].includes(j.payment?.status) || j.status === 'cancelled';
  const paid = (j: any) => ['held', 'cash', 'released', 'cash_settled'].includes(j.payment?.status);
  const liveJob = jobs.find(j => !settled(j) && paid(j));
  const finished = jobs.filter(j => j.status === 'completed' && settled(j));
  // Finished jobs: the job list only carries the item type, so each request's model is loaded once and cached.
  await Promise.all(finished.map(async j => {
    const rid = String(j.repairRequestId?._id ?? j.repairRequestId);
    if (!requests.has(rid)) requests.set(rid, await api<any>('GET', `/repair-requests/${rid}`).catch(() => null));
  }));
  const doneJobs: DoneJob[] = finished.map(j => {
    const rq = requests.get(String(j.repairRequestId?._id ?? j.repairRequestId));
    return { tech: '', techName: s.centerName, custPhone: String(j.customerUserId), id: shortRef(j.repairRequestId?._id ?? j.repairRequestId), dev: rq?.brandModel || j.repairRequestId?.itemType || 'Device',
      cust: 'Customer', cat: rq ? catName(s, rq.serviceCategoryId) : 'Smartphones', before: rq?.mediaUrls?.[0], service: prefsOf(j.repairRequestId).desc.split(/[,.]/)[0], gross: j.price, warr: months(j.warrantyDays), at: ts(j.completedAt),
      rating: 0, status: 'Completed', apiJobId: j._id } as DoneJob;
  });
  set({
    board, otherQuotes, quoteStatus, doneJobs,
    ...(wallet ? { wallet: { balance: wallet.balance ?? 0, withdrawable: wallet.withdrawable ?? wallet.balance ?? 0 } } : {}),
    ...(txns ? { apiTxns: txns.map(t => ({ id: t._id, type: t.type, amount: t.amount, status: t.status, at: ts(t.createdAt), ref: t.reference, bank: t.payoutDetails?.bankName, acct: t.payoutDetails?.accountNumber, name: t.payoutDetails?.accountName, jobId: t.repairJobId ? String(t.repairJobId) : undefined })) } : {}),
  });

  if (!liveJob) {
    if (s.jobId) set({ jobId: null, rid: null, status: JobStatus.None, sel: null, quoted: false, qBy: null });
    return notifications(get, set);
  }
  const full = await api<any>('GET', `/repair-jobs/${liveJob._id}`);
  const appt = await appointment(full.appointmentId);
  const req = full.repairRequestId ?? {};
  const u = prefsOf(req);
  const q = mine.find(x => x._id === String(full.quotationId));
  const at = appt ? new Date(appt.scheduledAt) : null;
  const mapped = jobToApp(full);
  set(p => ({
    rid: req._id ?? null, jobId: full._id, apptId: full.appointmentId ?? null, cat: catName(get(), q?.repairRequestId?.serviceCategoryId ?? req.serviceCategoryId) || req.itemType,
    model: req.brandModel || req.itemType, desc: u.desc, location: req.address ?? appt?.address ?? '', prefDate: u.prefDate, prefTime: u.prefTime, mode: appt?.serviceMode === 'onsite' || u.mode === 'home' ? 'home' : 'shop',
    ...(at ? { date: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${at.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][at.getMonth()]}`, time: apptTime(appt, at) } : {}),
    owner: full.contact ? { name: full.contact.name, phone: localPhone(full.contact.phone), photo: null } : null,
    photos: (req.mediaUrls ?? []).map((uri: string) => ({ uri, type: 'image' } as Media)),
    sel: 'emeka', quoted: true, qBy: { name: s.centerName, phone: s.phone ?? '', rating: s.centerRating?.avg ?? 0, jobs: s.centerRating?.jobs ?? 0 },
    qLabour: q?.laborCost ?? full.price, qParts: q?.partsCost ?? 0, qDays: q?.estimatedDays ?? 1, qWarr: months(full.warrantyDays), qNote: q?.notes ?? '',
    ...mapped, ...keepLocalStages(p, full._id, mapped, jobLog(full)), completedAt: ts(full.completedAt), requestAt: ts(req.createdAt ?? full.createdAt), payState: full.payment?.status,
    dispute: full.status === 'disputed' ? { id: 'D', status: 'Under review' } : null,
  }));
  return notifications(get, set);
}

/** Verified technicians (public list), added to `accounts` so their profiles open from search. */
export async function listTechnicians(get: Get, set: Set) {
  await categories(set, get);
  const list = await api<any[]>('GET', '/technician-profiles', { query: { sort: 'rating', limit: 50 } });
  const cur = get();
  const accounts: Account[] = list.map(p => ({ role: 'technician', name: p.userId?.fullName ?? 'Technician', phone: '', email: '', pwHash: null, provider: 'password', onboarded: true,
    createdAt: ts(p.createdAt), verif: 'verified', skills: (p.serviceCategoryIds ?? []).map((c: any) => catName(cur, c)), areas: p.serviceAreas ?? [],
    apiId: p._id, bio: p.bio, years: p.experienceYears, rating: Math.round((p.ratingAvg ?? 0) * 10) / 10, reviews: p.ratingCount ?? 0, jobs: p.jobsCompleted ?? 0 } as Account));
  set(p => ({ accounts: [...accounts, ...p.accounts.filter(a => !accounts.some(b => b.apiId === a.apiId || b.name === a.name))] }));
}

/* ───────── customer actions ───────── */

export async function submitRequest(get: Get, set: Set) {
  const s = get(), cats = await categories(set, get);
  const form = new FormData();
  if (!cats[s.cat]) throw new ApiError(`${s.cat} repairs aren’t available yet. Please choose another device type.`, 400);
  form.append('serviceCategoryId', cats[s.cat]);
  form.append('itemType', s.cat);
  form.append('brandModel', s.model.trim());
  form.append('problemDescription', s.desc.trim());
  form.append('urgency', 'normal');
  form.append('address', s.location.trim());
  // The preferred date / time / service mode are real request fields on the API (no longer packed into the description).
  if (s.prefDate) form.append('preferredDate', s.prefDate);
  if (s.prefTime) form.append('preferredTime', s.prefTime);
  form.append('serviceMode', s.mode);
  // Where the repair is: the phone's position (asked here, when it's clearly useful), else the address's area.
  const at = await bestPoint(s.location);
  if (at) form.append('location', JSON.stringify(at));
  await appendMedia(form, 'media', s.photos);
  const r = await api<any>('POST', '/repair-requests', { form, timeoutMs: 120000 });
  set({ rid: r._id, jobId: null, apptId: null, warrantyId: null, apiQuotes: [], status: JobStatus.Requested, requestAt: ts(r.createdAt), cancelled: false, sel: null, payState: undefined });
  return r;
}

export async function cancelRequest(get: Get, set: Set) {
  const s = get();
  if (s.rid) await api('PATCH', `/repair-requests/${s.rid}/cancel`);
  set({ status: JobStatus.None, cancelled: true, sel: null, refund: 0 });
}

/** Choose a quote and book the visit: accept the quotation, then create the appointment (which creates the job). */
export async function book(get: Get, set: Set) {
  const s = get();
  if (s.jobId) return s.jobId; // already booked; only payment is left
  const q = s.apiQuotes.find(x => x.id === s.sel);
  if (!q) throw new ApiError('Choose a quote first.', 400);
  if (!q.accepted) await api('PATCH', `/quotations/${q.id}/accept`);
  const a = await api<any>('POST', '/appointments', { body: { quotationId: q.id, scheduledAt: toISO(s.date, s.time), serviceMode: s.mode === 'home' ? 'onsite' : 'dropoff', address: s.location || undefined, notes: s.time } });
  set({ jobId: a.repairJobId, apptId: a._id });
  return a.repairJobId as string;
}

/**
 * Pay into escrow with Paystack. Returns the checkout page to open; after the customer pays there,
 * `checkPayment` confirms it with the server.
 */
export async function startPayment(get: Get, set: Set) {
  const jobId = await book(get, set);
  const p = await api<{ reference: string; authorizationUrl: string; amount: number }>('POST', '/transactions/pay', { body: { repairJobId: jobId, method: 'paystack' } });
  set({ payRef: p.reference });
  return p;
}
export async function checkPayment(get: Get, set: Set) {
  const s = get();
  if (!s.payRef) return 'none' as const;
  const t = await api<any>('GET', `/transactions/verify/${s.payRef}`);
  if (t.status === 'success') { await refresh(get, set); return 'paid' as const; }
  return t.status === 'failed' ? ('failed' as const) : ('pending' as const);
}
/** Pay the technician in cash after the repair (the API's pay-on-delivery option). */
export async function payCash(get: Get, set: Set) {
  const jobId = await book(get, set);
  await api('POST', '/transactions/pay', { body: { repairJobId: jobId, method: 'cash' } });
  await refresh(get, set);
}

export async function reschedule(get: Get, set: Set, date: string, time: string) {
  const s = get();
  await api('PATCH', `/appointments/${s.apptId}/reschedule`, { body: { scheduledAt: toISO(date, time) } });
  forgetAppointment(s.apptId);
  set(p => ({ date, time, rescheduled: p.rescheduled + 1 }));
}
export async function cancelAppointment(get: Get, set: Set, reason?: string) {
  const s = get();
  await api('PATCH', `/appointments/${s.apptId}/cancel`, { body: reason ? { reason } : {} });
  await refresh(get, set);
}

export async function confirmRelease(get: Get, set: Set) {
  extrasDue = true;
  await api('POST', `/repair-jobs/${get().jobId}/confirm`);
  await refresh(get, set);
}
export async function review(get: Get, set: Set) {
  extrasDue = true;
  const s = get();
  await api('POST', '/reviews', { body: { repairJobId: s.jobId, rating: s.rating, ...(s.tags.length ? { tags: s.tags } : {}), ...(s.reviewText.trim() ? { comment: s.reviewText.trim() } : {}) } });
  set({ reviewed: true });
}
/** The technician's reply to a customer's review (shown on the customer's review screen). */
export async function replyToReview(get: Get, set: Set, reviewId: string, reply: string) {
  extrasDue = true;
  await api('POST', `/reviews/${reviewId}/reply`, { body: { reply: reply.trim() } });
  await refresh(get, set);
}
export async function fileClaim(get: Get, set: Set, description: string) {
  extrasDue = true;
  const s = get();
  let wid = s.warrantyId;
  if (!wid) wid = (await api<any>('GET', `/warranty-records/job/${s.jobId}`))._id;
  await api('POST', `/warranty-records/${wid}/claims`, { body: { description } });
  await refresh(get, set);
}
/** The warranty record (with its claims) of an earlier completed repair. */
export const pastWarranty = (jobId: string) => api<any>('GET', `/warranty-records/job/${jobId}`);
/** File a claim on an earlier repair (not the one currently on screen). */
export async function fileClaimFor(jobId: string, description: string) {
  const w = await pastWarranty(jobId);
  await api('POST', `/warranty-records/${w._id}/claims`, { body: { description } });
  extrasDue = true;
}
export async function openDispute(get: Get, set: Set, reason: string, evidence: Media[]) {
  extrasDue = true;
  const form = new FormData();
  form.append('repairJobId', get().jobId!);
  form.append('reason', reason);
  await appendMedia(form, 'evidence', evidence.slice(0, 5));
  await api('POST', '/disputes', { form, timeoutMs: 120000 });
  await refresh(get, set);
}
export async function saveAddress(get: Get, address: string) {
  const p = await api<any>('GET', '/customer-profiles/me');
  // The home address's area as the customer's default location (no permission prompt needed).
  const at = addressPoint(address);
  await api('PATCH', `/customer-profiles/${p._id}`, { body: { address, ...(at ? { location: at } : {}) } });
}

/* ───────── technician actions ───────── */

export async function saveTechProfile(get: Get, set: Set, p: { skills?: string[]; areas?: string[]; bio?: string; years?: number }) {
  const cats = await categories(set, get);
  const id = get().techProfileId ?? (await api<any>('GET', '/technician-profiles/me'))._id;
  // Base location for distances: the phone's position (they choose to share it), else their first service area.
  const areas = p.areas ?? get().areas, base = p.areas ? await bestPoint(areas[0]) : null;
  await api('PATCH', `/technician-profiles/${id}`, { body: {
    ...(base ? { baseLocation: base } : {}),
    ...(p.skills ? { serviceCategoryIds: p.skills.map(k => cats[k]).filter(Boolean) } : {}),
    ...(p.areas ? { serviceAreas: p.areas } : {}), ...(p.bio ? { bio: p.bio } : {}), ...(p.years !== undefined ? { experienceYears: p.years } : {}),
  } });
  set({ techProfileId: id, ...(p.skills ? { skills: p.skills } : {}), ...(p.areas ? { areas: p.areas } : {}), ...(base ? { techPoint: base } : {}) });
  extrasDue = true;
}
export async function submitVerification(get: Get, set: Set, docs: Media[]) {
  const id = get().techProfileId ?? (await api<any>('GET', '/technician-profiles/me'))._id;
  const form = new FormData();
  await appendMedia(form, 'docs', docs.slice(0, 5));
  await api('POST', `/technician-profiles/${id}/verification-docs`, { form, timeoutMs: 120000 });
  set({ techVerif: 'pending', techSubmittedAt: Date.now() });
  extrasDue = true;
}

/** One quote per technician per request: the API can't edit a quote, and a withdrawn one still blocks a new one. */
export async function sendQuote(get: Get, set: Set, requestId: string, q: TechQuote) {
  if (get().quoteStatus?.[requestId]) throw new ApiError('You’ve already sent a quote on this request.', 409);
  const body: Record<string, unknown> = { repairRequestId: requestId, laborCost: q.labour, partsCost: q.parts, estimatedDays: q.days, warrantyDays: q.warr * 30, ...(q.note.trim() ? { notes: q.note.trim() } : {}) };
  // A service center quotes as its team: the customer must know which technician will do the work.
  if (get().api?.role === 'service_center') body.technicianId = q.technicianId;
  const r = await api<any>('POST', '/quotations', { body })
    .catch(e => { throw e instanceof ApiError && /duplicate/i.test(e.message) ? new ApiError('You’ve already sent a quote on this request.', 409) : e; });
  set(p => ({ otherQuotes: { ...p.otherQuotes, [requestId]: { ...q, qid: r._id, status: 'pending' } }, quoteStatus: { ...p.quoteStatus, [requestId]: 'pending' } }));
}
export async function withdrawQuote(get: Get, set: Set, requestId: string) {
  const mine = get().otherQuotes[requestId];
  if (mine?.qid) await api('PATCH', `/quotations/${mine.qid}/withdraw`);
  set(p => { const o = { ...p.otherQuotes }; delete o[requestId]; return { otherQuotes: o, quoteStatus: { ...p.quoteStatus, [requestId]: 'withdrawn' } }; });
}

/** A technician update on the live job: a stage (1–6) or "waiting for parts". */
export async function updateJob(get: Get, set: Set, u: { stage?: number; parts?: boolean; label: string; note?: string }) {
  const s = get(), id = s.jobId;
  if (!id) throw new ApiError('No active job.', 400);
  const note = `${u.stage ? `[stage:${u.stage}] ` : ''}${u.label}${u.note ? `${NOTE_SEP}${u.note}` : ''}`.slice(0, 500);
  // Home visits get their own "on the way" status on the server; shop drop-offs share "diagnosing".
  let status = u.parts ? 'awaiting_parts' : u.stage ? apiStatusFor(u.stage, s.mode === 'home') : undefined;
  // Coming back from "waiting for parts", or a stage that shares the current API status: record it as in progress.
  const cur = (await api<any>('GET', `/repair-jobs/${id}`)).status;
  if (!status || status === cur) status = cur === 'awaiting_parts' || cur === 'diagnosing' || cur === 'on_hold' ? 'in_progress' : undefined;
  if (status && status !== cur) {
    const photos = s.progressPhotos ?? [];
    if (photos.length) {
      // Progress photos ride along with the status update (multipart); the server stores them on the job.
      const form = new FormData();
      form.append('status', status);
      form.append('note', note);
      await appendMedia(form, 'media', photos.slice(0, 6));
      await api('PATCH', `/repair-jobs/${id}/status`, { form, timeoutMs: 120000 });
    } else {
      await api('PATCH', `/repair-jobs/${id}/status`, { body: { status, note } });
    }
  } else if (u.stage) {
    // Same API status (e.g. "Diagnosis completed" during in_progress): keep it on this device's log only.
    set(p => ({ techStage: Math.max(p.techStage, u.stage!), jobLog: [...p.jobLog, { label: u.label, at: nowLabel(), stage: u.stage, note: u.note }] }));
    return;
  }
  await refresh(get, set);
}

export async function resolveClaim(get: Get, set: Set, warrantyId: string, claimId: string, fixed: boolean, note?: string) {
  extrasDue = true;
  await api('PATCH', `/warranty-records/${warrantyId}/claims/${claimId}`, { body: { status: fixed ? 'resolved' : 'rejected', ...(note ? { resolutionNote: note } : {}) } });
  await refresh(get, set);
}
/** Warranty claims on this technician's finished jobs (the API has no list endpoint, so each job is checked). */
export async function techClaims(get: Get) {
  const jobs = (get().doneJobs ?? []).filter(j => j.apiJobId);
  const ws = await Promise.all(jobs.map(j => api<any>('GET', `/warranty-records/job/${j.apiJobId}`).then(w => ({ w, j })).catch(() => null)));
  return ws.filter(Boolean).flatMap(x => (x!.w.claims ?? []).map((c: any) => ({ warrantyId: x!.w._id, claim: c, job: x!.j })));
}

/* ───────── service center actions ───────── */

/** Business details (name / description / address / area) and the team's service categories. */
export async function saveCenterProfile(get: Get, set: Set, p: { name?: string; desc?: string; address?: string; skills?: string[]; areas?: string[] }) {
  const cats = await categories(set, get);
  const id = get().centerId ?? (await api<any>('GET', '/service-centers/me'))._id;
  const at = p.address ? addressPoint(p.address) : null;
  await api('PATCH', `/service-centers/${id}`, { body: {
    ...(p.name ? { businessName: p.name } : {}),
    ...(p.desc !== undefined ? { description: p.desc } : {}),
    ...(p.address ? { address: p.address, ...(at ? { location: at } : {}) } : {}),
    ...(p.skills ? { serviceCategoryIds: p.skills.map(k => cats[k]).filter(Boolean) } : {}),
    ...(p.areas ? { areas: p.areas } : {}),
  } });
  set({ centerId: id, ...(p.name ? { centerName: p.name } : {}), ...(p.desc !== undefined ? { centerDesc: p.desc } : {}), ...(p.address ? { centerAddress: p.address } : {}), ...(p.skills ? { skills: p.skills } : {}), ...(p.areas ? { areas: p.areas } : {}) });
  extrasDue = true;
}

/** Business documents (CAC registration, business ID), for RepairHub's team to verify. */
export async function submitCenterVerification(get: Get, set: Set, docs: Media[]) {
  const id = get().centerId ?? (await api<any>('GET', '/service-centers/me'))._id;
  const form = new FormData();
  await appendMedia(form, 'docs', docs.slice(0, 5));
  await api('POST', `/service-centers/${id}/verification-docs`, { form, timeoutMs: 120000 });
  set({ centerVerif: 'pending', centerSubmittedAt: Date.now() });
  extrasDue = true;
}

/** Add a technician to the team by the email on their account. */
export async function addTeamMember(get: Get, set: Set, email: string) {
  const m = await api<any>('POST', `/service-centers/${get().centerId!}/team`, { body: { email: email.trim().toLowerCase() } });
  await refresh(get, set);
  return m;
}
/** Remove a technician from the team (their rentals / jobs are unaffected). */
export async function removeTeamMember(get: Get, set: Set, profileId: string) {
  await api('DELETE', `/service-centers/${get().centerId!}/team/${profileId}`);
  await refresh(get, set);
}

export async function withdraw(get: Get, set: Set, amount: number, account: PayoutAccount) {
  await api('POST', '/wallets/withdraw', { body: { amount, bankName: account.bank, accountNumber: account.number, accountName: account.name } });
  extrasDue = true;
  await refresh(get, set);
}

export async function markRead(set: Set, ids: string[]) {
  await Promise.all(ids.map(id => api('PATCH', `/notifications/${id}/read`).catch(() => {})));
  set(p => ({ unreadCount: Math.max(0, (p.unreadCount ?? 0) - p.notifications.filter(n => n.id && ids.includes(n.id) && !n.read).length), notifications: p.notifications.map(n => (n.id && ids.includes(n.id) ? { ...n, read: true } : n)) }));
}

export async function markAllRead(set: Set) {
  await api('PATCH', '/notifications/read-all').catch(() => {});
  set(p => ({ unreadCount: 0, notifications: p.notifications.map(n => ({ ...n, read: true })) }));
}
