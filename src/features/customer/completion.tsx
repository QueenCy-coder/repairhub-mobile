// Check & confirm the repair, release payment, rate the technician.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, View, Pressable } from 'react-native';
import { Avatar, Banner, Bold, Btn, C, Card, Chip, Countdown, Empty, KV, Muted, Opt, Row, Screen, SuccessMark, Thumb, Title, Chips, Field, Input, Stars, T } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { ESCROW_RELEASE_MS, escrowTotal, first, JobStatus, N, photoCat, plural, repairPhoto, selectedQuote, repairDate, serviceOf } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { Warranty } from './warranty';

export function Complete() {
  const { s, set, get, run } = useStore();
  const q = selectedQuote(s), total = escrowTotal(s);
  if (s.status < JobStatus.Completed) return <Screen title="Repair"><Empty title="Not finished yet" sub="You can confirm once the technician marks the repair complete." action="Back to tracking" onPress={() => router.replace('/track')} /></Screen>;
  const released = s.status >= JobStatus.Released;
  const disputed = !!s.dispute && s.dispute.status !== 'Resolved';
  const confirm = () => Alert.alert(`Release ${N(total)} to ${first(q.name)}?`, 'Only confirm if the repair works. Your warranty starts today.', [
    { text: 'Not yet', style: 'cancel' },
    { text: 'Confirm & release', onPress: async () => {
      if (await run(() => backend.confirmRelease(get, set), `${N(total)} released to ${first(q.name)} · warranty active`)) router.push('/review');
    } },
  ]);
  return (
    <Screen title="" footer={released ? <Btn title="View warranty" onPress={() => router.push('/warranty')} /> : disputed ? <Btn title="View issue status" variant="sec" onPress={() => router.push('/track')} /> : <>
      <Btn title={`Confirm & release ${N(total)}`} onPress={confirm} />
      <Btn title="Report an Issue →" variant="danger" onPress={() => router.push('/report')} />
    </>}>
      <SuccessMark size={48} />
      <Title style={{ textAlign: 'center', marginTop: 10, fontSize: 19 }}>Repair Completed!</Title>
      <Muted style={{ textAlign: 'center' }}>{released ? 'You confirmed this repair. Payment was released and your warranty is active.' : `${first(q.name)} marked your repair as completed. Please check your device.`}</Muted>
      {disputed ? <Banner tone="bad" icon="!">{`Issue ${s.dispute!.id} is ${s.dispute!.status.toLowerCase()}. Payment stays frozen until RepairHub decides.`}</Banner> : null}
      {!released && !disputed ? <Card tone="hi" style={{ marginTop: 14, alignItems: 'center' }}>
        <Muted>Payment releases automatically in</Muted><Countdown until={s.completedAt + ESCROW_RELEASE_MS} style={{ fontSize: 26, fontWeight: '800' }} /><Muted style={{ fontSize: 12 }}>unless you confirm or report an issue</Muted>
      </Card> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        {/* Before = the customer's own upload (the API has no technician photos yet, so no "after" picture is invented). */}
        {[s.photos.find(p => p.type === 'image') ?? null].filter(Boolean).map((m, i) => (
          <View key={i} style={{ flex: 1 }}>
            {m ? <Thumb m={m} fill h={120} /> : <Image source={repairPhoto(photoCat(s.photos, s.cat), i === 0 ? 'broken' : 'fixed')} style={{ width: '100%', height: 120, borderRadius: 12 }} contentFit="cover" transition={200} />}
            <View style={{ position: 'absolute', top: 6, left: 6 }}><Chip tone={i === 0 ? undefined : 'ok'} label={i === 0 ? 'Before' : 'After'} /></View>
          </View>
        ))}
      </View>
      <Card tone="blue" style={{ marginTop: 12 }}><Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={q.name} verified /><View><Muted style={{ fontSize: 12 }}>Technician</Muted><Bold>{q.name}</Bold><Muted style={{ fontSize: 12, color: C.primary }}>✓ Verified Technician</Muted></View></Row></Card>
      <Card>
        <Bold style={{ marginBottom: 4 }}>Repair details</Bold>
        <KV k="Service" v={(t => t[0].toUpperCase() + t.slice(1))(serviceOf(s.desc, s.cat))} /><KV k="Issue" v={s.desc.split(/[,.]/)[0]} /><KV k="Device" v={s.model} /><KV k="Repair cost" v={N(total)} /><KV k="Completed on" v={repairDate(s)} /><KV k="Warranty" v={plural(q.warr, 'month')} />
      </Card>
      {!released ? <>
        <Bold style={{ marginBottom: 6 }}>Quick check (optional)</Bold>
        {['Device powers on', 'The original problem is fixed', 'No new damage'].map((l, i) => <Opt key={l} check label={l} on={s.checks[i]} onPress={() => set(p => ({ checks: p.checks.map((c, j) => j === i ? !c : c) }))} />)}
      </> : null}
    </Screen>
  );
}

/* ───────── C-12 Rate your repair → Review submitted (Figma) ───────── */

export function Review() {
  const { s, set, get, run, busy } = useStore();
  const submit = async () => {
    if (!s.rating) return Alert.alert('Choose a star rating first');
    if (s.reviewText && s.reviewText.trim().length < 10) return Alert.alert('Reviews need at least 10 characters', 'Or leave the text blank.');
    if (s.reviewed) return router.replace('/review-done');
    if (await run(() => backend.review(get, set))) router.replace('/review-done');
  };
  return (
    <Screen title="Rate your repair" footer={<Btn title={busy ? 'Sending…' : 'Submit Review'} disabled={busy} onPress={submit} />}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}><Avatar label={selectedQuote(s).name} size={60} verified /><Bold style={{ marginTop: 8 }}>{selectedQuote(s).name}</Bold></View>
      <T style={{ textAlign: 'center', marginBottom: 8 }}>How was your repair experience?</T>
      <Stars value={s.rating} onChange={n => set({ rating: n })} size={40} />
      <Muted style={{ textAlign: 'center', marginTop: 4 }}>{s.rating ? ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][s.rating] : 'Tap to rate (required)'}</Muted>
      <Chips>{['On time', 'Professional', 'Fair price', 'Neat work', 'Explained the fix'].map(t => <Chip key={t} label={t} tone={s.tags.includes(t) ? 'on' : undefined} onPress={() => set(p => ({ tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }))} />)}</Chips>
      <Field label="Tell us more (optional)"><Input value={s.reviewText} onChangeText={t => set({ reviewText: t })} multiline placeholder="What went well? At least 10 characters if you write one." /></Field>
      <Pressable onPress={() => router.replace('/warranty')} style={{ alignItems: 'center' }}><Muted style={{ textDecorationLine: 'underline' }}>Skip for now</Muted></Pressable>
    </Screen>
  );
}

export function ReviewDone() {
  return (
    <Screen title="" back={false} footer={<><Btn title="View your warranty" onPress={() => router.replace('/warranty')} /><Btn title="Back to home" variant="sec" onPress={() => router.replace('/home')} /></>}>
      <View style={{ alignItems: 'center', paddingTop: 80 }}><SuccessMark /><Title style={{ marginTop: 18, fontSize: 19 }}>Your review has been submitted</Title><Muted style={{ textAlign: 'center' }}>Thanks! Reviews help other customers choose with confidence.</Muted></View>
    </Screen>
  );
}

/* ───────── C-16 Report an issue (dispute) ───────── */
