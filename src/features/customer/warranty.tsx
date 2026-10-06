// Warranty card (QR) and warranty claims.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import qrcode from 'qrcode-generator';
import React from 'react';
import { View, Pressable, Alert, Text } from 'react-native';
import { Bold, C, Muted, Row, Btn, Card, CatTile, Chip, KV, Link, Screen, T, Field, Input, MediaGrid, Banner, SuccessMark, Timeline, Title, Demo } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { JobStatus, myPastRequests, repairDate, selectedQuote, shortDate, State, validUntil, warrantyEnd, plural, first } from '../../shared/core/data';
import { copyText, shareText, pickFiles, pickMedia } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';

/** Warranty data for the live repair or a past one. */
export function warrantyOf(s: State, id?: string) {
  if (!id || id === 'RH-0841' || id === shortRef(s.rid)) {
    if (s.status < JobStatus.Released || !s.jobId) return null;
    const q = selectedQuote(s);
    return { id: shortRef(s.warrantyId, 'WR'), repair: shortRef(s.rid), model: s.model, cat: s.cat, tech: q.name, date: repairDate(s).replace(/^\w+ /, ''), until: validUntil(s), months: q.warr, days: Math.ceil((warrantyEnd(s).getTime() - Date.now()) / 864e5), live: true };
  }
  const j = myPastRequests(s).find(x => x.id === id && x.status === 'Completed' && x.warr);
  if (j) {
    const end = new Date(j.at); if (j.warrDays) end.setDate(end.getDate() + j.warrDays); else end.setMonth(end.getMonth() + (j.warr ?? 0));
    return { id: `WR-${j.id.slice(3)}`, repair: j.id, model: j.dev, cat: j.cat, tech: j.techName ?? '', date: shortDate(j.at), until: shortDate(end.getTime()), months: j.warr ?? 0, days: Math.ceil((end.getTime() - Date.now()) / 864e5), live: false };
  }
  return null;
}

/** QR code drawn with plain views (no SVG dependency). */
export function QR({ value, size = 140 }: { value: string; size?: number }) {
  const rows = React.useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(value); q.make();
    const n = q.getModuleCount();
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
  }, [value]);
  const cell = size / rows.length;
  return (
    <View accessibilityRole="image" accessibilityLabel="Warranty QR code" style={{ padding: 8, backgroundColor: '#fff', borderRadius: 8 }}>
      {rows.map((r, i) => <View key={i} style={{ flexDirection: 'row' }}>{r.map((d, j) => <View key={j} style={{ width: cell, height: cell, backgroundColor: d ? '#0B1B3F' : '#fff' }} />)}</View>)}
    </View>
  );
}

export const CopyRow = ({ k, v }: { k: string; v: string }) => {
  const { toast } = useStore();
  return (
    <Row style={{ paddingVertical: 6 }}>
      <Muted>{k}</Muted>
      <Pressable onPress={async () => toast((await copyText(v)) ? `${v} copied` : 'Couldn’t copy')} accessibilityRole="button" accessibilityLabel={`Copy ${k}`} hitSlop={8}>
        <Row style={{ gap: 6 }}><Bold style={{ fontSize: 14 }}>{v}</Bold><Ionicons name="copy-outline" size={15} color={C.primary} /></Row>
      </Pressable>
    </Row>
  );
};

export const COVERED = ['Parts replaced in this repair', 'Faults caused by the repair work', 'Free labour on warranty re-repairs'];

export const NOT_COVERED = ['New drops, cracks or physical damage', 'Liquid or water damage', 'Repairs or opening by another technician'];

export const TERMS = 'The warranty starts on the repair date and covers only the parts replaced and the work done on this repair. Claims must be raised in the app before the expiry date with a description and, where possible, photos. The technician has 48 hours to respond; if they disagree, RepairHub reviews both sides and decides within 48 hours. Approved claims are fixed again free of charge, with a replacement part, or refunded. The warranty is void if the device is opened or repaired by someone else.';

/* ───────── C-14 Warranty info (Figma) ───────── */

