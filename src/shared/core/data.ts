import type { ApiSession } from './backend';
// Mock data + domain helpers. Mirrors the review doc §7 (status model) and §8 (sample data),
// with the cast and values from the Group 9 Figma file. Swap for /api/v1/... calls once endpoints exist.

export const COMMISSION = 10; // % deducted from the technician payout (FR-14) — the API's COMMISSION_RATE
export const HOME_SERVICE_FEE = 0; // the API charges the quoted price only; technicians include travel in their quote
export const MIN_PAYOUT = 1000; // FR-15 — the API's MIN_WITHDRAWAL
export const ESCROW_RELEASE_MS = 72 * 3600e3; // US-005 — the API's AUTO_RELEASE_HOURS
export const REQUEST_TTL_MS = 24 * 3600e3; // FR-7

export type Role = 'customer' | 'technician';
export type Sort = 'price' | 'rated' | 'fast' | 'near';
export type ClaimStatus = 'Submitted' | 'Accepted' | 'Disputed' | 'Resolved';
export type Verif = 'new' | 'pending' | 'rejected' | 'verified';

/** Job status (review §7). -1 = no request yet. */
export enum JobStatus {
  None = -1, Requested = 0, Quoted = 1, Booked = 2, Accepted = 3,
  OnTheWay = 4, InProgress = 5, Completed = 6, Released = 7,
}

export type PayoutAccount = { bank: string; number: string; name: string };
export type Withdrawal = { ref: string; amount: number; fee: number; speed: 'weekly' | 'instant'; status: 'Processing' | 'Scheduled' | 'Paid'; at: string; eta: string; account: PayoutAccount; date?: string; sessionId?: string; paidAt?: string };
/** Nigerian banks & fintechs supported for payouts (NIP). */
export const BANKS = ['Access Bank', 'First Bank', 'GTBank', 'UBA', 'Zenith Bank', 'Fidelity Bank', 'FCMB', 'Stanbic IBTC', 'Sterling Bank', 'Union Bank', 'Wema Bank', 'Kuda', 'Opay', 'Moniepoint', 'PalmPay'];
export const INSTANT_FEE = 100;
/** NIP-style 30-digit session ID: sender bank code (6) + yymmddHHmmss (12) + 12 digits derived from the reference. */
export function sessionId(ref: string, yymmdd = '260930', hhmmss = '101500') {
  let h = 0; for (const c of ref) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tail = String(h).padStart(10, '0') + String((h % 97) + 10);
  return `000013${yymmdd}${hhmmss}${tail}`.slice(0, 30);
}
export const TODAY = 'Wed 30 Sep 2026';
export const maskAcct = (n: string) => `••${n.slice(-4)}`;
export type TechQuote = { labour: number; parts: number; days: number; warr: number; note: string; qid?: string; status?: string };
/** `sample` = which RepairHub sample device the photo shows ('phone', 'ipad', …), so its before/after partner can be found. */
export type Media = { uri: string; type: 'image' | 'video'; name?: string | null; size?: number | null; sample?: SampleKind | null };
export type SampleKind = 'phone' | 'ipad' | 'laptop' | 'desktop' | 'printer';
const SAMPLE_CAT: Record<SampleKind, string> = { phone: 'Smartphones', ipad: 'Tablets', laptop: 'Laptops', desktop: 'Desktops', printer: 'Printers' };
/** Recognises the sample photos added to the photo library (file names like "phone_broken.jpg"). */
export const sampleFromName = (name?: string | null): SampleKind | null => {
  const m = /(phone|ipad|laptop|desktop|printer)[_ -](broken|fixed)/i.exec(name ?? '');
  return m ? (m[1].toLowerCase() as SampleKind) : null;
};
/** The device a set of customer photos shows: the recognised sample, else the request's category. */
export const photoCat = (photos: Media[], cat: string) => { const k = photos.find(p => p.sample)?.sample; return k ? SAMPLE_CAT[k] : cat; };
/** A technician status update captured while offline, replayed in order when connectivity returns. */
export type QueuedUpdate = { id: string; kind: 'status' | 'parts'; status?: JobStatus; stage?: number; note: string; photos: number; at: string };

export type Quote = {
  id: string; name: string; rating: number; jobs: number; km: number;
  labour: number; parts: number; days: number; warr: number; note: string; total: number;
  /** From the API: areas served, warranty in days, the technician's profile id, whether this quote was accepted. */
  areas?: string[]; warrDays?: number; techId?: string; accepted?: boolean; expiresAt?: number;
};

export type State = {
  signupRole: Role; phone: string; fullName: string; email: string;
  /** Customer account set-up: new sign-ups must finish their profile before using the app. */
  custIsNew: boolean; custOnboarded: boolean; custPhoto: string | null; custAddress: string;
  /** Optional basic ID check for customers (NIN). Required only for disputes. */
  custKyc: 'none' | 'verified'; custNin4: string;
  /** Last OTP sent to this device (local only). */
  otp: string;
  /** When the technician submitted their application (shown on Verification status). */
  techSubmittedAt: number; techPhoto: string | null;
  // repair request (C-04 → C-06)
  cat: string; model: string; modelOther: boolean; desc: string; location: string; prefDate: string; prefTime: string;
  /** Phone of the customer who started the unsubmitted request draft (drafts are never shared between customers). */
  draftOwner?: string;
  // job
  status: JobStatus; parts: boolean; partsUsed: boolean; requestAt: number; completedAt: number;
  quoted: boolean; quotesIn: number; sort: Sort; sel: string | null;
  mode: 'home' | 'shop'; date: string; time: string; pay: 'card' | 'transfer' | 'ussd' | 'wallet' | 'cash'; payErr: boolean;
  checks: boolean[]; rating: number; tags: string[]; reviewText: string; reviewed: boolean;
  reply: string; replied: boolean; flagged: boolean;
  claim: null | { status: ClaimStatus; issue: string; date: string; at?: number; visit?: string; techNote?: string; disputeReason?: string; outcome?: string; resolvedAt?: string; same?: boolean; resolution?: string; files?: string[]; apiId?: string };
  claimIssue: string; claimDesc: string; claimDate: string;
  dispute: null | { id: string; status: 'Open' | 'Under review' | 'Resolved'; outcome?: string };
  dReason: string; dDesc: string; dWant: string;
  profile: string;
  // technician
  /** A technician who just signed up has no history (jobs, earnings, reviews). The demo account (Emeka) does. */
  techIsNew: boolean; authMode: 'signup' | 'login' | 'reset';
  /** Registered accounts (demo backend: shared through the sync server). */
  accounts: Account[];
  /** Sign-up waiting for its phone code (this device only). */
  pending: Pending | null;
  techName: string; techPhone?: string; skills: string[]; extraServices: string[]; areas: string[]; techVerif: Verif; rejectNote: string;
  viewJob: string; qLabour: number; qParts: number; qDays: number; qWarr: number; qNote: string;
  /** Who sent the live quote (snapshot), so it stays theirs even if another technician signs in on a shared demo. */
  qBy?: { name: string; phone: string; rating: number; jobs: number } | null;
  /** Every finished job, kept after the next request starts (earnings, job count and rating come from it). */
  doneJobs?: DoneJob[];
  /** The customer who made the live request (customers' own identity stays on their device). */
  owner?: { name: string; phone: string; photo: string | null } | null;
  /** Amount refunded when a paid booking was cancelled (0 when nothing had been paid). */
  refund?: number;
  /** Quotes this technician has sent on other requests, keyed by job id (RH-0841 lives in q* above because the customer side reads it). */
  otherQuotes: Record<string, TechQuote>;
  techNote: string; payout: 'weekly' | 'instant'; paidOut: number; txns: [string, string, string][];
  // media (real picker URIs)
  photos: Media[]; progressPhotos: Media[]; claimMedia: Media[]; disputeMedia: Media[];
  // appointments + customer wallet
  rescheduled: number; cancelled: boolean; custWallet: number; custTxns: [string, string, string][];
  // technician offline mode
  simOffline: boolean; queue: QueuedUpdate[]; lastSync: string | null;
  // payouts: KYC, bank account, PIN and withdrawal history
  kyc: 'none' | 'verified'; bvnLast4: string; pin: string;
  payoutAccount: null | PayoutAccount;
  withdrawals: Withdrawal[];
  /** Timestamped activity on RH-0841 (Updates log on the job screen). */
  jobLog: { label: string; at: string; note?: string; stage?: number }[];
  /** Technician sub-stage (Figma “Update Repair Status”): 0 accepted … 6 completed. */
  techStage: number;
  notifications: { title: string; body: string; at: string; route?: string; role: Role; to?: string; id?: string; read?: boolean; ts?: number }[];
  toast: string | null;
  /* ── RepairHub API ── */
  /** Signed-in account (JWT); null when signed out. */
  api: ApiSession | null;
  /** Category name → id on the server. */
  catIds: Record<string, string>;
  /** Server ids of the live repair: request, job, appointment, warranty; Paystack reference of the pending payment. */
  rid: string | null; jobId: string | null; apptId: string | null; warrantyId: string | null; payRef: string | null;
  /** Job payment status on the server (unpaid, held, released, refunded, cash, cash_settled). */
  payState?: string;
  warrantyUntil?: number;
  /** Customer: quotes on the live request. */
  apiQuotes: Quote[];
  /** Technician: open requests in their categories, profile id, rating, wallet and transactions. */
  board: Job[];
  techProfileId?: string;
  techRating?: { avg: number; count: number; jobs: number };
  wallet?: { balance: number; withdrawable: number };
  apiTxns?: { id: string; type: string; amount: number; status: string; at: number; ref: string; bank?: string; acct?: string; name?: string; jobId?: string }[];
};

