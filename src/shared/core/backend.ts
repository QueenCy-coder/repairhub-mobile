// RepairHub API ⇄ app state.
// The screens were designed around one live repair per person (the `State` fields: cat, model, status, …).
// `refresh` loads the signed-in person's data from the API into those fields; the actions below send what
// the person does to the API and then refresh. The server is the source of truth for everything shared.
import { api, appendMedia, ApiError, setToken, shortRef } from './api';
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

/** The API has no fields for the preferred date, time and service type, so they travel at the end of the description. */
const PREF = '\n\nPreferred: ';
export const packDesc = (s: Pick<State, 'desc' | 'prefDate' | 'prefTime' | 'mode'>) => `${s.desc.trim()}${PREF}${s.prefDate} · ${s.prefTime} · ${s.mode === 'home' ? 'Home service' : 'Workshop visit'}`;
export function unpackDesc(raw = '') {
  const text = raw.replace(/\r\n/g, '\n'); // multipart uploads turn line breaks into CRLF
  const i = text.lastIndexOf(PREF);
  if (i < 0) return { desc: text, prefDate: '', prefTime: '', mode: 'shop' as const };
  const [prefDate = '', prefTime = '', how = ''] = text.slice(i + PREF.length).split(' · ');
  return { desc: text.slice(0, i), prefDate, prefTime, mode: /home/i.test(how) ? ('home' as const) : ('shop' as const) };
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

/** Technician stage (app) ⇄ job status (API). Stages without their own API status are kept in the status note. */
const STAGE_TO_API: Record<number, string> = { 1: 'diagnosing', 2: 'in_progress', 5: 'quality_check', 6: 'completed' };
function jobToApp(job: any): { status: JobStatus; techStage: number; parts: boolean; partsUsed: boolean } {
  const hist: any[] = job.statusHistory ?? [];
  const noted = [...hist].reverse().map(h => Number(/\[stage:(\d)\]/.exec(h.note ?? '')?.[1])).find(n => n > 0) ?? 0;
  const partsUsed = hist.some(h => h.status === 'awaiting_parts');
  const st = job.status === 'disputed' ? job.statusBeforeDispute ?? 'in_progress' : job.status;
  const released = ['released', 'cash_settled'].includes(job.payment?.status);
  switch (st) {
    case 'accepted': return { status: JobStatus.Accepted, techStage: 0, parts: false, partsUsed };
    case 'diagnosing': return { status: JobStatus.OnTheWay, techStage: 1, parts: false, partsUsed };
    case 'awaiting_parts': return { status: JobStatus.InProgress, techStage: Math.max(2, noted), parts: true, partsUsed: true };
    case 'on_hold': case 'in_progress': case 'quality_check': case 'ready':
      return { status: JobStatus.InProgress, techStage: Math.max(st === 'quality_check' || st === 'ready' ? 5 : 2, Math.min(noted, 5)), parts: false, partsUsed };
    case 'completed': return { status: released ? JobStatus.Released : JobStatus.Completed, techStage: 6, parts: false, partsUsed };
    default: return { status: JobStatus.Accepted, techStage: 0, parts: false, partsUsed };
  }
}
const LOG_LABEL: Record<string, string> = { accepted: 'Booked · paid into escrow', diagnosing: 'On the way / device received', awaiting_parts: 'Paused · waiting for parts', in_progress: 'Repair in progress', quality_check: 'Testing', ready: 'Ready', on_hold: 'On hold', completed: 'Repair completed · awaiting customer', disputed: 'Problem reported', cancelled: 'Cancelled' };
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

const NOTE_TITLE: Record<string, string> = { repair_request: 'New repair request', quotation: 'Quotes', appointment: 'Booking', status_update: 'Repair update', payment: 'Payment', warranty: 'Warranty', review: 'New review', dispute: 'Problem reported', verification: 'Verification' };
const noteRoute = (role: Role, type: string) => role === 'technician'
  ? ({ repair_request: '/jobs', quotation: '/jobs', appointment: '/job', status_update: '/job', payment: '/earnings', warranty: '/tech-claim', review: '/reviews', dispute: '/job', verification: '/verification' } as Record<string, string>)[type]
  : ({ quotation: '/compare', appointment: '/appointments', status_update: '/track', payment: '/track', warranty: '/warranty', review: '/repairs', dispute: '/track' } as Record<string, string>)[type];

/* ───────── session ───────── */

const sessionFrom = (user: any, token: string): ApiSession => ({ token, userId: user._id, role: user.role, email: user.email, name: user.fullName, phone: localPhone(user.phone), createdAt: ts(user.createdAt) });

/** Fresh state for a person who just signed in: nothing from whoever used this device before. */
function signedIn(sess: ApiSession): Partial<State> {
  const base = initialState(), key = sess.phone || sess.userId;
  const common = { ...base, api: sess, email: sess.email, accounts: [], notifications: [], toast: null };
  return sess.role === 'technician'
    ? { ...common, signupRole: 'technician', techName: sess.name, techPhone: key, techIsNew: true }
    : { ...common, signupRole: 'customer', fullName: sess.name, phone: key, custIsNew: true };
}

export async function register(p: { role: Role; fullName: string; email: string; phone: string; password: string }, set: Set) {
  const d = await api<{ user: any; token: string }>('POST', '/users/register', { body: { fullName: p.fullName, email: p.email.trim().toLowerCase(), password: p.password, role: p.role, ...(p.phone ? { phone: apiPhone(p.phone) } : {}) } }).catch(e => {
    throw e instanceof ApiError && e.status === 409 ? new ApiError('An account already uses this email. Log in instead.', 409) : e;
  });
  const sess = sessionFrom(d.user, d.token);
  setToken(sess.token);
  set({ ...signedIn(sess), custOnboarded: false });
  return sess;
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
  profileFor = ''; afterFor = ''; appointments.clear(); requests.clear(); techProf = null; techReviews = []; extrasDue = true; topNote = '';
  set({ ...initialState(), api: null });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api('POST', '/users/change-password', { body: { currentPassword, newPassword } });
}

export async function updateMe(p: { fullName?: string; phone?: string }, set: Set, get: Get) {
  const u = await api<any>('PATCH', `/users/${get().api!.userId}`, { body: { ...(p.fullName ? { fullName: p.fullName } : {}), ...(p.phone ? { phone: apiPhone(p.phone) } : {}) } });
  set(s => ({ api: s.api && { ...s.api, name: u.fullName, phone: localPhone(u.phone) } }));
}

/* ───────── categories ───────── */

async function categories(set: Set, get: Get) {
  if (Object.keys(get().catIds ?? {}).length) return get().catIds;
  const list = await api<any[]>('GET', '/service-categories');
  const map = Object.fromEntries(list.map(c => [c.name, c._id]));
  set({ catIds: map });
  return map as Record<string, string>;
}
const catName = (s: State, id: any) => (typeof id === 'object' && id?.name) || Object.entries(s.catIds ?? {}).find(([, v]) => v === String(id))?.[0] || 'Smartphones';

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
  inFlight = (s.api.role === 'technician' ? refreshTech(get, set) : refreshCustomer(get, set)).then(() => { doneAt = Date.now(); }).finally(() => { inFlight = null; });
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
  const list = await api<any[]>('GET', '/notifications', { query: { limit: 40 } });
  topNote = list[0] ? String(list[0].createdAt) : '';
  set({ notifications: list.map(n => ({ id: n._id, title: NOTE_TITLE[n.type] ?? 'RepairHub', body: n.message, at: nowLabel(new Date(n.createdAt)), ts: ts(n.createdAt), route: noteRoute(role, n.type), role, to, read: n.isRead })) });
}