export function Warranty() {
  const { s, toast } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const w = warrantyOf(s, id);
  if (!w) return <Screen title="Warranty info"><Muted style={{ textAlign: 'center', marginTop: 30 }}>Your digital warranty is created when you confirm the repair, or when the payment auto-releases.</Muted></Screen>;
  const active = w.days > 0;
  const text = `RepairHub warranty ${w.id}\nRepair ${w.repair} · ${w.model}\nTechnician: ${w.tech}\nRepair date: ${w.date}\nValid until: ${w.until}`;
  const footer = w.live && active
    ? <Btn title={s.claim ? 'Track claim' : 'Submit warranty claim'} onPress={() => router.push('/claim')} />
    : undefined;
  return (
    <Screen title="Warranty info" footer={footer} right={<Pressable onPress={async () => { const r = await shareText(`Warranty ${w.id}`, text); if (r === 'copied') toast('Warranty details copied'); }} accessibilityLabel="Share warranty" hitSlop={10}><Ionicons name="share-outline" size={22} color={C.primary} /></Pressable>}>
      <Card tone="strong">
        <Row style={{ alignItems: 'flex-start', gap: 12 }}>
          <CatTile model={w.model} cat={w.cat} size={56} />
          <View style={{ flex: 1 }}>
            <Row><Bold style={{ fontSize: 16, flex: 1 }}>{w.model}</Bold><Chip tone={active ? (w.live && s.claim ? 'warn' : 'ok') : 'off'} label={active ? (w.live && s.claim ? 'Claim open' : 'Active') : 'Expired'} /></Row>
            <Muted style={{ fontSize: 12 }}>Repair ID {w.repair}</Muted>
            <Link style={{ marginTop: 6 }} onPress={() => router.push({ pathname: '/repair', params: { id: w.repair } })}>View repair details →</Link>
          </View>
        </Row>
      </Card>
      <Bold style={{ marginTop: 6, marginBottom: 6 }}>Warranty information</Bold>
      <Card>
        <CopyRow k="Warranty ID" v={w.id} />
        <KV k="Repair ID" v={w.repair} />
        <KV k="Technician" v={w.tech} />
        <KV k="Repair date" v={w.date} />
        <KV k="Expiry date" v={<Text style={{ fontWeight: '700', color: active ? C.ok : C.bad }}>{w.until} · {active ? `${plural(w.days, 'day')} left` : 'expired'}</Text>} />
      </Card>
      <Bold style={{ marginTop: 6, marginBottom: 6 }}>Coverage</Bold>
      <Card>{COVERED.map(t => <Row key={t} style={{ justifyContent: 'flex-start', gap: 8, paddingVertical: 4 }}><Ionicons name="checkmark-circle" size={18} color={C.ok} /><T style={{ fontSize: 14, flex: 1 }}>{t}</T></Row>)}</Card>
      <Bold style={{ marginTop: 6, marginBottom: 6 }}>Not covered</Bold>
      <Card>{NOT_COVERED.map(t => <Row key={t} style={{ justifyContent: 'flex-start', gap: 8, paddingVertical: 4 }}><Ionicons name="close-circle" size={18} color={C.bad} /><T style={{ fontSize: 14, flex: 1 }}>{t}</T></Row>)}</Card>
      <Card style={{ alignItems: 'center' }}>
        <Bold style={{ marginBottom: 8 }}>Warranty code</Bold>
        <QR value={`repairhub://warranty/${w.id}`} />
        <Muted style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>Show this code to any RepairHub technician to verify your warranty.</Muted>
      </Card>
      <Card onPress={() => Alert.alert('Warranty terms and conditions', TERMS)}>
        <Row><Row style={{ justifyContent: 'flex-start', gap: 10 }}><Ionicons name="document-text-outline" size={20} color={C.primary} /><T style={{ fontSize: 14, fontWeight: '600' }}>Terms and conditions</T></Row><Ionicons name="chevron-forward" size={18} color={C.mute} /></Row>
      </Card>
    </Screen>
  );
}

export const ISSUES = ['Screen issue', 'Battery issue', 'Charging problem', 'Camera issue', 'Sound or microphone', 'Software or performance', 'Other'];

export const RESOLUTIONS: [string, React.ComponentProps<typeof Ionicons>['name']][] = [['Repair again', 'construct-outline'], ['Replace part', 'swap-horizontal-outline'], ['Refund', 'cash-outline']];

/* ───────── C-15 Submit warranty claim (Figma) ───────── */

