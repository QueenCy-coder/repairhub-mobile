// Helpers shared by the technician screens.
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Switch, Text, View, Image } from 'react-native';
import { Banner, Bold, C, Muted, Row, T, Screen, Card, Timeline, Demo, IconBox, FadeIn, CatTile } from '../../shared/components/ui';
import { techStats, walletBase, escrowTotal, isMine, JobStatus, net, COMMISSION, jobs, nowLabel, custFirst, DATES } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { Warranty } from '../customer/warranty';

/** Technician connectivity strip: offline queue + last sync (offline-mode deliverable). */
export function OfflineStrip({ showToggle, toggleOnly }: { showToggle?: boolean; toggleOnly?: boolean }) {
  const { s, set, online, deviceOnline } = useStore();
  const n = s.queue.length;
  return (
    <View style={{ marginBottom: 6, marginTop: toggleOnly ? 12 : 0 }}>
      {toggleOnly ? null : !online ? (
        <Banner tone="warn" icon="⚠︎"><Bold style={{ fontSize: 14 }}>Offline{deviceOnline ? ' (simulated)' : ''}</Bold><T style={{ fontSize: 13, color: C.text }}>{n ? `${n} update${n > 1 ? 's' : ''} saved on this phone. They sync automatically when you reconnect.` : 'You can keep updating job status. Updates sync when you reconnect.'}</T></Banner>
      ) : s.lastSync ? <Muted style={{ marginBottom: 6 }}>✓ All updates synced · last sync {s.lastSync}</Muted> : null}
      {false && (showToggle || toggleOnly) ? (
        <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B692F6', backgroundColor: '#F9F5FF', borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <Row><Text style={{ color: '#6941C6', fontWeight: '600', flex: 1, fontSize: 13 }}>▶ DEMO · Simulate no connectivity</Text><Switch value={s.simOffline} onValueChange={v => set({ simOffline: v })} /></Row>
        </View>
      ) : null}
    </View>
  );
}

/* Onboarding (Figma: Onboarding screen) */

/** Wallet figures, derived once so Home, Jobs and Earnings always agree. */
export function useWallet() {
  const { s } = useStore();
  // Released money is in the server wallet; the live job's escrow shows as pending until the customer confirms.
  const inEscrow = !!s.jobId && isMine(s) && s.status < JobStatus.Released && s.payState === 'held';
  const job = net(escrowTotal(s)), w = walletBase(s);
  return {
    released: false, inEscrow, job,
    available: w.available,
    pending: w.pending + (inEscrow ? job : 0),
    month: w.monthNet,
    monthJobs: w.monthJobs,
    completed: techStats(s).completed,
  };
}

/** First clause of an issue, trimmed at a word boundary: “Screen cracked after a drop” → “Screen cracked after…”. */
export const shortIssue = (issue: string, max = 22) => {
  const clause = issue.split(/[,.]/)[0].trim();
  if (clause.length <= max) return clause;
  return clause.slice(0, clause.lastIndexOf(' ', max)).trim() + '…';
};

export const JOB_STEPS = (home: boolean) => ['Accepted', home ? 'On the way' : 'Received', 'Repairing', 'Done', 'Paid'];

/** Accepted→0 · OnTheWay→1 · InProgress→2 · Completed→3 · Released→4 */
export const stepIndex = (st: number) => Math.max(0, Math.min(4, st - JobStatus.Accepted));

/** The stages every booked job moves through (technician view), with the current one highlighted. */
export function JobStages({ compact }: { compact?: boolean }) {
  const { s } = useStore();
  const st = isMine(s) ? s.status : JobStatus.None;
  const home = s.mode === 'home';
  const steps: [JobStatus, string, string][] = [
    [JobStatus.Accepted, 'Booked', st >= JobStatus.Accepted ? `The customer chose your quote and booked ${home ? 'a home visit' : 'a drop-off'} for ${s.date}, ${s.time}.` : 'The customer chooses your quote, pays into escrow and books a time.'],
    [JobStatus.OnTheWay, home ? 'On the way' : 'Device received', home ? 'Tap Navigate for directions. The customer sees your ETA.' : 'The customer dropped the device at your workshop.'],
    [JobStatus.InProgress, 'Repair in progress', s.parts && st === JobStatus.InProgress ? 'Paused · awaiting parts (the customer’s ETA moves).' : 'Add a “before” photo. Use “Awaiting parts” if you need to order a part.'],
    [JobStatus.Completed, 'Repair completed', 'The customer has 72 hours to confirm, or the payment releases automatically.'],
    [JobStatus.Released, 'Paid', `Escrow released to your wallet, minus ${COMMISSION}% commission. Warranty starts.`],
  ];
  return (
    <Card tone="soft">
      <Bold style={{ marginBottom: 4 }}>Job stages</Bold>
      {!compact ? <Muted style={{ marginBottom: 6 }}>Every booking moves through these steps. The customer is notified at each one.</Muted> : null}
      <Timeline items={steps.map(([v, label, sub]) => ({
        label, sub: compact && st !== v ? '' : sub,
        state: st > v || (v === JobStatus.Released && st >= JobStatus.Released) ? 'done' : st === v ? 'now' : 'todo',
      }))} />
    </Card>
  );
}

/* ───────── T-01 Service profile setup (registration) ───────── */

/** Tappable row: tinted icon tile, title, one-line subtitle, chevron. */
export function ActionRow({ icon, color, bg, title, sub, onPress, delay = 0 }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; title: string; sub: string; onPress: () => void; delay?: number }) {
  return (
    <FadeIn delay={delay}>
      <Card onPress={onPress} style={{ paddingVertical: 12 }}>
        <Row style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'flex-start', gap: 14, flex: 1 }}>
            <IconBox name={icon} color={color} bg={bg} size={48} />
            <View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '700' }}>{title}</T><T style={{ fontSize: 13, color: C.mute }} numberOfLines={1}>{sub}</T></View>
          </Row>
          <Ionicons name="chevron-forward" size={18} color={C.ink} />
        </Row>
      </Card>
    </FadeIn>
  );
}

/** Job headline card used on Home (“Today’s job”) and in Jobs. */
export function JobPhoto({ cat, model, size, uri }: { cat: string; model: string; size: number; uri?: string }) {
  const { s } = useStore();
  const photo = uri ? { uri } : model === s.model ? s.photos.find(p => p.type === 'image') : undefined;
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: C.soft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: size, height: size }} resizeMode="cover" /> : <CatTile model={model} cat={cat} size={size} bg={C.soft} />}
    </View>
  );
}

/** "Yaba, Surulere +3 more" — keeps long area lists to one line. */
export const areaSummary = (a: string[]) => !a.length ? 'no areas' : a.length <= 2 ? a.join(', ') : `${a.slice(0, 2).join(', ')} +${a.length - 2} more`;

/* ───────── T-05 Request details ───────── */

export const ACTIVE_STEPS = ['Accepted', 'In progress', 'Completed'];

/** Booked/Accepted → 0 · On the way / repairing → 1 · Completed (awaiting customer) → 2 */
export const activeStep = (st: number) => st <= JobStatus.Accepted ? 0 : st < JobStatus.Completed ? 1 : 2;
