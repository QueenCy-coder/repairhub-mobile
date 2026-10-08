// Accepting a booking and updating repair status through to completion.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CallButton } from '../../shared/components/callSheet';
import { Banner, Btn, Card, Empty, KV, Muted, Screen, T, InfoTag, FadeIn, Bold, Btns, C, Countdown, Field, H4, Input, Link, MediaGrid, Row, SuccessMark, Title } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import { ESCROW_RELEASE_MS, COMMISSION, escrowTotal, first, isMine, JobStatus, LEKKI, masked, nowLabel, custFirst, N, net, jobTitle, todayLabel, intl, custShort, plural, techStages, stageStatus } from '../../shared/core/data';
import { openDirections } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { customerSpot } from '../../shared/core/trackRoute';
import { payLabel } from '../customer/common';
import { JobPhoto, JobStages, OfflineStrip } from './common';

export function BookingRequest() {
  const { s, set, notify, online } = useStore();
  if (!(isMine(s) && s.status >= JobStatus.Booked)) return <Screen title="New booking"><Empty title="No booking requests" sub="When a customer picks your quote and pays, it shows up here." action="Browse jobs" onPress={() => router.replace('/jobs')} /></Screen>;
  if (s.status >= JobStatus.Accepted) return <Screen title="New booking"><Empty title="Accepted" sub="This booking is now your active job." action="Open job" onPress={() => router.replace('/job')} /></Screen>;
  const total = escrowTotal(s);
  const accept = () => {
    if (!online) return Alert.alert('You’re offline', 'Accepting a booking needs a connection.');
    set(p => ({ status: JobStatus.Accepted, jobLog: [...(p.jobLog ?? []), { label: 'Booking accepted', at: nowLabel() }] }));
    notify(`${first(s.techName)} accepted your booking`, `See you ${s.date}, ${s.time}.`, '/track');
    router.replace('/job');
  };
  return (
    <Screen title="New booking" footer={<><Btn title="Accept booking" onPress={accept} /><Btn title="Decline" variant="danger" onPress={() => Alert.alert('Decline this booking?', `${custFirst(s)} gets a full refund of ${N(total)} and can choose another quote.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => {
        // Declining withdraws this technician's quote and refunds the escrow to the customer's original payment method.
        set({ status: JobStatus.Quoted, sel: null, quoted: false });
        notify('Technician declined', `${N(total)} is being refunded to your ${payLabel(s.pay)}. Choose another quote to continue.`, '/compare');
        router.replace('/jobs');
      } },
    ])} /></>}>
      <Banner tone="ok" icon="✓">{`${custFirst(s)} chose your quote and paid ${N(total)} into escrow.`}</Banner>
      <Card><KV k="Job" v={`${shortRef(s.rid)} · ${s.model}`} /><KV k="When" v={`${s.date}, ${s.time}`} /><KV k="Service" v={s.mode === 'home' ? 'Home service' : 'At your workshop'} />{s.mode === 'home' ? <KV k="Address" v={(s.location || LEKKI.label)} /> : null}<KV k="Customer phone" v={`${masked(s.owner?.phone ?? s.phone)} · full number after you accept`} /><KV k="In escrow" v={N(total)} /><KV k={`You receive (after ${COMMISSION}%)`} v={N(net(total))} /></Card>
      <Muted style={{ marginBottom: 12 }}>Please respond within 2 hours. If you decline, the customer gets a full refund.</Muted>
      <JobStages compact />
    </Screen>
  );
}

/* ───────── T-08 Update Repair Status (Figma) · offline-capable ───────── */

export function Job() {
  const { s, techUpdate, online, toast } = useStore();
  const [note, setNote] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const [open, setOpen] = React.useState<number | null>(null);
  const [partsMode, setPartsMode] = React.useState(false);
  if (!(s.jobId && isMine(s) && s.status >= JobStatus.Accepted)) {
    const pending = false;
    return <Screen title="Update Repair Status"><Empty title="No active job" sub={pending ? 'Accept the booking request first.' : 'Accepted bookings show up here.'} action={pending ? 'View booking request' : 'Browse jobs'} onPress={() => router.replace(pending ? '/booking-request' : '/jobs')} /></Screen>;
  }
  const home = s.mode === 'home', total = escrowTotal(s), photos = s.progressPhotos.length;
  // Local view = synced state + queued offline updates.
  let local = { stage: s.techStage ?? 0, parts: s.parts, status: s.status as number };
  for (const u of s.queue) local = u.kind === 'parts' ? { ...local, parts: true } : { stage: u.stage ?? local.stage, parts: false, status: u.stage ? stageStatus(u.stage) : u.status ?? local.status };
  const stages = techStages(home);
  const nextStage = stages.find(x => x.stage > local.stage);
  const paused = local.parts && local.status === JobStatus.InProgress;
  const logFor = (stage: number) => [...(s.jobLog ?? [])].reverse().find(e => e.stage === stage);
  const queuedFor = (stage: number) => s.queue.find(u => u.stage === stage);
  const needPhoto = false; // the API has no job photos yet, so completion only needs the note
  // While a reported problem is under review the job is frozen on the server (no status updates).
  const frozen = !!s.dispute && s.dispute.status !== 'Resolved';

  const save = () => {
    if (paused) { techUpdate({ kind: 'status', stage: local.stage, note: note || 'Part arrived, repair resumed', photos }); setNote(''); return; }
    if (!nextStage) return;
    if (needPhoto) { setTried(true); toast('Add a photo of the finished repair below to mark it completed'); return; }
    techUpdate({ kind: 'status', stage: nextStage.stage, note: note.trim(), photos });
    setNote(''); setTried(false);
    if (nextStage.stage === 6) router.push('/job-done');
  };

  return (
    <Screen title="Update Repair Status" footer={(nextStage || paused) && !frozen ? <Btn title={paused ? '▶ Parts arrived · resume repair' : `${online ? 'Save progress' : 'Save offline'} · ${nextStage!.title}`} onPress={save} /> : undefined}>
      <OfflineStrip />
      {s.dispute && s.dispute.status !== 'Resolved' ? <Banner tone="bad" icon="!">{`${custFirst(s)} reported a problem with this repair. The payment is frozen while RepairHub reviews both sides.`}</Banner> : null}
      {s.dispute?.status === 'Resolved' && s.dispute.outcome && s.status < JobStatus.Released ? <Banner tone="warn" icon="ℹ︎">{s.dispute.outcome.replace(/Your payment/g, 'The payment').replace(/until you confirm/g, `until ${custFirst(s)} confirms`)}</Banner> : null}
      <Card>
        <Row style={{ alignItems: 'flex-start', gap: 12 }}>
          <JobPhoto cat={s.cat} model={s.model} size={84} />
          <View style={{ flex: 1, gap: 5 }}>
            <T style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={2}>{jobTitle({ dev: s.model, issue: s.desc, cat: s.cat })}</T>
            <Row><InfoTag icon="person-outline" label={custShort(s)} /><Muted style={{ fontSize: 12 }}>Job ID: {shortRef(s.rid)}</Muted></Row>
            <Row style={{ justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <InfoTag icon={home ? 'home-outline' : 'storefront-outline'} label={home ? 'Home service' : 'Visit shop'} tone="blue" />
              <InfoTag icon="calendar-outline" label={`${s.date === todayLabel() ? 'Today' : s.date}, ${s.time}`} />
            </Row>
          </View>
        </Row>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {home && local.stage < 2 ? <View style={{ flex: 1 }}><Btn small variant="sec" icon="navigate" title="Navigate" onPress={() => { const c = customerSpot(s.location || LEKKI.label); openDirections(c.latitude, c.longitude); }} style={{ marginTop: 0 }} /></View> : null}
          <View style={{ flex: 1 }}><CallButton small name={custShort(s)} role={`Customer · ${shortRef(s.rid)}`} phone={intl(s.owner?.phone ?? s.phone)} /></View>
        </View>
      </Card>

      <H4>Repair progress</H4>
      <Muted style={{ marginTop: -6, marginBottom: 10 }}>Update the current status of this repair. The customer will be notified.</Muted>
      {paused ? <Banner tone="warn" icon="⏸"><Bold style={{ fontSize: 14 }}>Paused · waiting for parts</Bold><T style={{ fontSize: 13, color: C.text }}>{[...(s.jobLog ?? [])].reverse().find(e => e.label.startsWith('Paused'))?.note ?? `${custFirst(s)} has been told why.`}</T></Banner> : null}
      <View>
        {stages.map((st, i) => {
          const done = st.stage <= local.stage, isNext = !paused && st.stage === nextStage?.stage, log = logFor(st.stage), q = queuedFor(st.stage);
          const expanded = open === st.stage;
          return (
            <FadeIn key={st.stage} delay={i * 50} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, marginTop: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? C.primary : '#fff', borderWidth: 2, borderColor: done || isNext ? C.primary : C.input }}>
                  {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : isNext ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /> : null}
                </View>
                {i < stages.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: done ? C.primary : C.line, marginTop: 2 }} /> : null}
              </View>
              <Pressable disabled={!done} onPress={() => setOpen(expanded ? null : st.stage)} accessibilityRole={done ? 'button' : undefined}
                style={{ flex: 1, marginBottom: 10, borderWidth: 1, borderRadius: 10, padding: 12, borderColor: isNext ? C.primary : C.line, backgroundColor: isNext ? C.primarySoft : '#fff', opacity: done || isNext ? 1 : 0.55 }}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 15, fontWeight: '600' }}>{st.title}</T>
                    <Text style={{ fontSize: 12, color: isNext ? C.primary : C.mute, marginTop: 2 }}>
                      {q ? `⏳ Saved offline · ${q.at}` : done ? `${log ? (/,/.test(log.at) ? log.at : `Today, ${log.at}`) : 'Done'}${log?.note ? ` · ${log.note}` : ''}` : st.hint}
                    </Text>
                  </View>
                  {done || isNext ? <Ionicons name={done ? (expanded ? 'chevron-up' : 'chevron-down') : 'chevron-forward'} size={18} color={isNext ? C.primary : C.mute} /> : null}
                </Row>
                {expanded ? <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
                  <Muted style={{ fontSize: 12 }}>{log?.note ? `Note to customer: “${log.note}”` : 'No note added.'}</Muted>
                  <Muted style={{ fontSize: 12 }}>Customer notified{log ? ` at ${log.at}` : ''}.</Muted>
                </View> : null}
              </Pressable>
            </FadeIn>
          );
        })}
      </View>

      {nextStage && !paused && !frozen ? <>
        <H4>Add update</H4>
        <Muted style={{ marginTop: -6, marginBottom: 8 }}>Add a note to keep {custFirst(s)} informed (optional).</Muted>
        <Input value={note} onChangeText={t => setNote(t.slice(0, 300))} multiline placeholder={nextStage.stage === 6 ? 'e.g. Screen replaced and tested successfully. Device is working perfectly.' : 'e.g. Screen requires replacement'} />
        <Muted style={{ textAlign: 'right', fontSize: 11, marginTop: 4 }}>{note.length}/300</Muted>
        {local.stage >= 2 && local.stage < 6 && !partsMode ? <Pressable onPress={() => setPartsMode(true)} style={{ marginTop: 14 }}><Link style={{ color: C.text }}>⏸ Waiting for a part? Pause the repair</Link></Pressable> : null}
        {partsMode ? <Card tone="soft" style={{ marginTop: 12 }}>
          <Field label="Which part, and when will it arrive?" required error={tried && note.trim().length < 5 ? `Tell ${custFirst(s)} what you’re waiting for, e.g. “Screen panel · arrives Fri”` : null}>
            <Input invalid={tried && note.trim().length < 5} value={note} onChangeText={t => setNote(t.slice(0, 300))} placeholder="e.g. Screen panel · arrives Fri 2 Oct" />
          </Field>
          <Btns><Btn small title="Cancel" variant="ghost" onPress={() => { setPartsMode(false); setTried(false); }} /><Btn small title="Pause for parts" onPress={() => {
            if (note.trim().length < 5) { setTried(true); return; }
            techUpdate({ kind: 'parts', note: note.trim(), photos }); setNote(''); setPartsMode(false); setTried(false);
          }} /></Btns>
        </Card> : null}
      </> : null}

      {local.status === JobStatus.Completed && !s.dispute ? <>
        <Banner tone="warn" icon="⏳"><T style={{ fontSize: 14, color: C.text }}>Waiting for {custFirst(s)} to confirm. Payment auto-releases in <Countdown until={s.completedAt + ESCROW_RELEASE_MS} style={{ fontWeight: '700', fontSize: 14 }} />.</T></Banner>
      </> : null}
      {s.status >= JobStatus.Released ? <><Banner tone="ok" icon="✓">{`Confirmed by the customer. ${N(net(total))} was added to your wallet (after ${COMMISSION}% commission).`}</Banner><Btn title="View earnings" variant="sec" onPress={() => router.push('/earnings')} /></> : null}

      <H4>Job details</H4>
      <Card>
        <T style={{ fontSize: 14, color: C.text }}>{s.desc}</T>
        {s.photos.length ? <View style={{ marginTop: 10 }}><Muted style={{ fontSize: 12, marginBottom: 6 }}>Customer’s photos</Muted><MediaGrid items={s.photos} max={s.photos.length} /></View> : null}
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 10 }} />
        <KV k="Labour" v={N(s.qLabour)} /><KV k="Parts" v={N(s.qParts)} />
        <KV k="In escrow" v={N(total)} /><KV k={`You receive (after ${COMMISSION}%)`} v={N(net(total))} /><KV k="Warranty you offered" v={plural(s.qWarr, 'month')} />
      </Card>
      <OfflineStrip toggleOnly />
    </Screen>
  );
}

/* ───────── Repair completed! (technician, Figma) ───────── */

export function JobDone() {
  const { s } = useStore();
  const total = escrowTotal(s), log = [...(s.jobLog ?? [])].reverse().find(e => e.stage === 6);
  return (
    <Screen title="" onBack={() => router.replace('/job')} footer={<>
      <Btn title="View completed job" onPress={() => router.replace('/job')} />
      <Pressable onPress={() => router.replace('/tech-home')} style={{ marginTop: 10, backgroundColor: C.primarySoft, borderRadius: 8, paddingVertical: 13, alignItems: 'center' }} accessibilityRole="button"><Text style={{ color: C.primary, fontWeight: '600', fontSize: 15 }}>Back to home</Text></Pressable>
    </>}>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <SuccessMark size={56} />
        <Title style={{ marginTop: 12, fontSize: 20 }}>Repair completed!</Title>
        <Muted style={{ textAlign: 'center', fontSize: 14 }}>{s.status >= JobStatus.Released ? `${custFirst(s)} confirmed the repair. The payment is in your wallet.` : `${custFirst(s)} has been notified. Your payment is released when they confirm, or automatically after 72 hours.`}</Muted>
      </View>
      <Card tone="blue" style={{ marginTop: 18, padding: 0, overflow: 'hidden' }}>
        <Row style={{ justifyContent: 'flex-start', gap: 12, padding: 12 }}>
          <JobPhoto cat={s.cat} model={s.model} size={64} />
          <View style={{ flex: 1, gap: 4 }}><T style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{jobTitle({ dev: s.model, issue: s.desc, cat: s.cat })}</T><Row><InfoTag icon="person-outline" label={custShort(s)} /><Muted style={{ fontSize: 12 }}>Job ID: {shortRef(s.rid)}</Muted></Row></View>
        </Row>
        <Row style={{ backgroundColor: '#fff', padding: 12 }}>
          <Row style={{ justifyContent: 'flex-start', gap: 6 }}><Ionicons name="checkmark-circle" size={16} color={C.ok} /><T style={{ fontSize: 13, fontWeight: '600' }}>Completed</T><Muted style={{ fontSize: 12 }}>· Today {log?.at ?? ''}</Muted></Row>
          <T style={{ fontSize: 20, fontWeight: '800' }}>{N(total)}</T>
        </Row>
      </Card>
      <Muted style={{ textAlign: 'center' }}>You’ll receive {N(net(total))} after the {COMMISSION}% commission.</Muted>
    </Screen>
  );
}

/* ───────── Services & Coverage (Figma) ───────── */
