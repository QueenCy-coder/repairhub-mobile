// Live repair tracking and reporting a problem.
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { CallButton } from '../../shared/components/callSheet';
import { TrackMap } from '../../shared/components/trackMap';
import { Avatar, Banner, Bold, Btn, C, Card, Demo, Empty, H4, Link, MediaGrid, Muted, Row, Screen, Timeline, Field, Input, KV, Opt } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { intl, escrowTotal, first, JobStatus, LEKKI, N, selectedQuote, trackSteps, validUntil } from '../../shared/core/data';
import { pickMedia } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { onTheWayAt } from './common';
import { NoBooking } from './booking';

export function Track() {
  const { s } = useStore();
  if (s.status < JobStatus.Accepted && (s.cancelled || s.status === JobStatus.Quoted)) return <NoBooking />;
  if (s.status < JobStatus.Accepted) return <Screen title="Track repair"><Empty title="Nothing to track yet" sub="Progress shows up here once you book and pay." action="Go home" onPress={() => router.replace('/home')} /></Screen>;
  const q = selectedQuote(s), open = !!s.dispute && s.dispute.status !== 'Resolved', ref = shortRef(s.rid);
  return (
    <Screen title={`${s.model} repair`} footer={
      s.status === JobStatus.Completed && !open ? <Btn title="Check & confirm repair →" onPress={() => router.push('/complete')} />
        : s.status >= JobStatus.Released ? <Btn title="View warranty" onPress={() => router.push('/warranty')} />
          : <>{s.qBy?.phone ? <CallButton name={q.name} role={`Your technician · ${ref}`} phone={intl(s.qBy.phone)} label={`Call ${first(q.name)}`} /> : null}{s.status < JobStatus.Completed ? <Btn icon="calendar-outline" title="Manage appointment" variant="ghost" onPress={() => router.push('/appointments')} /> : null}</>}>
      <Muted>Request ID: {ref}</Muted>
      {s.dispute?.status === 'Resolved' && s.dispute.outcome && s.status < JobStatus.Released ? <Banner tone="ok" icon="⚖︎">{`Issue ${s.dispute.id} resolved. ${s.dispute.outcome}`}</Banner> : null}
      {open ? <Banner tone="bad" icon="!">{`Problem reported (${s.dispute!.status.toLowerCase()}). ${N(escrowTotal(s))} stays frozen in escrow until RepairHub decides.`}</Banner> : null}
      {s.status === JobStatus.OnTheWay && s.mode === 'home' ? <TrackMap since={onTheWayAt(s)} techName={q.name} address={s.location || LEKKI.label} /> : null}
      <Timeline items={trackSteps(s)} />
      {s.progressPhotos.length ? <><H4>Photos from {first(q.name)}</H4><MediaGrid items={s.progressPhotos} max={s.progressPhotos.length} /></> : null}
      <Card tone="soft" style={{ marginTop: 12 }}><Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={q.name} verified size={40} /><View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{q.name}</Bold><Muted style={{ fontSize: 12 }}>{s.date}, {s.time} · {s.mode === 'home' ? 'Home service' : 'Workshop'}</Muted></View><Muted>{N(escrowTotal(s))}</Muted></Row></Card>
      {s.status < JobStatus.Released && !open ? <Pressable onPress={() => router.push('/report')} style={{ alignItems: 'center', marginTop: 6 }}><Link style={{ color: C.bad }}>Report a problem</Link></Pressable> : null}
    </Screen>
  );
}

/* ───────── C-11 Repair complete → confirm & release (Figma + escrow fix) ───────── */

export function Report() {
  const { s, set, get, run, busy } = useStore();
  const [tried, setTried] = React.useState(false);
  const descErr = s.dDesc.trim().length < 15 ? 'Tell us what happened in at least 15 characters' : null;
  // After payment is released there is nothing left in escrow to freeze: problems are handled under the warranty.
  if (s.status >= JobStatus.Released) return (
    <Screen title="Report an issue" footer={<Btn icon="shield-checkmark-outline" title="Start a warranty claim" onPress={() => router.replace('/claim')} />}>
      <Banner tone="warn" icon="ℹ︎">{`Payment for ${shortRef(s.rid)} was already released, so it can’t be frozen. If the fault came back or the repair caused a new problem, your warranty covers a free re-repair.`}</Banner>
      <Card tone="soft"><KV k="Warranty" v={shortRef(s.warrantyId, 'WR')} /><KV k="Valid until" v={validUntil(s)} /></Card>
      <Muted style={{ textAlign: 'center', marginTop: 8 }}>Something else (e.g. safety or conduct)? Contact support from your profile.</Muted>
    </Screen>
  );
  return (
    <Screen title="Report an issue" footer={<Btn title={busy ? 'Sending…' : 'Submit report'} disabled={busy} onPress={async () => {
      if (descErr) { setTried(true); return; }
      // The API takes one reason text: what went wrong, the details, and what the customer wants.
      const reason = `${s.dReason}: ${s.dDesc.trim()} (Wants: ${s.dWant})`;
      if (!(await run(() => backend.openDispute(get, set, reason, s.disputeMedia), 'Report sent · payment frozen'))) return;
      if (router.canDismiss()) router.dismissAll(); router.push('/track');
    }} />}>
      <Banner tone="warn" icon="🔒">{`Your ${N(escrowTotal(s))} stays frozen in escrow while a RepairHub admin reviews both sides.`}</Banner>
      <Field label="What went wrong?">{['Repair not done properly', 'New damage to my device', 'Charged more than the quote', 'Technician didn’t show up', 'Other'].map(o => <Opt key={o} label={o} on={s.dReason === o} onPress={() => set({ dReason: o })} />)}</Field>
      <Field label="Details" required error={tried && descErr}><Input invalid={!!(tried && descErr)} value={s.dDesc} onChangeText={t => set({ dDesc: t })} multiline placeholder="Tell us what happened" /></Field>
      <Field label="Evidence"><MediaGrid items={s.disputeMedia} max={3} onAdd={async () => { const m = await pickMedia({ limit: 3 - s.disputeMedia.length, allowVideo: true }); set(p => ({ disputeMedia: [...p.disputeMedia, ...m] })); }} onRemove={i => set(p => ({ disputeMedia: p.disputeMedia.filter((_, j) => j !== i) }))} /></Field>
      <Field label="What would fix this?">{['Redo the repair', 'Partial refund', 'Full refund'].map(o => <Opt key={o} label={o} on={s.dWant === o} onPress={() => set({ dWant: o })} />)}</Field>
    </Screen>
  );
}

/* ───────── C-17 Notifications ───────── */