export const initialState = (): State => ({
  signupRole: 'customer', phone: '', fullName: '', email: '',
  custIsNew: true, custOnboarded: true, custPhoto: null, custAddress: '', custKyc: 'none', custNin4: '', otp: '',
  techSubmittedAt: 0, techPhoto: null,
  cat: 'Smartphones', model: '', modelOther: false, desc: '',
  location: '', prefDate: '', prefTime: '',
  status: JobStatus.None, parts: false, partsUsed: false, requestAt: Date.now(), completedAt: 0,
  quoted: false, quotesIn: 0, sort: 'price', sel: null,
  mode: 'home', date: DATES[0], time: '11:00 AM', pay: 'card', payErr: false,
  checks: [false, false, false], rating: 0, tags: [], reviewText: '', reviewed: false,
  reply: '', replied: false, flagged: false,
  claim: null, claimIssue: '', claimDesc: '', claimDate: DATES[1],
  dispute: null, dReason: 'Repair not done properly', dDesc: '', dWant: 'Redo the repair',
  profile: '',
  techIsNew: true, authMode: 'signup',
  accounts: [], pending: null,
  techName: '', skills: [], extraServices: [], areas: [], techVerif: 'new', rejectNote: '',
  viewJob: 'RH-0841', qLabour: 6000, qParts: 12000, qDays: 2, qWarr: 3, qNote: '',
  otherQuotes: {}, techNote: '', payout: 'weekly', paidOut: 0, txns: [],
  photos: [], progressPhotos: [], claimMedia: [], disputeMedia: [],
  rescheduled: 0, cancelled: false, custWallet: 0, custTxns: [],
  simOffline: false, queue: [], lastSync: null, jobLog: [], techStage: 0, kyc: 'none', bvnLast4: '', pin: '', payoutAccount: null, withdrawals: [], notifications: [], toast: null,
  api: null, catIds: {}, rid: null, jobId: null, apptId: null, warrantyId: null, payRef: null, apiQuotes: [], board: [],
});

/** Phone helpers. Customer number = the one they signed up with; technician numbers are mock. */
/** A RepairHub account. Passwords are stored only as a salted hash (demo backend). */
export type Account = { role: Role; name: string; phone: string; email: string; pwHash: string | null; provider: 'password' | 'google' | 'apple'; onboarded: boolean; createdAt: number;
  /** Technicians: their own verification status and service profile (so switching accounts never mixes them up). */
  verif?: Verif; skills?: string[]; areas?: string[]; submittedAt?: number;
  /** Customers: their own home address and photo (so one customer never sees another's). */
  address?: string; photo?: string | null;
  /** Technicians loaded from the API: profile id, bio, experience and track record. */
  apiId?: string; bio?: string; years?: number; rating?: number; reviews?: number; jobs?: number };
/** Updates the signed-in technician's account record alongside the live state. */
export const patchTechAccount = (p: State, patch: Partial<Account>): Account[] =>
  p.accounts.map(a => a.role === 'technician' && a.phone === p.techPhone ? { ...a, ...patch } : a);
export type Pending = Omit<Account, 'onboarded' | 'createdAt'>;

