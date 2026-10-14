// Service center jobs board: open requests, live jobs and completed work.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { InfoTag, MiniSteps, StatusPill, Banner, FadeIn, Btn, Btns, C, Card, Chip, Chips, Empty, Input, Link, Muted, Row, Screen, T, Title } from '../../shared/components/ui';
import { escrowTotal, isMine, JobStatus, availableJobs, jobTitle, todayLabel, custShort, myQuote, N, net, plural, offeredCategories, catName, shortDate, typicalPrice } from '../../shared/core/data';
import { shortRef } from '../../shared/core/api';
import { kmLabel } from '../../shared/core/geo';
import { useStore } from '../../shared/core/store';
import { ACTIVE_STEPS, JobPhoto, activeStep, shortIssue, useWallet } from '../technician/common';
import { closedQuote } from '../technician/jobs';

/** Display reference for a job: the live job's request, or an open request's id. */
const refOf = (id: string, rid?: string | null) => (id === 'RH-0841' ? shortRef(rid) : id.startsWith('RH-') ? id : shortRef(id));

const NEARBY_KM = 10;

export function CenterJobs() {
  const { s, set } = useStore();
  const w = useWallet();
  const mineActive = !!s.jobId && isMine(s) && s.status >= JobStatus.Accepted && s.status < JobStatus.Released;
  const { list: available, hidden } = availableJobs(s);
  const param = useLocalSearchParams<{ tab?: string }>().tab;
  const [tab, setTab] = React.useState<'available' | 'active' | 'completed'>((param as never) || (mineActive ? 'active' : 'available'));
  React.useEffect(() => { if (param === 'available' || param === 'active' || param === 'completed') setTab(param); }, [param]);
  const [shown, setShown] = React.useState(10);
  const [searching, setSearching] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [filtering, setFiltering] = React.useState(false);
  const [cat, setCat] = React.useState<string | null>(null);
  const [nearby, setNearby] = React.useState(false);
  const verified = s.centerVerif === 'verified';
  const match = (title: string, who: string, c: string) => (!q.trim() || `${title} ${who}`.toLowerCase().includes(q.trim().toLowerCase())) && (!cat || c === cat);
  const list = available.filter(j => match(jobTitle(j), j.cust, j.cat) && (!nearby || (Number.isFinite(j.km) && j.km <= NEARBY_KM)));
  const iconBtn = (name: React.ComponentProps<typeof Ionicons>['name'], on: boolean, onPress: () => void, label: string) => (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primarySoft : 'transparent' }}>
      <Ionicons name={name} size={24} color={on ? C.primary : C.ink} />
    </Pressable>
  );
  const tabs: ['available' | 'active' | 'completed', string][] = [['available', `Available (${available.length})`], ['active', `Active (${mineActive ? 1 : 0})`], ['completed', `Completed (${w.completed})`]];
  return (
    <Screen>
      <Row style={{ marginBottom: 12 }}>
        <Title style={{ fontSize: 30, marginBottom: 0 }}>Jobs</Title>
        <Row style={{ gap: 4 }}>{iconBtn('search', searching, () => { setSearching(v => !v); if (searching) setQ(''); }, 'Search jobs')}{iconBtn('options-outline', filtering, () => { setFiltering(v => !v); if (filtering) { setCat(null); setNearby(false); } }, 'Filter by device')}</Row>
      </Row>
      {searching ? <FadeIn><Input icon="⌕" value={q} onChangeText={setQ} placeholder="Search by device, repair or customer" autoFocus /></FadeIn> : null}
      {filtering ? <FadeIn><Chips>{[null, ...(s.skills.length ? s.skills : offeredCategories(s))].map(c => <Chip key={c ?? 'all'} label={c ? catName(c) : 'All devices'} tone={cat === c ? 'on' : undefined} onPress={() => setCat(c)} />)}<Chip label={`📍 Within ${NEARBY_KM} km`} tone={nearby ? 'on' : undefined} onPress={() => setNearby(v => !v)} /></Chips></FadeIn> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 }}>
        {tabs.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, backgroundColor: tab === k ? C.primary : '#EAECF0' }}>
            <Text style={{ fontSize: 13, fontWeight: tab === k ? '700' : '500', color: tab === k ? '#fff' : C.text }} numberOfLines={1}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'available' ? <>
        <T style={{ fontSize: 22, fontWeight: '800' }}>Available jobs</T><Muted style={{ marginBottom: 12, fontSize: 14 }}>Browse and send quotes for jobs near you.</Muted>
        {!verified ? <Banner tone="warn" icon="⏳">You can browse jobs now. Quoting unlocks once your business is verified.</Banner> : null}
        {!list.length ? <Empty title={q || cat ? 'No jobs match' : 'No matching requests right now'} sub={q || cat ? 'Try another search or filter.' : 'New requests in your skills and areas will appear here.'} /> : null}
        {hidden && !q && !cat ? <Card tone="soft" onPress={() => router.push('/services')}><Row><Muted style={{ flex: 1, fontSize: 13 }}>{plural(hidden, 'more request')} outside your skills.</Muted><Link onPress={() => router.push('/services')} style={{ fontSize: 13 }}>Edit services</Link></Row></Card> : null}
        {list.map((j, i) => {
          const mine = myQuote(s, j.id);
          return (
            <FadeIn key={j.id} delay={i * 60}>
              <Card>
                <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                  <JobPhoto cat={j.cat} model={j.dev} size={84} uri={j.media?.[0]} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Row style={{ justifyContent: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                      <T style={{ fontSize: 15, fontWeight: '700', flexShrink: 1 }} numberOfLines={2}>{jobTitle(j)}</T>
                      {!mine ? <View style={{ backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>New</Text></View> : null}
                    </Row>
                    <T style={{ fontSize: 13, color: C.text, fontWeight: '600' }}>{j.cust}</T>
                    <InfoTag icon="location-outline" label={`${Number.isFinite(j.km) ? `${kmLabel(j.km)} · ` : ''}${j.area} • ${j.mode}`} />
                    <InfoTag icon="calendar-outline" label={`${j.when} · posted ${j.ago}`} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T style={{ fontSize: 18, fontWeight: '800' }}>{N(mine ? mine.labour + mine.parts : typicalPrice(j.cat, j.issue))}</T>
                    <Muted style={{ fontSize: 11 }}>{mine ? 'Your quote' : 'Typical price'}</Muted>
                  </View>
                </Row>
                <Chips><Chip tone="blue" label={j.cat} /><Chip tone="blue" label={shortIssue(j.issue, 26)} /></Chips>
                <Btns>
                  <Btn small title="View details" variant="sec" onPress={() => { set({ viewJob: j.id }); router.push('/job-details'); }} />
                  <Btn small title={mine ? 'View quote' : closedQuote(s, j.id) ?? 'Send quote'} variant={mine ? 'sec' : undefined} disabled={!verified || (!mine && !!closedQuote(s, j.id))} onPress={() => { set({ viewJob: j.id }); router.push('/send-quote'); }} />
                </Btns>
              </Card>
            </FadeIn>
          );
        })}
      </> : null}
      {tab === 'active' ? <>
        <T style={{ fontSize: 22, fontWeight: '800' }}>Active jobs</T><Muted style={{ marginBottom: 12, fontSize: 14 }}>Jobs you’ve accepted and are working on.</Muted>
        {mineActive && match(jobTitle({ dev: s.model, issue: s.desc, cat: s.cat }), custShort(s), s.cat) ? (
          <FadeIn>
            <Card>
              <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                <JobPhoto cat={s.cat} model={s.model} size={84} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{jobTitle({ dev: s.model, issue: s.desc, cat: s.cat })}</T>
                  <T style={{ fontSize: 13, color: C.text, fontWeight: '600' }}>{custShort(s)}</T>
                  <InfoTag icon={s.mode === 'home' ? 'home-outline' : 'storefront-outline'} label={s.mode === 'home' ? 'Home service' : 'Visit shop'} />
                  <InfoTag icon="calendar-outline" label={`${s.date === todayLabel() ? 'Today' : s.date}, ${s.time}`} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <T style={{ fontSize: 18, fontWeight: '800' }}>{N(escrowTotal(s))}</T>
                  <StatusPill tone={s.status === JobStatus.Booked ? 'warn' : s.status === JobStatus.Completed ? 'ok' : s.status === JobStatus.Accepted ? 'blue' : 'warn'} label={s.status === JobStatus.Booked ? 'New booking' : s.status === JobStatus.Completed ? 'Awaiting customer' : s.status === JobStatus.Accepted ? 'Accepted' : s.parts ? 'Awaiting parts' : 'In progress'} />
                </View>
              </Row>
              {s.status >= JobStatus.Accepted ? <MiniSteps steps={ACTIVE_STEPS} current={activeStep(s.status)} /> : null}
              <Btn title={s.status === JobStatus.Booked ? 'Respond to booking' : s.status === JobStatus.Accepted ? 'Start job' : s.status === JobStatus.Completed ? 'View job' : 'Update status'} onPress={() => router.push(s.status === JobStatus.Booked ? '/booking-request' : '/job')} />
              <Btn title="View details" variant="sec" onPress={() => { set({ viewJob: 'RH-0841' }); router.push('/job-details'); }} />
            </Card>
          </FadeIn>
        ) : <>
          <Empty title="No active jobs" sub="When a customer picks your quote and pays, the booking shows up here." />
        </>}
      </> : null}
      {tab === 'completed' ? (() => {
        const all = (s.doneJobs ?? []).map(j => ({ ...j, date: shortDate(j.at) })).filter(j => match(j.dev, j.cust, j.cat));
        return <>
          <T style={{ fontSize: 22, fontWeight: '800' }}>Completed jobs</T><Muted style={{ marginBottom: 12, fontSize: 14 }}>{all.length > 1 ? `Showing ${Math.min(shown, all.length)} of ${all.length} · newest first` : all.length ? 'Your first completed job 🎉' : 'Nothing here yet.'}</Muted>
          {all.slice(0, shown).map((j, i) => (
            <FadeIn key={j.id} delay={Math.min(i, 6) * 40}>
              <Card>
                <Row style={{ gap: 12 }}>
                  <JobPhoto cat={j.cat} model={j.dev} size={56} />
                  <View style={{ flex: 1 }}><T style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{j.dev}</T><Muted style={{ fontSize: 12 }}>{j.cust} · {j.date}</Muted><Muted style={{ fontSize: 12 }}>{refOf(j.id, j.apiJobId)} · you received {N(net(j.gross))}</Muted></View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}><T style={{ fontSize: 15, fontWeight: '800' }}>{N(j.gross)}</T><StatusPill tone="ok" label="Completed" /></View>
                </Row>
              </Card>
            </FadeIn>
          ))}
          {shown < all.length ? <Btn title={`Show more · ${plural(all.length - shown, 'older job')}`} variant="sec" onPress={() => setShown(n => n + 10)} /> : all.length > 1 ? <Muted style={{ textAlign: 'center', marginTop: 8 }}>That’s all {all.length} completed jobs.</Muted> : null}
        </>;
      })() : null}
    </Screen>
  );
}