/** Quotes on the customer's request, in the app's Quote shape; technicians are added to `accounts` for their profiles. */
async function loadQuotes(rid: string, get: Get, set: Set) {
  const list = await api<any[]>('GET', `/quotations/repair-request/${rid}`);
  const quotes: Quote[] = list.map(q => ({
    id: q._id, name: q.technicianId?.userId?.fullName ?? 'Technician', rating: Math.round((q.technicianId?.ratingAvg ?? 0) * 10) / 10, jobs: q.technicianId?.jobsCompleted ?? 0,
    km: NaN, areas: q.technicianId?.serviceAreas ?? [], labour: q.laborCost ?? 0, parts: q.partsCost ?? 0, total: q.price, days: q.estimatedDays ?? 0,
    warr: months(q.warrantyDays), warrDays: q.warrantyDays ?? 0, note: q.notes ?? '', techId: q.technicianId?._id, accepted: q.status === 'accepted', expiresAt: ts(q.expiresAt),
  }));
  // Public profiles for the technicians who quoted (skills, bio, experience).
  const profiles = await Promise.all(quotes.map(async q => {
    if (!q.techId) return null;
    if (!techProfiles.has(q.techId)) techProfiles.set(q.techId, await api<any>('GET', `/technician-profiles/${q.techId}`).catch(() => null));
    return techProfiles.get(q.techId);
  }));
  const cur = get();
  const accounts: Account[] = quotes.map((q, i) => {
    const p = profiles[i];
    return { role: 'technician', name: q.name, phone: '', email: '', pwHash: null, provider: 'password', onboarded: true, createdAt: ts(p?.createdAt),
      verif: 'verified', skills: (p?.serviceCategoryIds ?? []).map((c: any) => catName(cur, c)), areas: p?.serviceAreas ?? q.areas ?? [],
      apiId: q.techId, bio: p?.bio, years: p?.experienceYears, rating: q.rating, reviews: p?.ratingCount ?? 0, jobs: q.jobs } as Account;
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
  // Names of the technicians on earlier jobs (public profiles, cached).
  await Promise.all(past.map(r => jobOf(r._id)?.technicianId).filter(Boolean).map(async (tid: string) => {
    if (!techProfiles.has(String(tid))) techProfiles.set(String(tid), await api<any>('GET', `/technician-profiles/${tid}`).catch(() => null));
  }));
  const doneJobs: DoneJob[] = past.map(r => {
    const j = jobOf(r._id), u = unpackDesc(r.problemDescription);
    return { tech: j ? String(j.technicianUserId) : '', techName: j ? techProfiles.get(String(j.technicianId))?.userId?.fullName ?? '' : '', custPhone: me, id: shortRef(r._id), dev: r.brandModel || r.itemType, cust: s.fullName, cat: catName(s, r.serviceCategoryId),
      service: u.desc.split(/[,.]/)[0], gross: j && ['released', 'cash_settled', 'refunded'].includes(j.payment?.status) ? j.price : 0, warr: months(j?.warrantyDays), warrDays: j?.warrantyDays, at: ts(j?.completedAt ?? r.updatedAt), rating: 0,
      status: r.status === 'cancelled' || j?.status === 'cancelled' ? 'Cancelled' : 'Completed', before: r.mediaUrls?.[0], apiJobId: j?._id } as DoneJob;
  });
  set({ doneJobs });

  if (!live) {
    // The request on screen was removed or belongs to someone else: show no live request.
    if (s.rid) set({ rid: null, jobId: null, status: JobStatus.None });
    return notifications(get, set);
  }
  const u = unpackDesc(live.problemDescription);
  const base: Partial<State> = {
    rid: live._id, cat: catName(s, live.serviceCategoryId), model: live.brandModel || live.itemType, desc: u.desc, location: live.address ?? '',
    prefDate: u.prefDate, prefTime: u.prefTime, mode: u.mode, requestAt: ts(live.createdAt), owner: { name: s.fullName, phone: me, photo: s.custPhoto },
    photos: (live.mediaUrls ?? []).map((uri: string) => ({ uri, type: /\.(mp4|mov)$/i.test(uri) ? 'video' : 'image' } as Media)), cancelled: live.status === 'cancelled',
  };
  if (live.status === 'cancelled') { set({ ...base, status: JobStatus.None, sel: null }); return notifications(get, set); }

  const quotes = await loadQuotes(live._id, get, set);
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
    ...(r ? { reviewed: true, rating: r.rating, tags: r.tags ?? [], reviewText: r.comment ?? '' } : {}),
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
  const board: Job[] = open.map(r => {
    const u = unpackDesc(r.problemDescription);
    return { id: r._id, cust: 'Customer', dev: r.brandModel || r.itemType, issue: u.desc, cat: catName(s, r.serviceCategoryId), area: areaOf(r.address ?? ''), km: NaN, ago: agoLabel(ts(r.createdAt)),
      photos: r.mediaUrls?.length ?? 0, when: u.prefDate ? `${u.prefDate}${u.prefTime ? `, ${u.prefTime}` : ''}` : 'Flexible', mode: u.mode === 'home' ? 'Home service' : 'Visit shop', media: r.mediaUrls ?? [], address: r.address ?? '' } as Job;
  });
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
      cust: 'Customer', cat: rq ? catName(s, rq.serviceCategoryId) : j.repairRequestId?.itemType ?? 'Smartphones', before: rq?.mediaUrls?.[0], service: unpackDesc(j.repairRequestId?.problemDescription).desc.split(/[,.]/)[0], gross: j.price, warr: months(j.warrantyDays), at: ts(j.completedAt),
      rating: r?.rating ?? 0, reviewText: r?.comment, tags: r?.tags, status: 'Completed', apiJobId: j._id } as DoneJob;
  });
  set({
    board, otherQuotes, doneJobs,
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
  const u = unpackDesc(req.problemDescription);
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
  form.append('serviceCategoryId', cats[s.cat]);
  form.append('itemType', s.cat);
  form.append('brandModel', s.model.trim());
  form.append('problemDescription', packDesc(s));
  form.append('urgency', 'normal');
  form.append('address', s.location.trim());
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
export async function fileClaim(get: Get, set: Set, description: string) {
  extrasDue = true;
  const s = get();
  let wid = s.warrantyId;
  if (!wid) wid = (await api<any>('GET', `/warranty-records/job/${s.jobId}`))._id;
  await api('POST', `/warranty-records/${wid}/claims`, { body: { description } });
  await refresh(get, set);
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
  await api('PATCH', `/customer-profiles/${p._id}`, { body: { address } });
}

/* ───────── technician actions ───────── */

export async function saveTechProfile(get: Get, set: Set, p: { skills?: string[]; areas?: string[]; bio?: string; years?: number }) {
  const cats = await categories(set, get);
  const id = get().techProfileId ?? (await api<any>('GET', '/technician-profiles/me'))._id;
  await api('PATCH', `/technician-profiles/${id}`, { body: {
    ...(p.skills ? { serviceCategoryIds: p.skills.map(k => cats[k]).filter(Boolean) } : {}),
    ...(p.areas ? { serviceAreas: p.areas } : {}), ...(p.bio ? { bio: p.bio } : {}), ...(p.years !== undefined ? { experienceYears: p.years } : {}),
  } });
  set({ techProfileId: id, ...(p.skills ? { skills: p.skills } : {}), ...(p.areas ? { areas: p.areas } : {}) });
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

export async function sendQuote(get: Get, set: Set, requestId: string, q: TechQuote) {
  const mine = get().otherQuotes[requestId];
  // A quote can't be edited: withdraw the old one and send the new one.
  if (mine?.qid) await api('PATCH', `/quotations/${mine.qid}/withdraw`).catch(() => {});
  const r = await api<any>('POST', '/quotations', { body: { repairRequestId: requestId, laborCost: q.labour, partsCost: q.parts, estimatedDays: q.days, warrantyDays: q.warr * 30, ...(q.note.trim() ? { notes: q.note.trim() } : {}) } });
  set(p => ({ otherQuotes: { ...p.otherQuotes, [requestId]: { ...q, qid: r._id, status: 'pending' } } }));
}
export async function withdrawQuote(get: Get, set: Set, requestId: string) {
  const mine = get().otherQuotes[requestId];
  if (mine?.qid) await api('PATCH', `/quotations/${mine.qid}/withdraw`);
  set(p => { const o = { ...p.otherQuotes }; delete o[requestId]; return { otherQuotes: o }; });
}

/** A technician update on the live job: a stage (1–6) or "waiting for parts". */
export async function updateJob(get: Get, set: Set, u: { stage?: number; parts?: boolean; label: string; note?: string }) {
  const s = get(), id = s.jobId;
  if (!id) throw new ApiError('No active job.', 400);
  const note = `${u.stage ? `[stage:${u.stage}] ` : ''}${u.label}${u.note ? `${NOTE_SEP}${u.note}` : ''}`.slice(0, 500);
  let status = u.parts ? 'awaiting_parts' : u.stage ? STAGE_TO_API[u.stage] : undefined;
  // Coming back from "waiting for parts", or a stage that shares the current API status: record it as in progress.
  const cur = (await api<any>('GET', `/repair-jobs/${id}`)).status;
  if (!status || status === cur) status = cur === 'awaiting_parts' || cur === 'diagnosing' || cur === 'on_hold' ? 'in_progress' : undefined;
  if (status && status !== cur) await api('PATCH', `/repair-jobs/${id}/status`, { body: { status, note } });
  else if (u.stage) {
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

export async function withdraw(get: Get, set: Set, amount: number, account: PayoutAccount) {
  await api('POST', '/wallets/withdraw', { body: { amount, bankName: account.bank, accountNumber: account.number, accountName: account.name } });
  extrasDue = true;
  await refresh(get, set);
}

export async function markRead(set: Set, ids: string[]) {
  await Promise.all(ids.map(id => api('PATCH', `/notifications/${id}/read`).catch(() => {})));
  set(p => ({ notifications: p.notifications.map(n => (n.id && ids.includes(n.id) ? { ...n, read: true } : n)) }));
}

export async function markAllRead(set: Set) {
  await api('PATCH', '/notifications/read-all').catch(() => {});
  set(p => ({ notifications: p.notifications.map(n => ({ ...n, read: true })) }));
}