/** Small non-cryptographic hash (FNV-1a, salted with the phone) so plain-text passwords never sit in state. Demo only. */
export function hashPassword(phone: string, pw: string) {
  let h = 0x811c9dc5;
  for (const ch of `repairhub|${phone.replace(/\D/g, '')}|${pw}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** At least 8 characters with a letter and a number. */
export const passwordError = (pw: string) => !pw ? 'Create a password' : pw.length < 8 ? 'Use at least 8 characters' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Use letters and at least one number' : null;

/** Seeded demo accounts (password in DEMO_PASSWORD, filled by the demo buttons on the log-in page). */
export const DEMO_PASSWORD = 'Repair2026!';
export const DEMO_ACCOUNTS: Account[] = [
  { role: 'customer', name: 'Chidinma Okonkwo', phone: '803 412 7765', email: '', pwHash: hashPassword('803 412 7765', DEMO_PASSWORD), provider: 'password', onboarded: true, createdAt: Date.UTC(2026, 5, 1) },
  { role: 'technician', name: 'Emeka Nwosu', phone: '806 221 4490', email: '', pwHash: hashPassword('806 221 4490', DEMO_PASSWORD), provider: 'password', onboarded: true, createdAt: Date.UTC(2025, 2, 1) },
];

export const TECH_PHONE: Record<string, string> = { 'Emeka Nwosu': '806 221 4490', 'Ibrahim Dauda': '803 557 1208', 'David Mark': '810 644 3321', 'John Paul': '802 918 7765' };
/** Phone for a technician by name; the signed-in technician uses the number they registered with. */
export const techPhoneOf = (s: { techName: string; techPhone?: string; qBy?: { name: string; phone: string } | null; accounts?: { role: Role; name: string; phone: string }[] }, name: string) => {
  if (s.qBy?.phone && (name === s.qBy.name || name === displayName(s.qBy.name))) return s.qBy.phone;
  const acct = s.accounts?.find(a => a.role === 'technician' && (a.name === name || displayName(a.name) === name));
  if (acct) return acct.phone;
  return name === s.techName || name === displayName(s.techName) ? (s.techPhone || TECH_PHONE[s.techName] || TECH_PHONE['Emeka Nwosu']) : (TECH_PHONE[name] ?? TECH_PHONE['Emeka Nwosu']);
};
export const intl = (local: string) => `+234 ${local.replace(/^0/, '').trim()}`;
/** Masked until the booking is accepted, e.g. “+234 803 *** 7765”. */
export const masked = (local: string) => { const d = local.replace(/\D/g, '').replace(/^0/, ''); return `+234 ${d.slice(0, 3)} *** ${d.slice(-4)}`; };
/** Customer name as technicians see it: “Chidinma O.” (first name + last initial). */
export const custShort = (s: { fullName: string; owner?: { name: string } | null }) => { const [f, ...r] = (s.owner?.name ?? s.fullName).trim().split(/\s+/); return r.length ? `${f} ${r[r.length - 1][0].toUpperCase()}.` : f || 'Customer'; };
export const custFirst = (s: { fullName: string; owner?: { name: string } | null }) => (s.owner?.name ?? s.fullName).trim().split(/\s+/)[0] || 'The customer';
/** RepairHub's decision on a disputed warranty claim: uphold (free re-repair is scheduled) or reject (not covered). */
export const claimDecision = (p: State, uphold: boolean): Partial<State> => ({
  claim: p.claim && (uphold
    ? { ...p.claim, status: 'Accepted', visit: p.claim.visit ?? p.claim.date, outcome: 'RepairHub reviewed both sides and upheld the claim: the technician will redo the repair at no cost.' }
    : { ...p.claim, status: 'Resolved', resolvedAt: nowLabel(), outcome: 'RepairHub reviewed both sides: this fault isn’t covered by the warranty.' }),
});
/** The live request belongs to the customer signed in on this device. */
export const isMyRequest = (s: { owner?: { phone: string } | null; draftOwner?: string; phone: string }) =>
  s.owner ? s.owner.phone === s.phone : !s.draftOwner || s.draftOwner === s.phone;
/** Notifications meant for this device's signed-in customer / technician. */
export const notesFor = (s: { notifications: State['notifications']; phone: string; techPhone?: string }, role: Role) =>
  s.notifications.filter(n => {
    if (n.role !== role) return false;
    const me = role === 'customer' ? s.phone : s.techPhone;
    // Addressed notes go to that person only; unaddressed ones are the built-in samples for the demo accounts.
    return !!n.to && n.to === me;
  });
export const N = (n: number) => '₦' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const first = (name: string) => name.split(' ')[0];
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const fmtCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
};
export const nowLabel = (d = new Date()) => { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export const LEKKI = { lat: 6.4452, lng: 3.4704, label: '14 Admiralty Way, Lekki Phase 1' };
/** The next four working days from today (Sundays skipped), e.g. "Sat 3 Oct". */
export const DATES = (() => {
  const out: string[] = [], d = new Date();
  while (out.length < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) out.push(`${'Sun Mon Tue Wed Thu Fri Sat'.split(' ')[d.getDay()]} ${d.getDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getMonth()]}`);
  }
  return out;
})();
export const TIMES = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
export const TIME_WINDOWS = ['8:00 – 10:00 AM', '10:00 AM – 1:00 PM', '1:00 – 4:00 PM', '4:00 – 6:00 PM'];

export const LIVE_CATEGORIES = ['Smartphones', 'Laptops', 'Tablets', 'Desktops', 'Printers'];
/** Common models per launch category (Nigerian market). “Other” lets customers type anything not listed. */
export const MODELS: Record<string, string[]> = {
  Smartphones: ['iPhone 15 Pro Max', 'iPhone 15', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone XR', 'Samsung Galaxy S23', 'Samsung Galaxy S22', 'Samsung Galaxy A54', 'Samsung Galaxy A52', 'Samsung Galaxy A14', 'Tecno Camon 20', 'Tecno Spark 10', 'Infinix Hot 30', 'Infinix Note 30', 'Redmi Note 12', 'itel A70', 'Google Pixel 7'],
  Laptops: ['MacBook Air M2', 'MacBook Air M1', 'MacBook Pro 2019', 'MacBook Pro M1', 'HP EliteBook 840', 'HP Pavilion 15', 'HP ProBook 450', 'Dell Latitude 5420', 'Dell Inspiron 15', 'Dell XPS 13', 'Lenovo ThinkPad T14', 'Lenovo IdeaPad 3', 'Lenovo ThinkPad X1 Carbon', 'Asus VivoBook 15', 'Acer Aspire 5'],
  Tablets: ['iPad 9th gen', 'iPad 10th gen', 'iPad Air (5th gen)', 'iPad Pro 11"', 'iPad mini 6', 'Samsung Galaxy Tab A8', 'Samsung Galaxy Tab S8', 'Samsung Galaxy Tab A7 Lite', 'Lenovo Tab M10', 'Tecno Pad', 'Amazon Fire HD 10'],
  Desktops: ['iMac 24" (M1)', 'iMac 27"', 'HP ProDesk 400', 'HP EliteDesk 800', 'HP All-in-One 24', 'Dell OptiPlex 7090', 'Dell Inspiron All-in-One', 'Lenovo ThinkCentre M70', 'Lenovo IdeaCentre AIO 3', 'Custom-built PC'],
  Printers: ['HP LaserJet Pro M404', 'HP LaserJet Pro MFP M428', 'HP DeskJet 2710', 'HP Smart Tank 515', 'Canon PIXMA G3411', 'Canon PIXMA MG2540S', 'Canon i-SENSYS LBP6030', 'Epson EcoTank L3250', 'Epson L3110', 'Brother HL-L2350DW', 'Brother DCP-T420W'],
};
export const isListedModel = (cat: string, model: string) => (MODELS[cat] ?? []).includes(model);

export const CAT_GLYPH: Record<string, string> = { Smartphones: '📱', Laptops: '💻', Tablets: '📲', Desktops: '🖥️', Printers: '🖨️' };
/** Figma "Popular categories" grid. Only Electronics is live at launch (GTM plan); the rest show "Soon". */
export const POPULAR: { cat: string; label: string; sub: string; glyph: string; img?: number; live: boolean; group: string }[] = [
  { cat: 'Smartphones', label: 'Phones', sub: 'Screen, battery, software', glyph: '📱', live: true , group: 'Electronics' },
  { cat: 'Laptops', label: 'Laptops', sub: 'MacBook, Dell, HP, Lenovo', glyph: '💻', live: true , group: 'Electronics' },
  { cat: 'Tablets', label: 'Tablets', sub: 'iPad, Galaxy Tab', glyph: '📲', img: require('../../../assets/cat-tablet.png'), live: true , group: 'Electronics' },
  { cat: 'Printers', label: 'Printers', sub: 'Jams, ink, Wi-Fi', glyph: '🖨️', live: true , group: 'Electronics' },
  { cat: 'TVs', label: 'TVs', sub: 'Screen, audio, power', glyph: '📺', img: require('../../../assets/cat-tv.png'), live: false , group: 'Appliances' },
  { cat: 'Refrigerators', label: 'Fridges', sub: 'Cooling, leakage', glyph: '🧊', img: require('../../../assets/cat-fridge.png'), live: false , group: 'Appliances' },
];
export const HOME_GROUPS = ['All', 'Electronics', 'Appliances', 'Furniture', 'Automotive'];
export const POPULAR_SERVICES = [
  { label: 'Phone screen repair', cat: 'Smartphones', model: 'iPhone 12', desc: 'Cracked screen, touch still works in some areas.', glyph: '📱' },
  { label: 'Laptop repair', cat: 'Laptops', model: 'MacBook Pro 2019', desc: 'Cracked screen, laptop still turns on. Lines across the display.', glyph: '💻' },
  { label: 'Battery replacement', cat: 'Smartphones', model: 'Samsung Galaxy A52', desc: 'Battery drains in a few hours and the phone gets warm.', glyph: '🔋' },
];

export type Tech = { title: string; r: number; reviews: number; jobs: number; km: number; years: number; resp: string; areas: string[]; skills: string[]; certs: string[]; about: string };
export const TECH: Record<string, Tech> = {
  'Emeka Nwosu': { title: 'Electronics & Appliance Technician', r: 4.8, reviews: 65, jobs: 56, km: 4.1, years: 8, resp: '~15 min', areas: ['Lekki', 'Victoria Island', 'Yaba'], skills: ['Smartphones', 'Laptops', 'Tablets'], certs: ['Lagos Tech Repair Academy · Diploma', 'Apple device repair (short course)'], about: '8 years repairing phones, laptops and TVs. Known for careful work and clear explanations.' },
  'Ibrahim Dauda': { title: 'Electronics Technician', r: 3.8, reviews: 40, jobs: 122, km: 5.0, years: 5, resp: '~40 min', areas: ['Lekki', 'Ajah'], skills: ['Laptops', 'Desktops'], certs: ['Yaba College of Technology · ND Electronics'], about: 'Laptop and desktop specialist.' },
  'David Mark': { title: 'Electronics Technician', r: 3.2, reviews: 28, jobs: 98, km: 5.2, years: 3, resp: '~1 h', areas: ['Ikoyi', 'Lekki'], skills: ['Laptops', 'Smartphones'], certs: ['Technical training certificate'], about: 'Mobile technician serving Ikoyi and Lekki.' },
  'John Paul': { title: 'Electronics Technician', r: 4.5, reviews: 51, jobs: 105, km: 3.5, years: 6, resp: '~20 min', areas: ['Lekki', 'Victoria Island'], skills: ['Laptops', 'Printers'], certs: ['HP authorised service partner training'], about: 'Laptop and printer specialist with same-day service.' },
};

/** Quotes on the live request, from technicians (via the API). */
const PART_WORD: Record<string, string> = { 'screen repair': 'screen', 'battery replacement': 'battery', 'charging port repair': 'charging port', 'paper jam fix': 'roller kit', 'keyboard repair': 'keyboard', 'water damage repair': 'parts after cleaning', repair: 'parts' };
export function quotes(s: State): Quote[] {
  // Real quotes from technicians on the live request (loaded from the API).
  return s.apiQuotes ?? [];
}
const NO_QUOTE: Quote = { id: '', name: 'Technician', rating: 0, jobs: 0, km: NaN, labour: 0, parts: 0, days: 0, warr: 0, note: '', total: 0 };
/** The chosen quote. On a technician's device the live job's own quote (their price), else the customer's choice. */
export const selectedQuote = (s: State): Quote => {
  if (s.api?.role === 'technician' && s.jobId) return { ...NO_QUOTE, id: 'emeka', name: displayName(s.techName), rating: s.techRating?.avg ?? 0, jobs: s.techRating?.jobs ?? 0, labour: s.qLabour, parts: s.qParts, days: s.qDays, warr: s.qWarr, note: s.qNote, total: s.qLabour + s.qParts };
  return quotes(s).find(q => q.id === s.sel) || quotes(s)[0] || NO_QUOTE;
};
export const escrowTotal = (s: State) => selectedQuote(s).total + (s.mode === 'home' ? HOME_SERVICE_FEE : 0);
export const net = (gross: number) => gross * (1 - COMMISSION / 100);
/** The booked quote belongs to the technician signed in on this device. */
export const isMine = (s: State) => s.sel === 'emeka' && (!s.qBy || !s.techPhone || s.qBy.phone === s.techPhone);

/** Customer-facing tracker steps (Figma "Track repair"), mapped onto the shared status model. */
export function trackSteps(s: State): { label: string; sub: string; state: 'done' | 'now' | 'todo' }[] {
  const st = s.status, q = selectedQuote(s);
  const at = (done: boolean, now: boolean) => (done ? 'done' : now ? 'now' : 'todo') as 'done' | 'now' | 'todo';
  const partsNow = s.parts && st === JobStatus.InProgress;
  // Latest technician update (e.g. "Diagnosis completed · 23:07") so the customer sees real progress, not a generic label.
  const last = [...(s.jobLog ?? [])].reverse().find(e => e.stage);
  const progressSub = st === JobStatus.InProgress && !partsNow
    ? `${last ? `${last.label.replace(' (synced)', '')} · ${last.at}` : 'Work has started'} · ready in about ${plural(q.days, 'day')}`
    : st > JobStatus.InProgress && s.partsUsed ? 'Included a replacement part' : '';
  const steps = [
    { label: 'Booking confirmed', sub: `${first(q.name)} · ${s.date}, ${s.time}`, state: at(st >= JobStatus.Accepted, false) },
    { label: s.mode === 'home' ? 'Technician on the way' : 'Device dropped off', sub: st === JobStatus.OnTheWay ? (s.mode === 'home' ? 'Heading to you · follow them on the map' : 'Received at the workshop') : st === JobStatus.Accepted ? (s.mode === 'home' ? `Sets off for your address on ${s.date}` : `Drop the device off on ${s.date}`) : '', state: at(st > JobStatus.OnTheWay, st === JobStatus.OnTheWay) },
    { label: 'Repair in progress', sub: progressSub, state: at(st > JobStatus.InProgress || partsNow, st === JobStatus.InProgress && !partsNow) },
  ];
  // "Awaiting parts" only appears when the technician actually paused the job to order a part.
  // Show the technician's own words (which part, when it arrives) when they gave them.
  const pause = [...(s.jobLog ?? [])].reverse().find(e => /Paused/.test(e.label));
  if (partsNow) steps.push({ label: 'Awaiting parts', sub: pause?.note ? `Paused · ${pause.note} The repair resumes when it arrives.` : 'Paused · the technician is sourcing a part. The repair resumes when it arrives.', state: 'now' });
  steps.push(
    { label: 'Repair completed', sub: st === JobStatus.Completed ? (s.dispute && s.dispute.status !== 'Resolved' ? `Issue ${s.dispute.id} under review · payment frozen` : 'Please check and confirm within 72 h') : '', state: at(st > JobStatus.Completed, st === JobStatus.Completed) },
    { label: 'Payment released', sub: st >= JobStatus.Released ? `Warranty issued · ${plural(q.warr, 'month')}` : s.dispute && s.dispute.status !== 'Resolved' ? 'After RepairHub decides' : 'After you confirm', state: at(st >= JobStatus.Released, false) },
  );
  return steps;
}
/** Figma “Services & Coverage”: device repairs map to launch categories; the rest are add-on services. */
export const SERVICES: { key: string; title: string; sub: string; icon: string; cat?: string }[] = [
  { key: 'Laptops', title: 'Laptop repair', sub: 'Screen, battery, charging port, etc.', icon: '💻', cat: 'Laptops' },
  { key: 'Smartphones', title: 'Phone repair', sub: 'Screen, battery, charging port, etc.', icon: '📱', cat: 'Smartphones' },
  { key: 'Tablets', title: 'Tablet repair', sub: 'Screen, battery, charging port', icon: '📲', cat: 'Tablets' },
  { key: 'Desktops', title: 'Desktop repair', sub: 'Power, display, upgrades', icon: '🖥️', cat: 'Desktops' },
  { key: 'Printers', title: 'Printer repair', sub: 'Paper jams, ink, connectivity', icon: '🖨️', cat: 'Printers' },
  { key: 'Software installation', title: 'Software installation', sub: 'OS installation, drivers, etc.', icon: '⚙️' },
  { key: 'Data recovery', title: 'Data recovery', sub: 'Recover lost or deleted data', icon: '💾' },
  { key: 'Device cleaning', title: 'Device cleaning', sub: 'Internal cleaning and maintenance', icon: '🧹' },
];
/** Neighbourhood from a typed address, e.g. "12 Herbert Macaulay Way, Yaba, Lagos" → "Yaba". */
export const areaOf = (address: string) => LAGOS_AREAS.find(a => address.toLowerCase().includes(a.toLowerCase())) ?? (address.split(',').map(x => x.trim()).filter(Boolean).slice(-2, -1)[0] || 'Lagos');
export const LAGOS_AREAS = ['Ikeja', 'Yaba', 'Surulere', 'Lekki', 'Victoria Island', 'Ikoyi', 'Ajah', 'Maryland', 'Gbagada', 'Festac', 'Badagry', 'Ikorodu', 'Apapa', 'Magodo', 'Ogba', 'Ojota', 'Oshodi'];

/** Technician progress stages (Figma “Update Repair Status”), plus “On the way” for home service. */
export function techStages(home: boolean) {
  return [
    { stage: 1, title: home ? 'On the way' : 'Device received', hint: home ? 'Heading to the customer' : 'Customer dropped the device off' },
    { stage: 2, title: 'Job started', hint: home ? 'Arrived and started work' : 'Work has started' },
    { stage: 3, title: 'Diagnosis completed', hint: 'Fault confirmed' },
    { stage: 4, title: 'Repair in progress', hint: 'Fixing or replacing parts' },
    { stage: 5, title: 'Testing', hint: 'Checking everything works' },
    { stage: 6, title: 'Completed', hint: 'Repair successfully completed' },
  ];
}
/** Which shared job status a technician stage corresponds to (drives the customer tracker). */
export const stageStatus = (stage: number) => (stage <= 0 ? JobStatus.Accepted : stage === 1 ? JobStatus.OnTheWay : stage >= 6 ? JobStatus.Completed : JobStatus.InProgress);
export const statusStage = (status: number, cur: number) => (status === JobStatus.OnTheWay ? 1 : status === JobStatus.InProgress ? Math.max(cur, 2) : status >= JobStatus.Completed ? 6 : cur);

/** Log label for a technician update. */
export function updateLabel(kind: 'status' | 'parts', status: number | undefined, prev: { status: number; parts: boolean }, home: boolean, stage?: number): string {
  if (kind === 'parts') return 'Paused · waiting for parts';
  if (stage && prev.parts && stage < 6) return 'Parts arrived · repair resumed';
  if (stage) return techStages(home).find(x => x.stage === stage)?.title ?? 'Status updated';
  if (status === JobStatus.OnTheWay) return home ? 'On the way to the customer' : 'Device received at workshop';
  if (status === JobStatus.InProgress) return prev.parts ? 'Parts arrived · repair resumed' : 'Repair started';
  if (status === JobStatus.Completed) return 'Repair completed · awaiting customer';
  return 'Status updated';
}
/** Short status label used in cards, notifications and the technician side. */
export function statusLabel(s: State): string {
  if (s.parts && s.status === JobStatus.InProgress) return 'Awaiting parts';
  return ({ [-1]: 'No request', 0: 'Waiting for quotes', 1: 'Quotes received', 2: 'Booked · awaiting technician', 3: 'Booked', 4: s.mode === 'home' ? 'Technician on the way' : 'Device dropped off', 5: 'Repair in progress', 6: 'Repair completed', 7: 'Completed · paid' } as Record<number, string>)[s.status];
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d: Date, dow = false) => `${dow ? DOW[d.getDay()] + ' ' : ''}${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
/** Warranty starts on the day the repair was completed. */
/** Thousands separators for money inputs: "18700" → "18,700". */
export const grouped = (digits: string) => digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Next weekly payout day (Friday), e.g. "Friday 2 Oct". */
export const nextPayoutDay = (from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + (((5 - d.getDay()) + 7) % 7 || 7)); return `Friday ${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtTime = (t: number) => { const d = new Date(t), h = d.getHours(); return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
/** Today as "Thu 1 Oct" (matches booking dates). */
export const todayLabel = (d = new Date()) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
export const shortDate = (t: number) => fmtDate(new Date(t));
export const repairDate = (s: State) => fmtDate(new Date(s.completedAt || Date.now()), true);
export const warrantyEnd = (s: State) => {
  if (s.warrantyUntil) return new Date(s.warrantyUntil); // issued by the server
  const d = new Date(s.completedAt || Date.now()), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + selectedQuote(s).warr);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); // 31 Jan + 1 month → 28/29 Feb
  return d;
};
export const validUntil = (s: State) => fmtDate(warrantyEnd(s));

export type Job = { id: string; cust: string; dev: string; issue: string; cat: string; area: string; km: number; ago: string; photos: number; when: string; mode: string; media?: string[]; address?: string };
/** "screen repair", "battery replacement" … from the customer's description. */
export function serviceOf(issue: string, cat: string) {
  const t = issue.toLowerCase();
  if (/screen|display|crack|glass|lines/.test(t)) return cat === 'Printers' ? 'repair' : 'screen repair';
  if (/batter|drain/.test(t)) return 'battery replacement';
  if (/charg|port/.test(t)) return 'charging port repair';
  if (/jam|paper/.test(t)) return 'paper jam fix';
  if (/keyboard|key/.test(t)) return 'keyboard repair';
  if (/water|liquid/.test(t)) return 'water damage repair';
  return 'repair';
}
/** "MacBook Air M1 screen repair" — the headline a technician sees for a job. */
export const jobTitle = (j: Pick<Job, 'dev' | 'issue' | 'cat'>) => `${j.dev || 'Device'} ${serviceOf(j.issue, j.cat)}`;
/** What this kind of repair usually costs in Lagos (guide shown to technicians before they quote). */
export function typicalPrice(cat: string, issue: string) {
  const sv = serviceOf(issue, cat);
  const base: Record<string, number> = { Smartphones: 15000, Tablets: 20000, Laptops: 25000, Desktops: 22000, Printers: 12000 };
  const k: Record<string, number> = { 'screen repair': 1.3, 'battery replacement': 0.8, 'charging port repair': 0.6, 'paper jam fix': 0.7, 'keyboard repair': 1, 'water damage repair': 1.2, repair: 1 };
  return Math.round(((base[cat] ?? 15000) * (k[sv] ?? 1)) / 500) * 500;
}
/** “Just now”, “5 min ago”, “2 h ago” from a timestamp. */
export const agoLabel = (t: number, now = Date.now()) => { const m = Math.max(0, Math.floor((now - t) / 60000)); return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };
export const jobs = (s: State): Job[] => [
  { id: 'RH-0841', cust: custShort(s), dev: s.model, issue: s.desc, cat: s.cat, area: areaOf(s.location), km: NaN, ago: s.requestAt ? agoLabel(s.requestAt) : '', photos: s.photos.filter(p => p.type === 'image').length, when: s.prefDate ? `${s.prefDate}${s.prefTime ? `, ${s.prefTime}` : ''}` : s.date, mode: s.mode === 'home' ? 'Home service' : 'Visit shop', media: s.photos.map(p => p.uri), address: s.location },
  ...(s.board ?? []),
];
/** Open requests this technician can quote on — only categories in their skills. `hidden` counts the rest. */
export function availableJobs(s: State) {
  // The live request is only open while the customer is collecting quotes (not before posting, not after booking or cancelling).
  const open = s.status === JobStatus.Requested || s.status === JobStatus.Quoted ? jobs(s) : jobs(s).slice(1);
  const list = s.skills.length ? open.filter(j => s.skills.includes(j.cat)) : open;
  return { list, hidden: open.length - list.length };
}
/** "Tunde Adewale Balogun" → "Tunde Balogun" for headers; the full legal name stays on ID-facing screens. */
export const displayName = (full: string) => { const w = full.trim().split(/\s+/); return w.length > 2 ? `${w[0]} ${w[w.length - 1]}` : full.trim(); };
export const greeting = (d = new Date()) => { const h = d.getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
/** The quote this technician currently has on a request, or null. */
export function myQuote(s: State, id: string): TechQuote | null {
  if (id === 'RH-0841') {
    // Only the technician who sent it (the sample quote, with no sender, belongs to the demo technician).
    const mine = s.quoted && (s.qBy ? s.qBy.phone === s.techPhone : s.techPhone === DEMO_TECH_PHONE);
    return mine ? { labour: s.qLabour, parts: s.qParts, days: s.qDays, warr: s.qWarr, note: s.qNote } : null;
  }
  return s.otherQuotes?.[id] ?? null; // optional-chained: older saved sessions predate this field
}
export const jobById = (s: State, id: string) => jobs(s).find(j => j.id === id) || jobs(s)[0];
/**
 * Emeka’s completed-job history (56 jobs, newest first). Generated deterministically so the Jobs tab,
 * the Home overview and the Earnings screen all read from the same list and always agree.
 */
export type CompletedJob = { id: string; dev: string; cust: string; gross: number; date: string; month: number; cat: string };
export type DoneJob = { tech: string; id: string; dev: string; cust: string; cat: string; gross: number; at: number; rating: number;
  custPhone?: string; techName?: string; service?: string; warr?: number; status?: 'Completed' | 'Cancelled'; before?: string; after?: string; reviewText?: string; tags?: string[]; reply?: string; apiJobId?: string; warrDays?: number };
const DEMO_TECH_PHONE = '806 221 4490';
/** The live job, once paid, added to the permanent record (called when the next request starts). */
export function archiveLiveJob(p: State): DoneJob[] {
  const list = p.doneJobs ?? [];
  const done = p.status >= JobStatus.Released && !!p.sel, cancelled = p.cancelled && !!p.model;
  if (!done && !cancelled) return list;
  const at = done ? p.completedAt || Date.now() : p.requestAt || Date.now();
  const had = list.find(j => j.at === at);
  if (had) {
    // Already recorded at release; add the customer's rating once they leave it.
    return done && p.reviewed && had.rating !== p.rating ? list.map(j => (j === had ? { ...j, rating: p.rating, reviewText: p.reviewText, tags: p.tags } : j)) : list;
  }
  const q = done ? selectedQuote(p) : null;
  const tech = !done ? '' : p.sel === 'emeka' ? p.qBy?.phone || DEMO_TECH_PHONE : '';
  return [{ tech, techName: q?.name ?? '', custPhone: p.owner?.phone ?? p.phone, id: `RH-${String(at).slice(-4)}`, dev: p.model, cust: custShort(p), cat: p.cat,
    service: p.desc.split(/[,.]/)[0] || 'Repair request', gross: done ? escrowTotal(p) : p.refund ?? 0, warr: q?.warr ?? 0, at,
    rating: done && p.reviewed ? p.rating : 0, reviewText: done && p.reviewed ? p.reviewText : undefined, tags: done && p.reviewed ? p.tags : undefined, status: done ? 'Completed' : 'Cancelled',
    before: p.photos.find(m => m.type === 'image')?.uri, after: p.progressPhotos.find(m => m.type === 'image')?.uri }, ...list];
}
/** When the live request finished (paid) or was cancelled; null while it's still open. */
export const liveEndAt = (s: { status: number; completedAt?: number | null; cancelled?: boolean; requestAt?: number }) =>
  s.status >= JobStatus.Released ? s.completedAt || null : s.cancelled ? s.requestAt || null : null;
/** True once the live request is in the permanent record (so it isn't counted twice). */
export const isLiveArchived = (s: { status: number; completedAt?: number | null; cancelled?: boolean; requestAt?: number; doneJobs?: DoneJob[] }) => {
  const at = liveEndAt(s);
  return !!at && (s.doneJobs ?? []).some(j => j.at === at);
};
/** The signed-in technician's finished jobs from earlier requests, newest first. */
export const myDoneJobs = (s: { doneJobs?: DoneJob[]; techPhone?: string }) => (s.doneJobs ?? []).filter(j => j.tech && j.tech === s.techPhone && j.status !== 'Cancelled').sort((a, b) => b.at - a.at);
/** The signed-in customer's earlier requests (finished or cancelled), newest first. */
export const myPastRequests = (s: { doneJobs?: DoneJob[]; phone: string }) => (s.doneJobs ?? []).filter(j => j.custPhone === s.phone).sort((a, b) => b.at - a.at);
const asCompleted = (j: DoneJob): CompletedJob => ({ id: j.id, dev: j.dev, cust: j.cust, gross: j.gross, cat: j.cat, date: shortDate(j.at), month: new Date(j.at).getMonth() });
const HISTORY_DEVICES: [string, string, number][] = [
  ['iPhone 11 screen', 'Smartphones', 18000], ['HP laptop battery', 'Laptops', 14000], ['Galaxy Tab charging port', 'Tablets', 12000],
  ['iPhone 13 battery', 'Smartphones', 15000], ['MacBook Air keyboard', 'Laptops', 32000], ['Tecno Camon screen', 'Smartphones', 11000],
  ['Dell Inspiron hinge', 'Laptops', 16000], ['iPad 9th gen glass', 'Tablets', 22000], ['Infinix Hot charging port', 'Smartphones', 8000],
  ['Lenovo ThinkPad fan', 'Laptops', 13000], ['Samsung A52 screen', 'Smartphones', 17000], ['iPad Air battery', 'Tablets', 19000],
];
const HISTORY_CUSTOMERS = ['Tunde A.', 'Grace O.', 'Samuel D.', 'Aisha M.', 'Kelechi U.', 'Bola F.', 'Ngozi E.', 'Musa B.', 'Tolu A.', 'Ifeanyi O.', 'Zainab Y.', 'Femi L.', 'Chiamaka N.'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const COMPLETED_JOBS: CompletedJob[] = Array.from({ length: 56 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 29) - Math.round(i * 3.7 + (i % 3)) * 864e5);
  const [dev, cat, gross] = HISTORY_DEVICES[i % HISTORY_DEVICES.length];
  return { id: `RH-${String(799 - i * 7).padStart(4, '0')}`, dev, cat, gross, cust: HISTORY_CUSTOMERS[(i * 5) % HISTORY_CUSTOMERS.length], date: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, month: d.getUTCMonth() };
});
const SEPT_GROSS = COMPLETED_JOBS.filter(j => j.month === 8).reduce((t, j) => t + j.gross, 0);

/** The signed-in technician's track record. New sign-ups start from zero. */
export function techStats(s: { techIsNew?: boolean; reviewed?: boolean; rating?: number; doneJobs?: DoneJob[]; techPhone?: string; status?: number; completedAt?: number | null; cancelled?: boolean; requestAt?: number; api?: ApiSession | null; techRating?: State['techRating'] }) {
  if (s.api) {
    // The server keeps the technician's rating and completed-job count.
    const mine = myDoneJobs(s);
    return { rating: s.techRating?.avg ?? 0, reviews: s.techRating?.count ?? 0, completed: Math.max(s.techRating?.jobs ?? 0, mine.length), history: mine.map(asCompleted) };
  }
  const liveRated = s.reviewed && !(s.status !== undefined && isLiveArchived(s as { status: number }));
  const mine = myDoneJobs(s), rated = mine.filter(j => j.rating > 0);
  if (s.techIsNew) {
    const stars = [...rated.map(j => j.rating), ...(liveRated && s.rating ? [s.rating] : [])];
    return { rating: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 0, reviews: stars.length, completed: mine.length, history: mine.map(asCompleted) };
  }
  return { rating: 4.8, reviews: 65 + rated.length + (liveRated ? 1 : 0), completed: COMPLETED_JOBS.length + mine.length, history: [...mine.map(asCompleted), ...COMPLETED_JOBS] };
}
/**
 * Public profile for a technician name. The signed-in technician's profile is built from their own
 * live data (skills, areas, stats), so a brand-new account never borrows the demo account's record.
 */
/** Demo distance for a registered technician (stable per phone number). */
export const techKm = (phone: string) => Math.round((2 + (Number(phone.replace(/\D/g, '').slice(-2)) % 60) / 10) * 10) / 10;
export function techProfile(s: State, name: string) {
  const self = name === displayName(s.techName) || name === s.techName;
  // Technicians from the API (quotes on the customer's request): their public profile and track record.
  const fromApi = !self && s.accounts.find(a => a.apiId && (a.name === name || displayName(a.name) === name));
  if (fromApi) return {
    title: 'Verified technician', r: fromApi.rating ?? 0, reviews: fromApi.reviews ?? 0, jobs: fromApi.jobs ?? 0, km: NaN, years: fromApi.years ?? 0, resp: '',
    areas: fromApi.areas ?? [], skills: fromApi.skills ?? [], certs: ['Government ID verified'], isNew: !fromApi.jobs, registered: true, joined: fromApi.createdAt, done: [] as DoneJob[],
    about: fromApi.bio || `Repairs ${(fromApi.skills ?? []).join(', ').toLowerCase() || 'electronics'}${fromApi.areas?.length ? ` around ${fromApi.areas.join(', ')}` : ''}.`,
  };
  if (self && s.api) {
    const st = techStats(s);
    return { title: 'Verified technician', r: Math.round(st.rating * 10) / 10, reviews: st.reviews, jobs: st.completed, km: NaN, years: 0, resp: '', areas: s.areas, skills: s.skills,
      certs: ['Government ID verified'], isNew: st.completed === 0, registered: true, joined: s.api.createdAt, done: myDoneJobs(s),
      about: `Repairs ${s.skills.join(', ').toLowerCase() || 'electronics'}${s.areas.length ? ` around ${s.areas.join(', ')}` : ''}.` };
  }
  // Registered (non-demo) technicians are looked up by their account, so every device shows the same profile.
  const acct = s.accounts.find(a => a.role === 'technician' && (a.name === name || displayName(a.name) === name) && !TECH[a.name]);
  if (!self && !acct) return { ...(TECH[name] ?? TECH['Emeka Nwosu']), isNew: false, registered: false, joined: 0, done: [] as DoneJob[] };
  const base = TECH['Emeka Nwosu'], st = techStats(s);
  if (self && !s.techIsNew) return { ...base, reviews: st.reviews, skills: s.skills.length ? s.skills : base.skills, areas: s.areas.length ? s.areas : base.areas, isNew: false, registered: false, joined: 0, done: [] as DoneJob[] };
  const skills = self ? s.skills : acct?.skills ?? [], areas = self ? s.areas : acct?.areas ?? [];
  // A registered technician's record comes from their finished jobs (the same on every device).
  const rec = self ? st : techStats({ doneJobs: s.doneJobs, techPhone: acct?.phone, techIsNew: true });
  return {
    title: 'Electronics Technician', r: Math.round(rec.rating * 10) / 10, reviews: rec.reviews, jobs: rec.completed, km: techKm(acct?.phone ?? s.techPhone ?? ''), years: 0, resp: '~15 min',
    areas, skills, certs: ['Government ID verified'], isNew: rec.completed === 0,
    registered: true, joined: acct?.createdAt ?? 0,
    done: (s.doneJobs ?? []).filter(j => j.tech === (acct?.phone ?? s.techPhone) && j.status !== 'Cancelled').sort((a, b) => b.at - a.at),
    about: `New on RepairHub. Repairs ${skills.join(', ').toLowerCase() || 'electronics'}${areas.length ? ` around ${areas.join(', ')}` : ''}.`,
  };
}
export const walletBase = (s: { techIsNew?: boolean; doneJobs?: DoneJob[]; techPhone?: string; wallet?: State['wallet'] }) => {
  if (s.wallet) {
    // Wallet balance from the API; this month's figures from the technician's finished jobs.
    const mine = myDoneJobs(s), m = new Date().getMonth(), thisMonth = mine.filter(j => new Date(j.at).getMonth() === m);
    return { available: s.wallet.withdrawable, pending: Math.max(0, s.wallet.balance - s.wallet.withdrawable), monthNet: thisMonth.reduce((t, j) => t + net(j.gross), 0), monthJobs: thisMonth.length };
  }
  const b = s.techIsNew ? { available: 0, pending: 0, monthNet: 0, monthJobs: 0 } : { available: EARN.available, pending: EARN.pending, monthNet: EARN.monthNet, monthJobs: EARN.monthJobs };
  const mine = myDoneJobs(s), m = new Date().getMonth(), thisMonth = mine.filter(j => new Date(j.at).getMonth() === m);
  return { available: b.available + mine.reduce((t, j) => t + net(j.gross), 0), pending: b.pending,
    monthNet: b.monthNet + thisMonth.reduce((t, j) => t + net(j.gross), 0), monthJobs: b.monthJobs + thisMonth.length };
};

/** Technician wallet (Figma “Earning”). All figures are the technician’s net (after 15%), derived from COMPLETED_JOBS. */
export const EARN = {
  monthNet: net(SEPT_GROSS),
  monthJobs: COMPLETED_JOBS.filter(j => j.month === 8).length,
  available: 85000, pending: 60000,
  completedJobs: COMPLETED_JOBS.length,
  weekly: [42, 55, 38, 50, 45, 62, 40, 58, 49, 60, 68, 35, 44, 52, 57],
};

/** Design photography (cropped from the Group 9 Figma exports). Replace with full-res Figma exports using the same file names. */
export const PHOTOS: Record<string, number> = {
  'Emeka Nwosu': require('../../../assets/img/emeka.jpg'), 'Ibrahim Dauda': require('../../../assets/img/ibrahim.jpg'),
  'David Mark': require('../../../assets/img/david.jpg'), 'John Paul': require('../../../assets/img/john.jpg'),
};
export const IMG = {
  mechanic: require('../../../assets/img/mechanic.png'), otp: require('../../../assets/img/otp.png'),
  roleCustomer: require('../../../assets/img/role-customer.jpg'), roleCustomerArt: require('../../../assets/img/role-customer-illus.png'), roleTechArt: require('../../../assets/img/role-tech-illus.png'), roleTech: require('../../../assets/img/role-tech.jpg'),
  before: require('../../../assets/img/before.jpg'), after: require('../../../assets/img/after.jpg'),
};
/** Matching photo pairs per category: the customer's "broken" photo and the technician's "fixed" photo of the same device. */
const REPAIR_IMG: Record<string, { broken: number; fixed: number }> = {
  Smartphones: { broken: require('../../../assets/img/repair/phone-broken.jpg'), fixed: require('../../../assets/img/repair/phone-fixed.jpg') },
  Tablets: { broken: require('../../../assets/img/repair/ipad-broken.jpg'), fixed: require('../../../assets/img/repair/ipad-fixed.jpg') },
  Laptops: { broken: require('../../../assets/img/repair/laptop-broken.jpg'), fixed: require('../../../assets/img/repair/laptop-fixed.jpg') },
  Desktops: { broken: require('../../../assets/img/repair/desktop-broken.jpg'), fixed: require('../../../assets/img/repair/desktop-fixed.jpg') },
  Printers: { broken: require('../../../assets/img/repair/printer-broken.jpg'), fixed: require('../../../assets/img/repair/printer-fixed.jpg') },
};
/** Certificate scans shown on technician profiles (keyed by the certificate line). */
export const CERT_IMG: Record<string, number> = {
  'Lagos Tech Repair Academy · Diploma': require('../../../assets/img/certs/cert-lagos-tech-diploma.jpg'),
  'Apple device repair (short course)': require('../../../assets/img/certs/cert-apple-short-course.jpg'),
  'Yaba College of Technology · ND Electronics': require('../../../assets/img/certs/cert-yabatech-nd.jpg'),
  'NABTEB electronics certificate': require('../../../assets/img/certs/cert-nabteb.jpg'),
  'Technical training certificate': require('../../../assets/img/certs/cert-technical-training.jpg'),
  'HP authorised service partner training': require('../../../assets/img/certs/cert-hp-partner.jpg'),
};
/** What a technician's recent job in each category looked like (before → after photos of the same device). */
export const RECENT_WORK: Record<string, { title: string; when: string }> = {
  Smartphones: { title: 'iPhone screen replacement', when: '2 weeks ago' },
  Laptops: { title: 'Laptop screen replacement', when: '3 weeks ago' },
  Tablets: { title: 'iPad glass replacement', when: '1 month ago' },
  Desktops: { title: 'Monitor panel repair', when: '1 month ago' },
  Printers: { title: 'Print head cleaning', when: '5 weeks ago' },
};
export const repairPhoto = (cat: string, kind: 'broken' | 'fixed') => (REPAIR_IMG[cat] ?? REPAIR_IMG.Smartphones)[kind];

/** Device photo for a category/model, if the design has one. */
export function devicePhoto(cat: string, model = ''): number | undefined {
  if (/macbook/i.test(model)) return require('../../../assets/img/dev-macbook.jpg');
  if (cat === 'Laptops') return require('../../../assets/img/dev-hplaptop.jpg');
  if (cat === 'Smartphones') return require('../../../assets/img/dev-iphone.jpg');
  if (cat === 'TVs') return require('../../../assets/img/dev-tv.jpg');
  if (cat === 'Tablets') return require('../../../assets/img/dev-tablet.jpg');
  if (cat === 'Desktops') return require('../../../assets/img/dev-desktop.jpg');
  if (cat === 'Printers') return require('../../../assets/img/dev-printer.jpg');
  if (cat === 'Refrigerators') return require('../../../assets/img/dev-fridge.jpg');
  return undefined;
}

/** Category artwork: custom drawn where no good emoji exists (tablet, TV, fridge). */
export const CAT_IMG: Record<string, number> = {
  Tablets: require('../../../assets/cat-tablet.png'), TVs: require('../../../assets/cat-tv.png'), Refrigerators: require('../../../assets/cat-fridge.png'),
};

/** Past repairs on the demo customer account (a brand-new customer has none). */
export type PastRepair = { id: string; model: string; cat: string; service: string; date: string; amount: number; tech: string; status: 'Completed' | 'Cancelled'; warrantyUntil?: string; warrantyMonths?: number; note?: string };
export const PAST_REPAIRS: PastRepair[] = [
  { id: 'RH-0712', model: 'Samsung Galaxy A52', cat: 'Smartphones', service: 'Battery replacement', date: '14 Jun 2026', amount: 14000, tech: 'John Paul', status: 'Completed', warrantyUntil: '14 Sep 2026', warrantyMonths: 3 },
  { id: 'RH-0688', model: 'HP Pavilion 15', cat: 'Laptops', service: 'Keyboard replacement', date: '2 Sep 2026', amount: 18000, tech: 'Emeka Nwosu', status: 'Completed', warrantyUntil: '2 Dec 2026', warrantyMonths: 3 },
  { id: 'RH-0655', model: 'HP LaserJet Pro M404', cat: 'Printers', service: 'Paper jam fix', date: '2 May 2026', amount: 0, tech: '—', status: 'Cancelled', note: 'No quote chosen within 24 hours' },
];
/** Whole days from now until a "14 Sep 2026"-style date (negative once passed). */
export const daysLeft = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 864e5);
