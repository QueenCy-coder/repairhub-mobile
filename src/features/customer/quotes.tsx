// Waiting for quotes, comparing quotes, technician profiles.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Text, View, Pressable, ScrollView } from 'react-native';
import { FadeIn, Btn, C, Card, Countdown, KV, Muted, Pulse, Screen, Title, Avatar, Bold, Btns, Chip, Chips, Rating, Row, T, Banner, Empty, CatTile, H4 } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { kmLabel } from '../../shared/core/geo';
import { first, JobStatus, plural, quotes, N, selectedQuote, Sort, CERT_IMG, RECENT_WORK, repairPhoto, techProfile, serviceOf, agoLabel } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { Viewer, catNoun } from './common';


/** Cancel an open (not yet booked) request. Technicians who quoted are told; nothing was paid yet. */
export function CancelRequest() {
  const { s, set, get, run } = useStore();
  return <Btn title="Cancel request" variant="ghost" onPress={() => Alert.alert(`Cancel request ${shortRef(s.rid)}?`, 'Technicians who quoted will be told.', [
    { text: 'Keep request', style: 'cancel' },
    { text: 'Cancel request', style: 'destructive', onPress: async () => {
      if (await run(() => backend.cancelRequest(get, set), 'Request cancelled')) router.replace('/home');
    } },
  ])} />;
}

export function Waiting() {
  const { s } = useStore();
  const got = s.status >= JobStatus.Quoted ? quotes(s) : [];
  const ref = shortRef(s.rid);
  if (!s.rid || s.cancelled) return <Screen title="Request"><Empty title={s.cancelled ? 'This request was cancelled' : 'No open request'} sub="Request a repair and technicians will send you quotes." action="Request a repair" onPress={() => router.replace('/new-request')} /></Screen>;
  return (
    <Screen title={`Request ${ref}`} footer={got.length ? <Btn title={`Compare ${plural(got.length, 'quote')} →`} onPress={() => router.replace('/compare')} /> : undefined}>
      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
          <Pulse size={120} color={C.primary} /><View style={{ position: 'absolute' }}><Pulse size={80} color={C.primary} /></View>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: got.length ? C.okBg : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 40 }}>{got.length ? '✅' : '📡'}</Text></View>
        </View>
        <Title style={{ marginTop: 6, fontSize: 19 }}>{got.length ? `${plural(got.length, 'quote')} received` : 'Finding technicians…'}</Title>
        <Muted style={{ textAlign: 'center' }}>{got.length ? 'More may come in. Compare price, rating and warranty, then pick one.' : `Verified ${catNoun(s.cat)} technicians have been notified. You’ll get a notification when the first quote arrives.`}</Muted>
      </View>
      {got.map(q => <FadeIn key={q.id}><QuoteCard q={q} best={bestOf(got)} locked={s.status >= JobStatus.Accepted} /></FadeIn>)}
      <Card><KV k="Device" v={s.model} /><KV k="Preferred" v={`${s.prefDate} · ${s.prefTime}`} /><KV k="Service" v={s.mode === 'home' ? 'Home service' : 'Workshop visit'} /><KV k="Posted" v={agoLabel(s.requestAt)} /></Card>
      {s.status < JobStatus.Accepted && !s.jobId ? <CancelRequest /> : null}
    </Screen>
  );
}