export function Claim() {
  const { s, set, get, toast, run, busy } = useStore();
  const w = warrantyOf(s);
  const [open, setOpen] = React.useState(false);
  const [same, setSame] = React.useState<boolean | null>(null);
  const [resolution, setResolution] = React.useState<string | null>(null);
  const [tried, setTried] = React.useState(false);
  if (s.claim) return <ClaimSubmitted track />;
  if (!w) return <Screen title="Submit warranty claim"><Muted>A warranty claim needs a completed repair with an active warranty.</Muted></Screen>;
  const q = selectedQuote(s);
  const issue = ISSUES.includes(s.claimIssue) ? s.claimIssue : null;
  const err = {
    issue: !issue ? 'Choose the issue' : null,
    same: same === null ? 'Choose Yes or No' : null,
    desc: s.claimDesc.trim().length < 15 ? 'Describe the problem in at least 15 characters' : null,
    res: !resolution ? 'Choose how you’d like this resolved' : null,
  };
  const submit = async () => {
    if (Object.values(err).some(Boolean)) { setTried(true); toast('Please complete the fields marked in red'); return; }
    // The API stores one description per claim, so the answers above travel in it.
    const description = `${s.claimIssue} · Same issue as repaired: ${same ? 'Yes' : 'No'} · Wants: ${resolution} — ${s.claimDesc.trim()}`;
    if (await run(() => backend.fileClaim(get, set, description))) router.replace('/claim-submitted');
  };
  return (
    <Screen title="Submit warranty claim" footer={<Btn title={busy ? 'Sending…' : 'Submit claim'} disabled={busy} onPress={submit} />}>
      <Card tone="strong">
        <Row style={{ gap: 12 }}>
          <CatTile model={w.model} cat={w.cat} size={52} />
          <View style={{ flex: 1 }}><Bold>{w.model}</Bold><Muted style={{ fontSize: 12 }}>{w.repair} · {w.id}</Muted></View>
          <View style={{ alignItems: 'flex-end' }}><Chip tone="ok" label="Active" /><Muted style={{ fontSize: 11, marginTop: 2 }}>{plural(w.days, 'day')} left</Muted></View>
        </Row>
      </Card>
      <Field label="What issue are you experiencing?" required error={tried && err.issue}>
        <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityLabel={`Issue: ${issue ?? 'not selected'}`} style={{ borderWidth: 1, borderColor: open ? C.primary : tried && err.issue ? C.bad : C.line, borderRadius: 12, padding: 14, backgroundColor: '#fff' }}>
          <Row><T style={{ fontSize: 15, color: issue ? C.ink : C.mute }}>{issue ?? 'Select an issue'}</T><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.mute} /></Row>
        </Pressable>
        {open ? <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, marginTop: 4, backgroundColor: '#fff', overflow: 'hidden' }}>
          {ISSUES.map(o => <Pressable key={o} onPress={() => { set({ claimIssue: o }); setOpen(false); }} style={{ padding: 12, backgroundColor: o === s.claimIssue ? C.primarySoft : '#fff' }}><Row><T style={{ fontSize: 14 }}>{o}</T>{o === s.claimIssue ? <Ionicons name="checkmark" size={16} color={C.primary} /> : null}</Row></Pressable>)}
        </View> : null}
      </Field>
      <Field label="Is this the same issue that was repaired?" required error={tried && err.same}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([['Yes', true], ['No', false]] as const).map(([l, v]) => (
            <Pressable key={l} onPress={() => setSame(v)} accessibilityRole="radio" accessibilityState={{ selected: same === v }} style={{ flex: 1, borderWidth: 1.5, borderColor: same === v ? C.primary : tried && err.same ? C.bad : C.line, backgroundColor: same === v ? C.primarySoft : '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <T style={{ fontWeight: '600', color: same === v ? C.primary : C.ink }}>{l}</T>
            </Pressable>
          ))}
        </View>
      </Field>
      <Field label="Describe the issue" required error={tried && err.desc}>
        <Input invalid={!!(tried && err.desc)} value={s.claimDesc} onChangeText={t => set({ claimDesc: t.slice(0, 500) })} multiline maxLength={500} placeholder="Tell us what’s happening with the device since the repair" />
        <Muted style={{ fontSize: 12, textAlign: 'right', marginTop: 4 }}>{s.claimDesc.length}/500</Muted>
      </Field>
      <Field label="Preferred resolution" required error={tried && err.res}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RESOLUTIONS.map(([l, icon]) => (
            <Pressable key={l} onPress={() => setResolution(l)} accessibilityRole="radio" accessibilityState={{ selected: resolution === l }} style={{ flex: 1, borderWidth: 1.5, borderColor: resolution === l ? C.primary : tried && err.res ? C.bad : C.line, backgroundColor: resolution === l ? C.primarySoft : '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Ionicons name={icon} size={22} color={resolution === l ? C.primary : C.mute} /><T style={{ fontSize: 13, fontWeight: '600', marginTop: 4, color: resolution === l ? C.primary : C.ink }}>{l}</T>
            </Pressable>
          ))}
        </View>
      </Field>
      <Muted style={{ fontSize: 12 }}>{`${first(q.name)} is notified straight away and will fix it or explain why it isn’t covered.`}</Muted>
    </Screen>
  );
}

