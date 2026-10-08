// Technician profile tab, services & coverage, reviews.
import { router } from 'expo-router';
import React from 'react';
import { Alert, View, Pressable, StyleSheet, Switch, Text, ScrollView, Animated } from 'react-native';
import { Avatar, Bar, Bold, Btn, C, Card, Chip, IconTile, Muted, Row, Screen, T, Input, FadeIn, Chips, Empty, Stars } from '../../shared/components/ui';
import { techStats, maskAcct, plural, SERVICES, LAGOS_AREAS, myDoneJobs, shortDate } from '../../shared/core/data';
import * as backend from '../../shared/core/backend';
import { useStore } from '../../shared/core/store';
import { useLogout } from '../auth/login';
import { OfflineStrip, areaSummary } from './common';

/** One row of the profile menu. */
const MenuRow = ({ icon, label, sub, onPress }: { icon: string; label: string; sub?: string; onPress: () => void }) => (
  <Card onPress={onPress} style={{ paddingVertical: 12 }}><Row style={{ gap: 8 }}><Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}><IconTile glyph={icon} size={38} /><View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '600' }}>{label}</T>{sub ? <T style={{ fontSize: 12, color: C.mute }} numberOfLines={1}>{sub}</T> : null}</View></Row><T style={{ color: C.mute }}>›</T></Row></Card>
);