/** One technician's quote: price, rating, time, warranty, badges, breakdown, note, and View / Select. */
export function QuoteCard({ q, best, locked }: { q: ReturnType<typeof quotes>[number]; best: { mT: number; mR: number; mD: number }; locked?: boolean }) {
  const { s, set } = useStore();
  return (
    <Card tone={locked && q.id === s.sel ? 'selected' : undefined}>
      <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
        <Avatar label={q.name} size={48} verified />
        <View style={{ flex: 1 }}>
          <Row><Bold>{q.name}</Bold><T style={{ fontSize: 19, fontWeight: '800' }}>{N(q.total)}</T></Row>
          <Rating r={q.rating} extra={[q.jobs ? plural(q.jobs, 'job') : '', Number.isFinite(q.km) ? `${kmLabel(q.km)} away` : q.areas?.length ? q.areas.slice(0, 2).join(', ') : ''].filter(Boolean).map(x => `· ${x}`).join(' ')} />
        </View>
      </Row>
      <Muted style={{ marginTop: 8, fontSize: 13 }}>⏱ Ready in {plural(q.days, 'day')}   ·   🛡 {plural(q.warr, 'month')} warranty</Muted>
      <Chips>{q.total === best.mT ? <Chip tone="blue" label="Lowest price" /> : null}{q.jobs >= 5 && q.rating === best.mR ? <Chip tone="ok" label="Top rated" /> : null}{q.days === best.mD ? <Chip tone="warn" label="Fastest" /> : null}<Chip label={`Labour ${N(q.labour)} · Parts ${N(q.parts)}`} /></Chips>
      {q.note ? <Muted>“{q.note}”</Muted> : null}
      {!locked ? <>
        {q.expiresAt ? (q.expiresAt - Date.now() > 48 * 36e5
          ? <Muted style={{ marginTop: 6, fontSize: 12 }}>Quote valid for {plural(Math.floor((q.expiresAt - Date.now()) / 864e5), 'more day')}</Muted>
          : <Muted style={{ marginTop: 6, fontSize: 12 }}>Quote expires in <Countdown until={q.expiresAt} style={{ fontSize: 12 }} /></Muted>) : null}
        <Btns>
          <Btn small title="View" variant="sec" onPress={() => { set({ profile: q.name }); router.push({ pathname: '/tech-profile', params: { name: q.name } }); }} />
          <Btn small title={s.jobId && s.sel === q.id ? 'Pay' : 'Select'} disabled={!!s.jobId && s.sel !== q.id} onPress={() => { set({ sel: q.id, profile: q.name }); router.push(s.jobId ? '/pay' : '/book'); }} />
        </Btns>
      </> : null}
    </Card>
  );
}

/** Badges only make sense when there's something to compare: 2+ quotes, a real rating, and a unique winner. */
export const bestOf = (qs: ReturnType<typeof quotes>) => {
  if (qs.length < 2) return { mT: NaN, mR: NaN, mD: NaN };
  const only = (vals: number[], v: number) => vals.filter(x => x === v).length === 1 ? v : NaN;
  // "Top rated" needs a track record: a 5.0 from one review shouldn't beat 4.5 from a hundred jobs.
  const t = qs.map(q => q.total), r = qs.map(q => (q.jobs >= 5 ? q.rating : 0)), d = qs.map(q => q.days);
  const mR = Math.max(...r);
  return { mT: only(t, Math.min(...t)), mR: mR > 0 ? only(r, mR) : NaN, mD: only(d, Math.min(...d)) };
};

/* ───────── C-06 Repair quotations (Figma, + price per FR-9) ───────── */

export function Compare() {
  const { s, set } = useStore();
  if (s.status < JobStatus.Quoted) return <Screen title="Repair quotations"><Empty title="No quotes yet" sub="You’ll get a notification when a technician sends one." action="Back to request" onPress={() => router.replace('/waiting')} /></Screen>;
  const qs = quotes(s);
  const by: Record<Sort, (a: typeof qs[0], b: typeof qs[0]) => number> = { price: (a, b) => a.total - b.total, rated: (a, b) => b.rating - a.rating, fast: (a, b) => a.days - b.days, near: (a, b) => b.warr - a.warr };
  const { mT, mR, mD } = bestOf(qs);
  const locked = s.status >= JobStatus.Accepted;
  return (
    <Screen title="Repair quotations">
      <Muted>{plural(qs.length, 'technician')} responded · {s.model}</Muted>
      <Chips>{([['price', 'Lowest price'], ['rated', 'Highest rated'], ['fast', 'Fastest'], ['near', 'Longest warranty']] as [Sort, string][]).map(([k, l]) => <Chip key={k} label={l} tone={s.sort === k ? 'on' : undefined} onPress={() => set({ sort: k })} />)}</Chips>
      <Muted style={{ fontSize: 12, marginBottom: 6 }}>{({ price: 'Sorted by total price, lowest first', rated: 'Sorted by customer rating, highest first', fast: 'Sorted by repair time, quickest first', near: 'Sorted by warranty, longest first' } as Record<Sort, string>)[s.sort]}</Muted>
      {locked ? <Banner tone="ok" icon="✓">{`You booked ${selectedQuote(s).name}. The others were told they weren't selected.`}</Banner> : s.jobId ? <Banner tone="blue" icon="ℹ︎">{`You chose ${selectedQuote(s).name}. Finish paying to confirm the booking.`}</Banner> : null}
      {[...qs].sort(by[s.sort]).map(q => (
        <FadeIn key={q.id}><QuoteCard q={q} best={{ mT, mR, mD }} locked={locked} /></FadeIn>
      ))}
      {s.status < JobStatus.Accepted && !s.jobId ? <CancelRequest /> : null}
    </Screen>
  );
}

