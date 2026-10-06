// Request a repair: device and problem, location and time, review and submit.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View, Text } from 'react-native';
import { C, Input, Muted, T, CatTile, Btn, Demo, Field, MediaGrid, Screen, ChoiceOrType, Opt, Bold, Card, Chip, Row, Thumb, Empty } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { isListedModel, MODELS, JobStatus, LIVE_CATEGORIES, repairPhoto, DATES, TIME_WINDOWS } from '../../shared/core/data';
import { pickMedia, sampleMedia, askNotifications } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { EditLink, catNoun, requestErrors } from './common';
import { Home } from './home';

/** Model picker: searchable list for the chosen device type, plus “Other” with a free-text box. */
export const DEVICE_SHORT: Record<string, string> = { Smartphones: 'Phone', Laptops: 'Laptop', Tablets: 'Tablet', Desktops: 'Desktop', Printers: 'Printer' };

/** One box: type to search the model list, pick a match — or just keep typing if yours isn't listed. */
export function ModelPicker({ invalid }: { invalid: boolean }) {
  const { s, set } = useStore();
  const [open, setOpen] = React.useState(false);
  const list = MODELS[s.cat] ?? [];
  const text = s.model.trim().toLowerCase();
  // Exact pick (same case) → show the whole list so they can switch; otherwise narrow to what they typed.
  const picked = list.includes(s.model);
  const hits = picked || !text ? list : list.filter(m => m.toLowerCase().includes(text));
  const type = (t: string) => { set({ model: t, modelOther: !!t.trim() && !isListedModel(s.cat, t) }); setOpen(true); };
  const pick = (m: string) => { set({ model: m, modelOther: false }); setOpen(false); };
  return (
    <View>
      <View>
        <Input invalid={invalid} value={s.model} onChangeText={type} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={`Type or choose your ${catNoun(s.cat)} model`} accessibilityLabel="Brand and model" autoCorrect={false} style={{ paddingRight: 28 }} />
        <Pressable onPress={() => setOpen(o => !o)} hitSlop={10} accessibilityLabel={open ? 'Hide models' : 'Show models'} style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.mute} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, marginTop: 6, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {hits.map(m => {
              const on = s.model === m;
              return (
                <Pressable key={m} onPress={() => pick(m)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: on ? C.primarySoft : pressed ? C.soft : '#fff' })}>
                  <T style={{ flex: 1, fontSize: 15, fontWeight: on ? '600' : '400', color: on ? C.primary : C.ink }}>{m}</T>
                  {on ? <Ionicons name="checkmark" size={18} color={C.primary} /> : null}
                </Pressable>
              );
            })}
            {!hits.length ? <Muted style={{ padding: 14 }}>Not in our list — we’ll use “{s.model.trim()}” as you typed it.</Muted> : null}
          </ScrollView>
        </View>
      ) : null}
      {!open ? <Muted style={{ fontSize: 12, marginTop: 4 }}>Not listed? Just type your brand and model.</Muted> : null}
    </View>
  );
}

/* ───────── C-04 Request a repair · Describe the problem (Figma step 1) ───────── */