/** Claim status: Submitted → with the technician → fixed under warranty (or not covered). */
export function claimSteps(s: State) {
  const c = s.claim!, q = selectedQuote(s), open = c.status === 'Submitted', rejected = c.resolution === 'rejected';
  return [
    { label: 'Submitted', sub: c.at ? new Date(c.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : undefined, state: 'done' as const },
    { label: `With ${first(q.name)}`, sub: open ? 'Waiting for their response' : 'Responded', state: (open ? 'now' : 'done') as 'now' | 'done' },
    { label: rejected ? 'Not covered' : 'Fixed under warranty', sub: c.resolvedAt, state: (open ? 'todo' : 'done') as 'todo' | 'done' },
  ];
}

/* ───────── C-15b Claim submitted / claim tracking (Figma) ───────── */

export function ClaimSubmitted({ track }: { track?: boolean }) {
  const { s } = useStore();
  if (!s.claim) return <Screen title="Warranty claim"><Muted>No open claim.</Muted></Screen>;
  const c = s.claim, q = selectedQuote(s);
  const justSent = !track;
  const home = () => { if (router.canDismiss()) router.dismissAll(); router.replace('/home'); };
  return (
    <Screen title={justSent ? 'Claim submitted' : 'Track claim'} onBack={justSent ? home : undefined} footer={justSent ? <>
      <Btn title="Track claim" icon="locate-outline" onPress={() => router.replace('/claim')} />
      <Btn title="Back to home" variant="ghost" onPress={home} />
    </> : undefined}>
      {justSent ? <View style={{ alignItems: 'center', marginBottom: 8 }}><SuccessMark size={64} /><Title style={{ fontSize: 20, marginTop: 8, textAlign: 'center' }}>Claim submitted successfully</Title><Muted style={{ textAlign: 'center' }}>We’ve sent your warranty claim to {first(q.name)}.</Muted></View> : null}
      <Card>
        <CopyRow k="Claim ID" v={shortRef(c.apiId, 'WC')} />
        <CopyRow k="Warranty ID" v={shortRef(s.warrantyId, 'WR')} />
        <KV k="Repair ID" v={shortRef(s.rid)} />
        <KV k="Details" v={c.issue} />
      </Card>
      {c.status === 'Disputed' ? <Banner tone="warn" icon="!">{`${first(q.name)} disputed this claim${c.disputeReason ? ` (${c.disputeReason.toLowerCase()})` : ''}. A RepairHub admin will review both sides and decide within 48 hours.`}</Banner>
        : c.status === 'Accepted' && !c.outcome ? <Banner tone="ok" icon="✓">{`${first(q.name)} accepted your claim.${c.visit ? ` Scheduled for ${c.visit}.` : ''}${c.techNote ? ` “${c.techNote}”` : ''}`}</Banner>
        : c.status === 'Submitted' ? <Banner tone="blue" icon="ℹ︎">{`${first(q.name)} has been notified. We’ll let you know as soon as they respond.`}</Banner> : null}
      {c.outcome ? <Banner tone={c.resolution === 'rejected' ? 'warn' : 'ok'} icon={c.resolution === 'rejected' ? '⚖︎' : '✓'}>{`${c.outcome}${c.resolution !== 'rejected' ? ` Your warranty stays active until ${validUntil(s)}.` : ''}`}</Banner> : null}
      <Bold style={{ marginTop: 6, marginBottom: 6 }}>Claim status</Bold>
      <Timeline items={claimSteps(s)} />
    </Screen>
  );
}