/* ───────── C-07 Book technician (Figma) ───────── */

export function TechProfile() {
  const { s, set } = useStore();
  // The name comes with the link, so a sync update arriving at the same moment can't swap the profile.
  const { name } = useLocalSearchParams<{ name?: string }>();
  const n = name || s.profile, t = techProfile(s, n);
  const q = quotes(s).find(x => x.name === n);
  const canBook = !!q && s.status === JobStatus.Quoted && (!s.jobId || s.sel === q.id);
  const [view, setView] = React.useState<null | { items: { src: number | { uri: string }; caption: string }[]; i: number }>(null);
  const certs = t.certs.map(c => ({ c, src: CERT_IMG[c] }));
  // Registered technicians show their real finished jobs (customer's photo before, their completion photo after);
  // the sample technicians show sample work.
  type Work = { k: string; cat: string; title: string; when: string; warr: number; before?: string; after?: string };
  const works: Work[] = t.registered
    ? t.done.slice(0, 6).map(j => ({ k: String(j.at), cat: j.cat, title: `${j.dev} · ${serviceOf(j.service ?? '', j.cat)}`, when: agoLabel(j.at), warr: j.warr ?? 0, before: j.before, after: j.after }))
    : t.isNew ? [] : t.skills.filter(k => RECENT_WORK[k]).map(k => ({ k, cat: k, ...RECENT_WORK[k], warr: 3 }));
  const pic = (w: Work, kind: 'broken' | 'fixed') => { const u = kind === 'broken' ? w.before : w.after; return u ? { uri: u } : repairPhoto(w.cat, kind); };
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const joined = t.joined ? `${months[new Date(t.joined).getMonth()]} ${new Date(t.joined).getFullYear()}` : 'New';
  const stats: [React.ComponentProps<typeof Ionicons>['name'], string, string][] = [
    t.registered ? ['calendar-outline', joined, 'Joined RepairHub'] : ['briefcase-outline', t.isNew ? 'New' : `${t.years}+`, t.isNew ? 'On RepairHub' : 'Years experience'],
    ['checkmark-done-outline', t.registered || t.isNew ? String(t.jobs) : `${t.jobs}+`, 'Jobs completed'],
    ['shield-checkmark-outline', q ? plural(q.warr, 'month') : '3 months', 'Warranty'],
  ];
  return (
    <Screen pad={false} footer={canBook
      ? <Btn title={`Book ${first(n)} · ${N(q!.total)}`} onPress={() => { set({ sel: q!.id }); router.push(s.jobId ? '/pay' : '/book'); }} />
      : <Btn title="Request a repair" onPress={() => router.push('/new-request')} />}>
      <View style={{ backgroundColor: C.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 56 }}>
        <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Technician Profile</Text>
        </Row>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: -44 }}>
        <Row style={{ alignItems: 'flex-end' }}><View style={{ borderWidth: 4, borderColor: '#fff', borderRadius: 48 }}><Avatar label={n} size={84} verified /></View>{t.resp ? <Chip tone="ok" label={`● Online · replies ${t.resp}`} /> : <Chip tone="ok" label="✓ Verified by RepairHub" />}</Row>
        <Title style={{ marginTop: 8, marginBottom: 2 }}>{n}</Title>
        <Muted>{t.title}</Muted>
        <Rating r={t.r} extra={`${t.reviews ? `(${plural(t.reviews, 'review')})` : '· no reviews yet'}${Number.isFinite(q?.km ?? NaN) ? ` · ${kmLabel(q!.km)} away` : Number.isFinite(t.km) ? ` · ${t.km} km away` : ''}`} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {stats.map(([icon, v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: C.primarySoft, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 2 }}>
              <Ionicons name={icon} size={20} color={C.primary} />
              <Bold style={{ fontSize: 17 }}>{v}</Bold>
              <Muted style={{ fontSize: 11 }}>{l}</Muted>
            </View>
          ))}
        </View>
        {q ? <Card tone="blue" style={{ marginTop: 14 }}><Row><View><Muted>Quote for {shortRef(s.rid)}</Muted><Bold style={{ fontSize: 20 }}>{N(q.total)}</Bold></View><View style={{ alignItems: 'flex-end' }}><Muted>{plural(q.days, 'day')} · {plural(q.warr, 'month')} warranty</Muted><Muted>Labour {N(q.labour)} · Parts {N(q.parts)}</Muted></View></Row></Card> : null}

        <H4>Service categories</H4>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{t.skills.map(k => <View key={k} style={{ alignItems: 'center', gap: 4 }}><CatTile cat={k} /><Muted style={{ fontSize: 12 }}>{k}</Muted></View>)}</View>

        <H4 right={<Row style={{ gap: 4 }}><Ionicons name="shield-checkmark" size={14} color={C.ok} /><Text style={{ fontSize: 12, color: C.ok, fontWeight: '600' }}>Checked by RepairHub</Text></Row>}>Certifications</H4>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {certs.map(({ c, src }, i) => (
            <Pressable key={c} onPress={() => src && setView({ items: certs.filter(x => x.src).map(x => ({ src: x.src!, caption: `${x.c} · ${n}` })), i: certs.filter(x => x.src).findIndex(x => x.c === c) })}
              accessibilityRole={src ? 'imagebutton' : undefined} accessibilityLabel={`Certificate: ${c}`}
              style={{ width: 210, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
              {src ? <Image source={src} style={{ width: 210, height: 147 }} contentFit="cover" /> : <View style={{ height: 147, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="id-card-outline" size={40} color={C.mute} /></View>}
              <View style={{ padding: 10 }}>
                <T style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={2}>{c}</T>
                <Row style={{ justifyContent: 'flex-start', gap: 4, marginTop: 4 }}><Ionicons name="checkmark-circle" size={14} color={C.ok} /><Text style={{ fontSize: 12, color: C.ok }}>Verified</Text></Row>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {works.length ? <>
          <H4>Recent works</H4>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {works.map(w => (
              <Pressable key={w.k} onPress={() => setView({ items: [{ src: pic(w, 'broken'), caption: `Before · ${w.title}` }, { src: pic(w, 'fixed'), caption: `After · ${w.title}` }], i: 1 })}
                accessibilityRole="imagebutton" accessibilityLabel={`${w.title}, before and after photos`}
                style={{ width: 230, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
                <View style={{ flexDirection: 'row', height: 120 }}>
                  {(['broken', 'fixed'] as const).map(k => (
                    <View key={k} style={{ flex: 1 }}>
                      <Pressable onPress={() => setView({ items: [{ src: pic(w, 'broken'), caption: `Before · ${w.title}` }, { src: pic(w, 'fixed'), caption: `After · ${w.title}` }], i: k === 'broken' ? 0 : 1 })} style={{ flex: 1 }}>
                        <Image source={pic(w, k)} style={{ flex: 1 }} contentFit="cover" />
                      </Pressable>
                      <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: k === 'broken' ? '#000000aa' : C.ok, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{k === 'broken' ? 'Before' : 'After'}</Text></View>
                    </View>
                  ))}
                </View>
                <View style={{ padding: 10 }}><T style={{ fontSize: 13, fontWeight: '600' }}>{w.title}</T><Muted style={{ fontSize: 12 }}>{w.when}{w.warr ? ` · ${plural(w.warr, 'month')} warranty` : ''}</Muted></View>
              </Pressable>
            ))}
          </ScrollView>
        </> : null}

        <H4>About</H4><T style={{ fontSize: 14, color: C.text }}>{t.about}</T>
        {t.areas.length ? <Row style={{ justifyContent: 'flex-start', gap: 6, marginTop: 8, marginBottom: 24 }}><Ionicons name="location-outline" size={15} color={C.mute} /><Muted>Serves {t.areas.join(', ')}</Muted></Row> : <View style={{ height: 24 }} />}
      </View>
      <Viewer items={view?.items ?? []} index={view ? view.i : null} onClose={() => setView(null)} />
    </Screen>
  );
}