export function NewRequest() {
  const { s, set, toast } = useStore();
  const [tried, setTried] = React.useState(false);
  // A draft (device, model, description, photos) belongs to the customer who started it. If there's no live
  // request and the draft was left by someone else (e.g. another phone on the same marketplace), start blank.
  React.useEffect(() => {
    const live = s.status >= JobStatus.Requested && s.status < JobStatus.Released && !s.cancelled;
    const finished = s.cancelled || s.status >= JobStatus.Released;
    if (!live && (s.draftOwner !== s.phone || finished)) {
      // The previous request is in the history (on the server); start a clean draft.
      set(p => ({ rid: null, jobId: null, apptId: null, warrantyId: null, payRef: null, payState: undefined, apiQuotes: [], sel: null, claim: null, dispute: null, reviewed: false, rating: 0, tags: [], reviewText: '',
        status: JobStatus.None, cancelled: false, owner: null, draftOwner: p.phone, model: '', modelOther: false, desc: '', photos: [], prefDate: '', prefTime: '', location: p.custAddress }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const photos = s.photos.filter(m => m.type === 'image'), videos = s.photos.filter(m => m.type === 'video');
  const { step1: e, step1Ok } = requestErrors(s);
  // One active repair at a time: finish (or cancel) the current one first.
  const busy = !!s.rid && s.status >= JobStatus.Requested && s.status < JobStatus.Released && !s.cancelled;
  if (busy) return (
    <Screen title="Request a repair">
      <Empty title="You have a repair in progress" sub={`${s.model} · ${shortRef(s.rid)}. You can request another one once it’s finished or cancelled.`} action="View it" onPress={() => router.replace(s.status <= JobStatus.Quoted ? '/waiting' : '/track')} />
    </Screen>
  );
  const show = (k: keyof typeof e) => (tried ? e[k] : null);
  const next = () => {
    if (!step1Ok) { setTried(true); toast('Please complete the fields marked in red'); return; }
    router.push('/request-details');
  };
  return (
    <Screen title="Request a repair" footer={<Btn title="Continue" onPress={next} />}>
      <Muted style={{ marginBottom: 12 }}>Step 1 of 3 · Tell us what’s wrong</Muted>
      <Field label="Device" required error={show('cat')}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LIVE_CATEGORIES.map(c => {
            const on = s.cat === c;
            return (
              <Pressable key={c} onPress={() => c !== s.cat && set({ cat: c, ...(isListedModel(c, s.model) ? {} : { model: '', modelOther: false }) })}
                accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c}
                style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? C.primary : C.line, backgroundColor: on ? C.primarySoft : '#fff', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                <CatTile cat={c} size={42} bg={on ? '#fff' : C.primarySoft} />
                <Text style={{ marginTop: 6, fontSize: 11, fontWeight: on ? '700' : '500', color: on ? C.primary : C.text }} numberOfLines={1}>{DEVICE_SHORT[c] ?? c}</Text>
                {on ? <View style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}><Ionicons name="checkmark" size={10} color="#fff" /></View> : null}
              </Pressable>
            );
          })}
        </View>
      </Field>
      <Field label="Brand / model" required error={show('model')}><ModelPicker key={s.cat} invalid={!!show('model')} /></Field>
      <Field label="Describe the problem" required error={show('desc')}>
        <Input invalid={!!show('desc')} value={s.desc} onChangeText={t => set({ desc: t })} multiline placeholder="What happened? What still works?" />
        {!show('desc') ? <Muted style={{ marginTop: 4 }}>{s.desc.trim().length < 20 ? `At least 20 characters · ${s.desc.trim().length}/20` : `${s.desc.trim().length} characters`}</Muted> : null}
      </Field>
      <Field label={`Photos / videos · ${photos.length}/5 photos, ${videos.length}/1 video`} required error={show('photos')}>
        <MediaGrid invalid={!!show('photos')} items={s.photos} max={6} onAdd={async () => {
          const m = await pickMedia({ limit: 6 - s.photos.length, allowVideo: videos.length === 0, videoMaxDuration: 30 });
          const nextP = [...photos, ...m.filter(x => x.type === 'image')].slice(0, 5), nextV = [...videos, ...m.filter(x => x.type === 'video')].slice(0, 1);
          set({ photos: [...nextP, ...nextV] });
        }} onRemove={i => set(p => ({ photos: p.photos.filter((_, j) => j !== i) }))} />
        {!show('photos') ? <Muted style={{ marginTop: 6 }}>At least one photo is required. Photos up to 10 MB, one video up to 50 MB. Tap ✕ to remove one.</Muted> : null}
      </Field>
      {photos.length < 5 ? <Demo text="no photo handy?" actions={[{ label: `Use a sample photo of a faulty ${catNoun(s.cat)}`, onPress: async () => { const m = await sampleMedia(repairPhoto(s.cat, 'broken'), `${({ Smartphones: 'phone', Tablets: 'ipad', Laptops: 'laptop', Desktops: 'desktop', Printers: 'printer' } as Record<string, string>)[s.cat] ?? 'phone'}_broken.jpg`); set(p => ({ photos: [m, ...p.photos] })); } }]} /> : null}
    </Screen>
  );
}

/* ───────── C-04b Location & appointment (Figma step 2) ───────── */

export function RequestDetails() {
  const { s, set, toast } = useStore();
  // Start from the address saved on the profile; the customer can change it for this repair.
  React.useEffect(() => { if (!s.location.trim() && s.custAddress) set({ location: s.custAddress }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tried, setTried] = React.useState(false);
  const { step2: e, step2Ok } = requestErrors(s);
  const next = () => {
    if (!step2Ok) { setTried(true); toast('Please complete the fields marked in red'); return; }
    router.push('/review-request');
  };
  return (
    <Screen title="Request a repair" footer={<Btn title="Continue" onPress={next} />}>
      <Muted style={{ marginBottom: 12 }}>Step 2 of 3 · Where’s the repair needed?</Muted>
      <Field label="📍 Current location" required error={tried && e.location}><Input invalid={tried && !!e.location} value={s.location} onChangeText={t => set({ location: t })} placeholder="Street, area, city" /></Field>
      <Field label="📅 Preferred date" required error={tried && e.date}><ChoiceOrType options={DATES} value={s.prefDate} invalid={tried && !!e.date} onChange={d => set({ prefDate: d, date: d })} placeholder="Type a date, e.g. Wed 14 Oct" hint="Technicians see the date exactly as you type it." /></Field>
      <Field label="🕘 Preferred time" required error={tried && e.time}><ChoiceOrType options={TIME_WINDOWS} value={s.prefTime} invalid={tried && !!e.time} onChange={t => set({ prefTime: t })} placeholder="Type a time, e.g. 3:30 PM or after 5 PM" /></Field>
      <Field label="Service preference" required>
        <Opt label="Visit the workshop" sub="Drop your device off · free" on={s.mode === 'shop'} onPress={() => set({ mode: 'shop' })} />
        <Opt label="Home service" sub="Technician comes to you · included in their quote" on={s.mode === 'home'} onPress={() => set({ mode: 'home' })} />
      </Field>
    </Screen>
  );
}

/* ───────── C-04c Review request (Figma step 3) ───────── */

export function ReviewRequest() {
  const { s, set, get, notify, toast, run, busy } = useStore();
  const [ok, setOk] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const v = requestErrors(s);
  const submit = async () => {
    if (!v.step1Ok) { toast('Some repair details are missing'); return router.push('/new-request'); }
    if (!v.step2Ok) { toast('Location or time is missing'); return router.push('/request-details'); }
    if (!ok) { setTried(true); return; }
    set({ owner: { name: s.fullName, phone: s.phone, photo: s.custPhoto }, draftOwner: s.phone, refund: 0, sel: null, parts: false, partsUsed: false, dispute: null, claim: null, reviewed: false, replied: false, rating: 0,
      checks: [false, false, false], cancelled: false, rescheduled: 0, progressPhotos: [], queue: [], date: s.prefDate, time: s.prefTime, quoted: false, quotesIn: 0, jobLog: [],
      qBy: null, qNote: '', claimIssue: '', claimDesc: '', claimMedia: [] });
    if (!(await run(() => backend.submitRequest(get, set)))) return;
    askNotifications(); // “Get notified when quotes arrive” — the natural moment to ask
    notify('Request sent', `Verified ${catNoun(s.cat)} technicians have been notified.`, '/waiting');
    if (router.canDismiss()) router.dismissAll(); router.push('/waiting');
  };
  const images = s.photos.slice(0, 3);
  return (
    <Screen title="Review request" footer={<Btn title={busy ? 'Sending…' : 'Submit Request'} disabled={busy} onPress={submit} />}>
      <Muted style={{ marginBottom: 12 }}>Kindly review your details before submitting your repair request</Muted>
      <Card tone="soft">
        <Row><Bold>Repair details</Bold><Chip tone="blue" label="Electronics" /></Row>
        <Row style={{ marginTop: 8 }}><T style={{ fontSize: 14, fontWeight: '600' }}>{s.cat} · {s.model}</T><EditLink to="/new-request" what="repair details" /></Row>
        <Muted>{s.desc}</Muted>
        {images.length ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>{images.map((m, i) => <Thumb key={i} m={m} />)}</View>
          : <Muted style={{ marginTop: 6, color: C.bad }}>⚠︎ At least one photo is required</Muted>}
      </Card>
      <Card tone="soft"><Row><View style={{ flex: 1 }}><Muted>📍 Location</Muted><T style={{ fontSize: 14 }}>{s.location}</T></View><EditLink to="/request-details" what="location" /></Row></Card>
      <Card tone="soft"><Row><View><Muted>📅 Preferred date & time</Muted><T style={{ fontSize: 14 }}>{s.prefDate} · {s.prefTime}</T></View><EditLink to="/request-details" what="date and time" /></Row></Card>
      <Card tone="soft"><Row><View><Muted>Service preference</Muted><T style={{ fontSize: 14 }}>{s.mode === 'home' ? 'Home service' : 'Visit the workshop'}</T></View><EditLink to="/request-details" what="service preference" /></Row></Card>
      <Opt check on={ok} onPress={() => setOk(!ok)} label="Technicians will review your request and send quotation." />
      {tried && !ok ? <Text style={{ color: C.bad, fontSize: 13, marginTop: -2, marginBottom: 8 }}>⚠︎ Please tick the box to confirm</Text> : null}
      <Muted>You only pay after you choose a quote. Your payment is held safely until you confirm the repair.</Muted>
    </Screen>
  );
}

/* ───────── C-05 Waiting for quotes ───────── */