export function Me() {
  const { s } = useStore();
  const logout = useLogout();
  return (
    <Screen title="Profile" back={false}>
      <OfflineStrip showToggle />
      <Row style={{ justifyContent: 'flex-start', gap: 14, marginBottom: 12 }}><Avatar label={s.techName} size={64} verified={s.techVerif === 'verified'} /><View style={{ flex: 1 }}><Bold style={{ fontSize: 18 }}>{s.techName}</Bold><Muted>Electronics technician{s.areas[0] ? ` · ${s.areas[0]}` : ''}</Muted><View style={{ marginTop: 6 }}><Bar pct={85} /></View><Muted style={{ fontSize: 12, marginTop: 2 }}>Profile 85% complete</Muted></View></Row>
      <MenuRow icon="🛠" label="Services & coverage" sub={`${plural(s.skills.length + (s.extraServices ?? []).length, 'service')} · ${areaSummary(s.areas ?? [])}`} onPress={() => router.push('/services')} />
      <MenuRow icon="⭐" label="Reviews" sub={techStats(s).reviews ? `${techStats(s).rating.toFixed(1)} · ${plural(techStats(s).reviews, 'review')}` : 'No reviews yet'} onPress={() => router.push('/reviews')} />
      <MenuRow icon="🛡" label="Verification" sub={s.techVerif === 'verified' ? 'Verified' : s.techVerif === 'rejected' ? 'Action needed' : 'In review'} onPress={() => router.push('/verification')} />
      <MenuRow icon="🏦" label="Payout account" sub={s.payoutAccount ? `${s.payoutAccount.bank} ${maskAcct(s.payoutAccount.number)}` : 'Not set up'} onPress={() => router.push('/payout-account')} />
      <MenuRow icon="🧾" label="Warranty claims" sub="Customers’ claims on your repairs" onPress={() => router.push('/tech-claim')} />
      <MenuRow icon="🔑" label="Change password" onPress={() => router.push('/new-password')} />
      <Card tone="dash" style={{ paddingVertical: 12 }}><Row><Row style={{ justifyContent: 'flex-start', gap: 12 }}><IconTile glyph="🗓" size={38} bg={C.soft} /><T style={{ fontSize: 15, color: C.mute }}>Availability calendar</T></Row><Chip tone="off" label="Coming soon" /></Row></Card>
      <Btn title="Log out" variant="ghost" onPress={() => Alert.alert('Log out of RepairHub?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
    </Screen>
  );
}

export function ServicesCoverage() {
  const { s, set, get, run, busy } = useStore();
  const [skills, setSkills] = React.useState<string[]>(s.skills);
  const [extra, setExtra] = React.useState<string[]>(s.extraServices ?? []);
  const [areas, setAreas] = React.useState<string[]>(s.areas ?? []);
  const [q, setQ] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const on = (k: string, cat?: string) => (cat ? skills.includes(cat) : extra.includes(k));
  const toggle = (k: string, cat?: string) => cat ? setSkills(v => v.includes(cat) ? v.filter(x => x !== cat) : [...v, cat]) : setExtra(v => v.includes(k) ? v.filter(x => x !== k) : [...v, k]);
  const suggestions = q.trim() ? LAGOS_AREAS.filter(a => a.toLowerCase().includes(q.toLowerCase()) && !areas.includes(a)).slice(0, 5) : [];
  const addArea = (a: string) => { const v = a.trim(); if (v.length >= 3 && !areas.includes(v)) setAreas([...areas, v]); setQ(''); };
  const save = async () => {
    if (!skills.length || !areas.length) { setTried(true); return; }
    set({ extraServices: extra });
    if (await run(() => backend.saveTechProfile(get, set, { skills, areas }), 'Services & coverage saved')) router.back();
  };
  return (
    <Screen title="Services & Coverage" footer={<Btn title={busy ? 'Saving…' : 'Save changes'} disabled={busy} onPress={save} />}>
      <Bold style={{ fontSize: 16 }}>Services you offer</Bold>
      <Muted style={{ marginBottom: 10 }}>Select the services you provide. These will be shown to customers.</Muted>
      {tried && !skills.length ? <Text style={{ color: C.bad, marginBottom: 6 }}>⚠︎ Turn on at least one repair service</Text> : null}
      <Card style={{ padding: 0 }}>
        {SERVICES.map((sv, i) => (
          <Row key={sv.key} style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: C.line }}>
            <Pressable onPress={() => toggle(sv.key, sv.cat)} accessibilityRole="button" accessibilityLabel={`${sv.title}, ${on(sv.key, sv.cat) ? 'on' : 'off'}`} style={{ flex: 1 }}><Row style={{ justifyContent: 'flex-start', gap: 12 }}><IconTile glyph={sv.icon} size={36} /><View style={{ flex: 1 }}><T style={{ fontSize: 14, fontWeight: '600' }}>{sv.title}</T><Muted style={{ fontSize: 12 }}>{sv.sub}</Muted></View></Row></Pressable>
            <Switch value={on(sv.key, sv.cat)} onValueChange={() => toggle(sv.key, sv.cat)} trackColor={{ true: C.primary, false: C.input }} thumbColor="#fff" {...({ activeThumbColor: "#fff" } as object)} accessibilityLabel={sv.title} />
          </Row>
        ))}
      </Card>
      <Bold style={{ fontSize: 16, marginTop: 16 }}>Service coverage</Bold>
      <Muted style={{ marginBottom: 10 }}>Select the areas where you provide services.</Muted>
      <Input icon="⌕" value={q} onChangeText={setQ} placeholder="Search for an area…" onSubmitEditing={() => addArea(q)} returnKeyType="done" invalid={tried && !areas.length} />
      {suggestions.length ? <Card style={{ padding: 4, marginTop: 6 }}>{suggestions.map(a => <Pressable key={a} onPress={() => addArea(a)} style={{ padding: 10 }}><T style={{ fontSize: 14 }}>📍 {a}</T></Pressable>)}</Card> : null}
      {tried && !areas.length ? <Text style={{ color: C.bad, marginTop: 6 }}>⚠︎ Add at least one area</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {areas.map(a => (
          <Pressable key={a} onPress={() => setAreas(areas.filter(x => x !== a))} accessibilityRole="button" accessibilityLabel={`Remove ${a}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.primaryLine, backgroundColor: C.primarySoft, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>{a}</Text><Text style={{ color: C.primary, fontSize: 12 }}>✕</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => addArea(q)} disabled={q.trim().length < 3} style={{ marginTop: 12, backgroundColor: C.primarySoft, borderRadius: 8, paddingVertical: 12, alignItems: 'center', opacity: q.trim().length < 3 ? 0.6 : 1 }} accessibilityRole="button">
        <Text style={{ color: C.primary, fontWeight: '600' }}>＋ Add service area</Text>
      </Pressable>
    </Screen>
  );
}

/* ───────── T-09 Earnings / digital wallet (Figma) ───────── */

export const PAST_REVIEWS = [
  { name: 'Tolu A.', r: 5, text: 'Fixed my HP charging port the same day and showed me the old part.', date: '28 Sep', job: 'HP laptop charging port', tags: ['On time', 'Explained the fix'], reply: '' },
  { name: 'Ifeanyi O.', r: 4, text: 'Good work. Arrived 30 minutes late but kept me updated.', date: '24 Sep', job: 'iPhone 11 screen', tags: ['Neat work'], reply: 'Thanks! Traffic on Third Mainland, sorry about that.' },
  { name: 'Zainab Y.', r: 5, text: 'Very professional. My Galaxy Tab charges perfectly now.', date: '20 Sep', job: 'Galaxy Tab charging port', tags: ['Professional', 'Fair price'], reply: 'Glad it’s working, Zainab!' },
  { name: 'Samuel D.', r: 5, text: 'Honest price and he came with the right part.', date: '18 Sep', job: 'iPhone 13 battery', tags: ['Fair price'], reply: '' },
  { name: 'Bola F.', r: 3, text: 'Repair was fine but it took a day longer than quoted.', date: '11 Sep', job: 'Dell Inspiron hinge', tags: [], reply: 'Sorry for the delay, the hinge part came in late. Thanks for your patience.' },
];

export const DIST: [number, number][] = [[5, 56], [4, 6], [3, 2], [2, 1], [1, 0]];

export function Reviews() {
  const { s } = useStore();
  const [filter, setFilter] = React.useState<'all' | '5' | '4' | 'low'>('all');
  // Customers' reviews of this technician's finished jobs (from the API).
  const all = myDoneJobs(s).filter(j => j.rating > 0).map(j => ({ name: j.cust, r: j.rating, text: j.reviewText ?? '', date: shortDate(j.at), job: j.dev, tags: j.tags ?? [], live: false }));
  const total = all.length, dist = DIST.map(([st]) => [st, all.filter(r => r.r === st).length] as [number, number]);
  if (!total) return <Screen title="My reviews"><Empty title="No reviews yet" sub="Reviews from customers appear here after you complete jobs. You can reply once to each." /></Screen>;
  const avg = (dist.reduce((t, [st, n]) => t + st * n, 0) / total).toFixed(1);
  const list = all.filter(r => filter === 'all' || (filter === '5' && r.r === 5) || (filter === '4' && r.r === 4) || (filter === 'low' && r.r <= 3));
  return (
    <Screen title="My reviews">
      <Card tone="blue">
        <Row style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', width: 96 }}>
            <T style={{ fontSize: 40, fontWeight: '800', lineHeight: 46 }}>{avg}</T>
            <Stars value={Math.round(Number(avg))} size={14} />
            <Muted style={{ fontSize: 12, marginTop: 2 }}>{plural(total, 'review')}</Muted>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {dist.map(([st, n], i) => (
              <Row key={st} style={{ gap: 8 }}>
                <Text style={{ width: 22, fontSize: 12, color: C.text }}>{st}★</Text>
                <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: '#DCE6FB', overflow: 'hidden' }}><GrowBar pct={(n / total) * 100} delay={i * 80} /></View>
                <Text style={{ width: 24, fontSize: 12, color: C.mute, textAlign: 'right' }}>{n}</Text>
              </Row>
            ))}
          </View>
        </Row>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 6 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {([['all', 'All'], ['5', '5★'], ['4', '4★'], ['low', '3★ & below']] as const).map(([k, l]) => <Chip key={k} label={l} tone={filter === k ? 'on' : undefined} onPress={() => setFilter(k)} />)}
      </ScrollView>
      {!list.length ? <Empty title="No reviews here" sub="Try another filter." /> : list.map((r, i) => (
        <FadeIn key={`${r.name}-${r.date}-${r.job}-${i}`} delay={i * 50}>
          <Card tone={r.live ? 'strong' : undefined}>
            <Row style={{ alignItems: 'flex-start', gap: 10 }}>
              <Avatar label={r.name} size={38} />
              <View style={{ flex: 1 }}>
                <Row><Bold style={{ fontSize: 14 }}>{r.name}</Bold><Muted style={{ fontSize: 12 }}>{r.date}</Muted></Row>
                <Row style={{ justifyContent: 'flex-start', gap: 6, marginTop: 2 }}><Stars value={r.r} size={13} /><Muted style={{ fontSize: 12 }}>· {r.job}</Muted></Row>
              </View>
            </Row>
            {r.text ? <T style={{ fontSize: 14, color: C.text, marginTop: 8 }}>{r.text}</T> : <Muted style={{ marginTop: 8 }}>Rated without a written review.</Muted>}
            {r.tags.length ? <Chips>{r.tags.map(t => <Chip key={t} tone="blue" label={t} />)}</Chips> : null}
          </Card>
        </FadeIn>
      ))}
      {total > 1 ? <Muted style={{ textAlign: 'center', marginTop: 4 }}>{list.length >= total ? `Showing all ${total} reviews` : `Showing the ${list.length} most recent of ${total} reviews`}</Muted> : null}
    </Screen>
  );
}

/** Horizontal bar that grows to its width on mount (review distribution). */
export function GrowBar({ pct, delay }: { pct: number; delay: number }) {
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => { Animated.timing(a, { toValue: pct, duration: 600, delay, useNativeDriver: false }).start(); }, [a, pct, delay]);
  return <Animated.View style={{ height: '100%', borderRadius: 4, backgroundColor: C.star, width: a.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />;
}

/* ───────── Technician notifications ───────── */
