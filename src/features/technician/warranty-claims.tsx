// Responding to customers' warranty claims (fix it under warranty, or explain why it isn't covered).
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Banner, Bold, Btn, Btns, Card, CatTile, Chip, Empty, FadeIn, Field, H4, Input, KV, Muted, Opt, Row, Screen, T } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { shortDate } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';

export const DISPUTE_REASONS = ['Different fault, not caused by my repair', 'New physical or liquid damage', 'Part not from my repair', 'Other'];

type ClaimRow = Awaited<ReturnType<typeof backend.techClaims>>[number];

export function TechClaim() {
  const { s, set, get, run, busy } = useStore();
  const [rows, setRows] = React.useState<ClaimRow[] | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'fix' | 'reject'>('fix');
  const [note, setNote] = React.useState('');
  const [reason, setReason] = React.useState(DISPUTE_REASONS[0]);
  const [tried, setTried] = React.useState(false);
  const load = React.useCallback(() => backend.techClaims(get).then(setRows).catch(() => setRows([])), [get]);
  React.useEffect(() => { load(); }, [load]);
  // Nothing left to answer: clear the "warranty claim" alerts so the dashboard card goes away.
  React.useEffect(() => {
    if (!rows || rows.some(r => r.claim.status === 'open')) return;
    const ids = s.notifications.filter(n => n.id && !n.read && n.title === 'Warranty' && /claim/i.test(n.body)).map(n => n.id!);
    if (ids.length) backend.markRead(set, ids);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <Screen title="Warranty claims"><Muted style={{ textAlign: 'center', marginTop: 30 }}>Loading claims…</Muted></Screen>;
  const pending = rows.filter(r => r.claim.status === 'open'), done = rows.filter(r => r.claim.status !== 'open');
  if (!rows.length) return <Screen title="Warranty claims"><Empty title="No warranty claims" sub="If a customer reports a problem with one of your repairs under warranty, it shows up here." action="Back" onPress={() => router.back()} /></Screen>;
  const noteErr = mode === 'reject' && note.trim().length < 15 ? 'Explain why in at least 15 characters' : null;
  const respond = async (r: ClaimRow) => {
    if (noteErr) { setTried(true); return; }
    const text = mode === 'fix' ? (note.trim() || 'Fixed under warranty at no cost.') : `${reason}. ${note.trim()}`;
    if (await run(() => backend.resolveClaim(get, () => {}, r.warrantyId, r.claim._id, mode === 'fix', text), mode === 'fix' ? 'Claim resolved · customer notified' : 'Response sent · customer notified')) {
      setOpen(null); setNote(''); setTried(false); load();
    }
  };
  // A render function, not an inner component: an inner component is re-created on every keystroke, which would
  // make the note box lose focus after each letter.
  const renderClaim = (r: ClaimRow) => {
    const isOpen = open === r.claim._id, waiting = r.claim.status === 'open';
    return (
      <FadeIn key={r.claim._id}>
        <Card tone={waiting ? 'hi' : undefined}>
          <Row style={{ alignItems: 'flex-start', gap: 12 }}>
            <CatTile model={r.job.dev} cat={r.job.cat} size={44} />
            <View style={{ flex: 1 }}>
              <Row><Bold style={{ fontSize: 15 }}>{shortRef(r.claim._id, 'WC')}</Bold><Chip tone={waiting ? 'warn' : r.claim.status === 'resolved' ? 'ok' : 'off'} label={waiting ? 'Action needed' : r.claim.status === 'resolved' ? 'Fixed' : 'Not covered'} /></Row>
              <Muted style={{ fontSize: 12 }}>{r.job.dev} · repair {r.job.id} · {shortDate(new Date(r.claim.createdAt).getTime())}</Muted>
            </View>
          </Row>
          <T style={{ fontSize: 14, marginTop: 8 }}>“{r.claim.description}”</T>
          {r.claim.resolutionNote ? <Muted style={{ marginTop: 6 }}>Your response: {r.claim.resolutionNote}</Muted> : null}
          {waiting && !isOpen ? <Btn small title="Respond" onPress={() => { setOpen(r.claim._id); setMode('fix'); setNote(''); setTried(false); }} /> : null}
          {isOpen ? <>
            <H4>Your response</H4>
            <Opt label="I’ll fix it under warranty" sub="Free for the customer · you arrange the visit with them" on={mode === 'fix'} onPress={() => setMode('fix')} />
            <Opt label="Not covered by the warranty" sub="Explain why — the customer sees your reason" on={mode === 'reject'} onPress={() => setMode('reject')} />
            {mode === 'reject' ? DISPUTE_REASONS.map(x => <Opt key={x} label={x} on={reason === x} onPress={() => setReason(x)} />) : null}
            <Field label={mode === 'fix' ? 'Note to customer (optional)' : 'Explain your side'} required={mode === 'reject'} error={tried && noteErr}>
              <Input invalid={!!(tried && noteErr)} value={note} onChangeText={setNote} multiline placeholder={mode === 'fix' ? 'e.g. Replaced the screen connector and tested it.' : 'What you checked and why this isn’t covered'} />
            </Field>
            <Btns><Btn small title="Cancel" variant="ghost" onPress={() => setOpen(null)} /><Btn small title={busy ? 'Sending…' : mode === 'fix' ? 'Mark fixed' : 'Send response'} disabled={busy} onPress={() => respond(r)} /></Btns>
          </> : null}
        </Card>
      </FadeIn>
    );
  };
  return (
    <Screen title="Warranty claims">
      {pending.length ? <Banner tone="warn" icon="!">{`${pending.length === 1 ? 'A customer is' : `${pending.length} customers are`} waiting for your response.`}</Banner> : null}
      {pending.map(renderClaim)}
      {done.length ? <><H4>Earlier claims</H4>{done.map(renderClaim)}</> : null}
      <Card tone="soft"><KV k="Warranty work" v="Free for the customer" /><Muted style={{ fontSize: 12 }}>Fix the same fault at no cost, or explain clearly why it isn’t covered.</Muted></Card>
    </Screen>
  );
}
