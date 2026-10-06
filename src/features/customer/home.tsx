// Customer home: active repair card, categories, quick requests, search.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Logo } from '../../shared/components/logo';
import { Avatar, IconBox, FadeIn, Bold, C, Card, Chip, H4, Link, Muted, Row, Screen, T, Title, CatTile, Thumb, Banner, Chips, Empty, Input, Rating } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { devicePhoto, HOME_GROUPS, isListedModel, first, JobStatus, POPULAR, N, plural, quotes, selectedQuote, statusLabel, notesFor } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { activeRoute, catNoun } from './common';

export function Home() {
  const { s, set, toast } = useStore();
  const active = !!s.rid && s.status >= JobStatus.Requested && s.status < JobStatus.Released;
  const unread = notesFor(s, 'customer').filter(n => !n.read).length;
  const [group, setGroup] = React.useState('All');
  const tiles = POPULAR.filter(p => group === 'All' || p.group === group);
  const start = (cat: string, model?: string, desc?: string) => {
    // A different category starts a clean description, so a phone request never carries laptop details.
    // After a finished or cancelled repair, the next request starts blank (no old model, photos, date or time).
    // An open request (yours or another customer's) is never edited from here.
    if (s.rid && s.status >= JobStatus.Requested && s.status < JobStatus.Released && !s.cancelled) {
      toast('You already have an open repair request'); router.push(activeRoute(s.status) as never);
      return;
    }
    const done = s.status >= JobStatus.Released || s.cancelled;
    const blank = { model: '', modelOther: false, desc: '', photos: [], prefDate: '', prefTime: '' };
    const fresh = done ? { rid: null, jobId: null, apptId: null, warrantyId: null, payRef: null, apiQuotes: [], sel: null, claim: null, dispute: null, reviewed: false, rating: 0, status: JobStatus.None, cancelled: false, owner: null } : {};
    set(model ? { ...fresh, cat, model, modelOther: !isListedModel(cat, model), desc: desc ?? '', draftOwner: s.phone } : done ? { ...fresh, cat, ...blank, draftOwner: s.phone } : cat === s.cat ? { cat } : { cat, model: '', modelOther: false, desc: '', photos: [] });
    router.push('/new-request');
  };
  return (
    <Screen>
      <Row style={{ marginBottom: 12 }}>
        <Logo size={20} />
        <Pressable onPress={() => router.push('/alerts')} accessibilityLabel={`Notifications, ${unread} new`} hitSlop={10}>
          <Ionicons name="notifications-outline" size={26} color={C.ink} />{unread ? <View style={{ position: 'absolute', right: 0, top: 0, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: C.bad, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
      </Row>
      <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Your profile"><Avatar label={s.fullName} uri={s.custPhoto} size={44} /></Pressable>
        <View style={{ flex: 1 }}><Title style={{ fontSize: 20, marginBottom: 0 }}>Hi, {first(s.fullName)} 👋</Title><Muted>What needs fixing today?</Muted></View>
      </Row>
      <Pressable onPress={() => router.push('/search')} style={{ marginTop: 14, borderRadius: 24, backgroundColor: C.primarySoft, paddingVertical: 11, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }} accessibilityRole="search">
        <Text style={{ color: C.mute }}>⌕</Text><Muted style={{ fontSize: 14 }}>Search for a repair service…</Muted>
      </Pressable>
      {active ? <ActiveRepairCard /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {HOME_GROUPS.map(g => <Chip key={g} label={g} tone={group === g ? 'on' : undefined} onPress={() => setGroup(g)} />)}
      </ScrollView>
      <H4 right={<Link onPress={() => router.push('/search')} style={{ fontSize: 13 }}>See all →</Link>}>Popular categories</H4>
      {tiles.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tiles.map((p, i) => {
            const photo = devicePhoto(p.cat);
            return (
              <FadeIn key={p.cat} delay={i * 45} style={{ width: '31%' }}>
                <Card onPress={() => p.live ? start(p.cat) : toast(`${p.label} repairs are coming soon to Lagos`)} style={{ padding: 8, alignItems: 'center', marginBottom: 0, opacity: p.live ? 1 : 0.6 }}>
                  {photo ? <Image source={photo} style={{ width: '100%', height: 64, borderRadius: 8 }} contentFit="cover" />
                    : p.img ? <View style={{ width: '100%', height: 64, borderRadius: 8, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Image source={p.img} style={{ width: 44, height: 44 }} contentFit="contain" /></View>
                      : <View style={{ width: '100%', height: 64, borderRadius: 8, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 30 }}>{p.glyph}</Text></View>}
                  <Bold style={{ fontSize: 13, marginTop: 6 }}>{p.label}</Bold>
                  <Muted style={{ fontSize: 10, textAlign: 'center', lineHeight: 13 }}>{p.live ? p.sub : 'Coming soon'}</Muted>
                </Card>
              </FadeIn>
            );
          })}
        </View>
      ) : <Card tone="dash"><Bold style={{ color: C.mute }}>{group} repairs are coming soon</Bold><Muted>We’re launching with electronics in Lagos first. <Link onPress={() => toast(`We’ll let you know when ${group} launches`)}>Notify me</Link></Muted></Card>}
      <H4 right={<Link onPress={() => start(s.cat || 'Smartphones')} style={{ fontSize: 14 }}>See all →</Link>}>Request a repair</H4>
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' }}>
        {QUICK_REPAIRS.map(([label, cat, icon], i) => (
          <Pressable key={label} onPress={() => start(cat)} accessibilityRole="button" accessibilityLabel={label}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line, backgroundColor: pressed ? C.soft : '#fff' })}>
            <CatTile cat={cat} size={38} bg={C.soft} />
            <T style={{ flex: 1, fontSize: 15, fontWeight: '500' }}>{label}</T>
            <Ionicons name="chevron-forward" size={18} color={C.ink} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

export const QUICK_REPAIRS: [string, string, React.ComponentProps<typeof Ionicons>['name']][] = [
  ['Phone screen repair', 'Smartphones', 'phone-portrait-outline'],
  ['Laptop repair', 'Laptops', 'laptop-outline'],
  ['Tablet repair', 'Tablets', 'tablet-portrait-outline'],
  ['Printer repair', 'Printers', 'print-outline'],
];

/** Home: the customer's live repair at a glance — device, progress, who's on it, and the one thing to do next. */
export function ActiveRepairCard() {
  const { s } = useStore();
  const q = s.status >= JobStatus.Accepted ? selectedQuote(s) : null;
  const n = quotes(s).length;
  // Same stages as the tracking screen. A stage only fills once it's really done (e.g. "Booking confirmed"
  // waits for the technician to accept); the stage in progress shows half-filled.
  const steps = ['Request sent', 'Quotes in', 'Booking confirmed', s.mode === 'home' ? 'Technician on the way' : 'Device dropped off', 'Repair in progress', 'Repair completed', 'Payment released'];
  const [done, step] = ({ [JobStatus.Requested]: [1, 1], [JobStatus.Quoted]: [2, 2], [JobStatus.Booked]: [2, 2], [JobStatus.Accepted]: [3, 3], [JobStatus.OnTheWay]: [3, 3],
    [JobStatus.InProgress]: [4, 4], [JobStatus.Completed]: [5, 5], [JobStatus.Released]: [7, 6] } as Record<number, [number, number]>)[s.status] ?? [0, 0];
  const stepNote = s.status === JobStatus.Quoted ? (s.jobId ? 'finish paying' : 'choose a quote') : s.status === JobStatus.Accepted ? 'up next' : s.status === JobStatus.Completed ? 'check & confirm' : '';
  const photo = s.photos.find(p => p.type === 'image');
  const action: [string, React.ComponentProps<typeof Ionicons>['name']] =
    s.status === JobStatus.Requested ? ['View', 'time-outline']
    : s.status === JobStatus.Quoted ? (s.jobId ? ['Pay', 'card-outline'] : ['Compare', 'pricetags-outline'])
    : s.status === JobStatus.OnTheWay && s.mode === 'home' ? ['Track', 'navigate-outline']
    : s.status === JobStatus.Completed ? ['Confirm', 'checkmark-done-outline']
    : ['Track', 'pulse-outline'];
  const sub = s.status === JobStatus.Requested ? 'Waiting for technicians to quote'
    : s.status === JobStatus.Quoted ? (s.jobId ? `${selectedQuote(s).name} · ${N(selectedQuote(s).total)} to pay` : `${plural(n, 'quote')} · from ${N(Math.min(...quotes(s).map(x => x.total)))}`)
    : s.status === JobStatus.Completed ? 'Repair finished · please check your device'
    : s.status === JobStatus.OnTheWay && s.mode === 'home' ? 'Heading to you now'
    : `${s.date}, ${s.time}`;
  return (
    <FadeIn>
      <Pressable onPress={() => router.push((s.status === JobStatus.Quoted && s.jobId ? '/pay' : activeRoute(s.status)) as never)} accessibilityRole="button" accessibilityLabel={`Active repair ${s.model}, ${statusLabel(s)}. ${action[0]}`}
        style={({ pressed }) => ({ marginTop: 16, borderRadius: 18, backgroundColor: C.primary, padding: 16, opacity: pressed ? 0.92 : 1, shadowColor: C.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } })}>
        <Row>
          <Text style={{ color: '#D1E0FF', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>{shortRef(s.rid)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.status === JobStatus.Completed ? '#6CE9A6' : '#FEC84B' }} />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{statusLabel(s)}</Text>
          </View>
        </Row>
        <Row style={{ justifyContent: 'flex-start', gap: 12, marginTop: 12 }}>
          <View style={{ width: 58, height: 58, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {photo ? <Thumb m={photo} size={58} /> : <CatTile model={s.model} cat={s.cat} size={58} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{s.model || `Your ${catNoun(s.cat)}`}</Text>
            <Text style={{ color: '#D1E0FF', fontSize: 13, marginTop: 2 }} numberOfLines={1}>{s.desc.split(/[,.]/)[0] || 'Repair request'}</Text>
          </View>
        </Row>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
          {steps.map((_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < done ? '#fff' : i === step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)' }} />)}
        </View>
        <Row style={{ marginTop: 6, gap: 8 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>{steps[step]}{stepNote ? <Text style={{ color: '#D1E0FF', fontWeight: '400' }}> · {stepNote}</Text> : null}</Text><Text style={{ color: '#D1E0FF', fontSize: 12 }}>Step {step + 1} of {steps.length}</Text></Row>
        <View style={{ marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {q ? <Avatar label={q.name} size={36} verified /> : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={s.status === JobStatus.Quoted ? 'pricetags' : 'radio'} size={18} color={C.primary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }} numberOfLines={1}>{q ? q.name : s.status === JobStatus.Quoted ? 'Quotes are in' : 'Finding technicians'}</Text>
            <Text style={{ fontSize: 12, color: C.mute }} numberOfLines={1}>{sub}</Text>
          </View>
          <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Ionicons name={action[1]} size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{action[0]}</Text>
          </View>
        </View>
      </Pressable>
    </FadeIn>
  );
}

/* ───────── C-02 Find a technician ───────── */

export function Search() {
  const { s, set, get, run } = useStore();
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState<'rated' | 'jobs'>('rated');
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => { run(() => backend.listTechnicians(get, set)).then(() => setLoaded(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Verified technicians on RepairHub (from the API), with their real record.
  const list = s.accounts.filter(a => a.role === 'technician' && a.apiId)
    .map(a => [a.name, { title: (a.skills ?? []).join(', ') || 'Electronics technician', r: a.rating ?? 0, jobs: a.jobs ?? 0, areas: a.areas ?? [], skills: a.skills ?? [] }] as const)
    .filter(([n, t]) => !q || (n + t.skills.join(' ') + t.areas.join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'rated' ? b[1].r - a[1].r : b[1].jobs - a[1].jobs);
  return (
    <Screen title="Find a technician">
      <Input icon="⌕" value={q} onChangeText={setQ} placeholder="Search name or repair, e.g. laptop" accessibilityLabel="Search technicians" autoFocus />
      <Chips><Chip label="✓ Verified only" tone="blue" /><Chip label="Highest rated" tone={sort === 'rated' ? 'on' : undefined} onPress={() => setSort('rated')} /><Chip label="Most jobs" tone={sort === 'jobs' ? 'on' : undefined} onPress={() => setSort('jobs')} /></Chips>
      <Banner tone="blue" icon="ℹ︎">Prices come from quotes. Post one request and compare binding quotes side by side.</Banner>
      {list.map(([n, t]) => (
        <Card key={n} onPress={() => { set({ profile: n }); router.push({ pathname: '/tech-profile', params: { name: n } }); }}>
          <Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={n} verified /><View style={{ flex: 1 }}><Bold>{n}</Bold><Muted>{t.title}</Muted><Rating r={t.r} extra={`(${plural(t.jobs, 'job')})${t.areas.length ? ` · ${t.areas.slice(0, 2).join(', ')}` : ''}`} /></View><T style={{ color: C.mute }}>›</T></Row>
        </Card>
      ))}
      {!list.length && loaded ? <Empty title={q ? 'No matches' : 'No verified technicians yet'} sub="Try another repair type, or post a request and let technicians come to you." action="Request a repair" onPress={() => router.push('/new-request')} /> : null}
    </Screen>
  );
}

/* ───────── C-03 Technician profile (Figma) ───────── */
