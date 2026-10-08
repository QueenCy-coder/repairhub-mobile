// Jobs board, job details and sending quotes.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, Text, View, Alert } from 'react-native';
import { InfoTag, MiniSteps, StatusPill, Banner, FadeIn, Btn, Btns, C, Card, Chip, Chips, Empty, Input, Link, Muted, Row, Screen, T, Title, Avatar, Bold, H4, KV, MediaGrid, CatTile, Field, NumberChoice } from '../../shared/components/ui';
import { techStats, escrowTotal, isMine, JobStatus, LIVE_CATEGORIES, availableJobs, jobTitle, typicalPrice, todayLabel, custShort, myQuote, N, net, plural, jobById, COMMISSION, grouped } from '../../shared/core/data';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { useStore } from '../../shared/core/store';
import { ACTIVE_STEPS, JobPhoto, OfflineStrip, activeStep, shortIssue, useWallet } from './common';

/** Display reference for a job: the live job's request, or an open request's id. */
export const refOf = (id: string, rid?: string | null) => (id === 'RH-0841' ? shortRef(rid) : id.startsWith('RH-') ? id : shortRef(id));

export function Jobs() {
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
  const verified = s.techVerif === 'verified';
  const match = (title: string, who: string, c: string) => (!q.trim() || `${title} ${who}`.toLowerCase().includes(q.trim().toLowerCase())) && (!cat || c === cat);
  const list = available.filter(j => match(jobTitle(j), j.cust, j.cat));
  const iconBtn = (name: React.ComponentProps<typeof Ionicons>['name'], on: boolean, onPress: () => void, label: string) => (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.primarySoft : 'transparent' }}>
      <Ionicons name={name} size={24} color={on ? C.primary : C.ink} />
    </Pressable>
  );
  const tabs: ['available' | 'active' | 'completed', string][] = [['available', `Available (${available.length})`], ['active', `Active (${mineActive ? 1 : 0})`], ['completed', `Completed (${w.completed})`]];
  return (
    <Screen>
      <OfflineStrip />
      <Row style={{ marginBottom: 12 }}>
        <Title style={{ fontSize: 30, marginBottom: 0 }}>Jobs</Title>
        <Row style={{ gap: 4 }}>{iconBtn('search', searching, () => { setSearching(v => !v); if (searching) setQ(''); }, 'Search jobs')}{iconBtn('options-outline', filtering, () => { setFiltering(v => !v); if (filtering) setCat(null); }, 'Filter by device')}</Row>
      </Row>
      {searching ? <FadeIn><Input icon="⌕" value={q} onChangeText={setQ} placeholder="Search by device, repair or customer" autoFocus /></FadeIn> : null}
      {filtering ? <FadeIn><Chips>{[null, ...(s.skills.length ? s.skills : LIVE_CATEGORIES)].map(c => <Chip key={c ?? 'all'} label={c ?? 'All devices'} tone={cat === c ? 'on' : undefined} onPress={() => setCat(c)} />)}</Chips></FadeIn> : null}
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
        {!verified ? <Banner tone="warn" icon="⏳">You can browse jobs now. Quoting unlocks once your account is verified.</Banner> : null}
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
                    <InfoTag icon="location-outline" label={`${j.area} • ${j.mode}`} />
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
                  <Btn small title={mine ? 'Revise quote' : 'Send quote'} disabled={!verified} onPress={() => { set({ viewJob: j.id }); router.push('/send-quote'); }} />
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
        const all = [...techStats(s).history].filter(j => match(j.dev, j.cust, j.cat));
        return <>
          <T style={{ fontSize: 22, fontWeight: '800' }}>Completed jobs</T><Muted style={{ marginBottom: 12, fontSize: 14 }}>{all.length > 1 ? `Showing ${Math.min(shown, all.length)} of ${all.length} · newest first` : all.length ? 'Your first completed job 🎉' : 'Nothing here yet.'}</Muted>
          {all.slice(0, shown).map((j, i) => (
            <FadeIn key={j.id} delay={Math.min(i, 6) * 40}>
              <Card onPress={j.id === 'RH-0841' ? () => router.push('/job') : undefined}>
                <Row style={{ gap: 12 }}>
                  <JobPhoto cat={j.cat} model={j.dev} size={56} />
                  <View style={{ flex: 1 }}><T style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{j.dev}</T><Muted style={{ fontSize: 12 }}>{j.cust} · {j.date}</Muted><Muted style={{ fontSize: 12 }}>{j.id} · you received {N(net(j.gross))}</Muted></View>
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

export function JobDetails() {
  const { s } = useStore();
  const j = jobById(s, s.viewJob);
  const media = j.id === 'RH-0841' ? s.photos : (j.media ?? []).map(uri => ({ uri, type: 'image' as const }));
  const booked = j.id === 'RH-0841' && !!s.jobId;
  return (
    <Screen title="Job details" footer={booked
      ? isMine(s) && s.status < JobStatus.Released ? <Btn title={s.status === JobStatus.Booked ? 'Respond to booking' : 'Open job'} onPress={() => router.push(s.status === JobStatus.Booked ? '/booking-request' : '/job')} /> : undefined
      : <Btn title={myQuote(s, j.id) ? 'Revise quote' : 'Send a quote'} disabled={s.techVerif !== 'verified'} onPress={() => router.push('/send-quote')} />}>
      <Row><Row style={{ justifyContent: 'flex-start', gap: 10 }}><Avatar label={j.cust} size={40} uri={j.id === 'RH-0841' ? (s.owner?.photo ?? s.custPhoto) : undefined} /><View><Bold style={{ fontSize: 14 }}>{j.cust}</Bold><Muted style={{ fontSize: 12 }}>{refOf(j.id, s.rid)}</Muted></View></Row><Chip tone="blue" label={j.area} /></Row>
      <H4>{j.dev}</H4>
      <T style={{ fontSize: 14, color: C.text, marginTop: -4 }}>{j.issue}</T>
      <View style={{ marginTop: 12 }}>{media.length ? <MediaGrid items={media} max={media.length} />
        : <Muted>The customer didn’t attach photos.</Muted>}</View>
      <Card style={{ marginTop: 14 }}><KV k="Category" v={j.cat} /><KV k="Area" v={j.area} /><KV k="Exact address" v={booked ? (s.location || '—') : 'Shared after booking'} /><KV k="Needed" v={j.when} /><KV k="Service" v={j.mode} /><KV k="Posted" v={j.ago} />{myQuote(s, j.id) ? <KV k="Your quote" v={N(myQuote(s, j.id)!.labour + myQuote(s, j.id)!.parts)} /> : null}</Card>
      {booked ? <Banner tone={isMine(s) ? 'ok' : 'warn'} icon={isMine(s) ? '✓' : 'ℹ︎'}>{isMine(s) ? 'The customer booked you for this job.' : 'The customer chose another technician.'}</Banner> : null}
    </Screen>
  );
}

/* ───────── T-06 Send quote (one quote per request) ───────── */

export function SendQuote() {
  const { s, set, get, toast, online, run, busy } = useStore();
  const j = jobById(s, s.viewJob);
  const existing = myQuote(s, j.id);
  // Each request gets its own draft, pre-filled only from that request's existing quote.
  const [labour, setLabour] = React.useState(existing ? String(existing.labour) : '');
  const [parts, setParts] = React.useState(existing ? String(existing.parts) : '');
  const [days, setDays] = React.useState<number | null>(existing?.days ?? null);
  const [warr, setWarr] = React.useState<number | null>(existing?.warr ?? null);
  const [note, setNote] = React.useState(existing?.note ?? '');
  const [tried, setTried] = React.useState(false);
  const num = (t: string) => Number(t.replace(/\D/g, '')) || 0;
  const total = num(labour) + num(parts);
  const booked = j.id === 'RH-0841' && !!s.jobId;
  const err = {
    labour: num(labour) <= 0 ? 'Enter your labour cost' : null,
    days: !days ? 'Choose how long the repair takes' : null,
    warr: !warr ? 'Choose the warranty you offer' : null,
  };
  const send = async () => {
    if (!online) return Alert.alert('You’re offline', 'Quotes need a connection so customers see live prices. Job status updates still work offline.');
    if (Object.values(err).some(Boolean)) { setTried(true); toast('Please complete the fields marked in red'); return; }
    const q = { labour: num(labour), parts: num(parts), days: days!, warr: warr!, note: note.trim() };
    if (await run(() => backend.sendQuote(get, set, j.id, q), `${existing ? 'Quote updated' : 'Quote sent'} · the customer has been notified`)) router.back();
  };
  const withdraw = () => Alert.alert('Withdraw your quote?', 'The customer will no longer see it.', [{ text: 'Keep', style: 'cancel' }, { text: 'Withdraw', style: 'destructive', onPress: async () => {
    if (await run(() => backend.withdrawQuote(get, set, j.id), 'Quote withdrawn')) router.back();
  } }]);
  if (booked) return <Screen title="Send quote"><Empty title="This request is closed" sub={isMine(s) ? 'The customer booked you. Open the job to continue.' : 'The customer chose another technician.'} action={isMine(s) ? 'Open job' : 'Back to jobs'} onPress={() => router.replace(isMine(s) ? '/job' : '/jobs')} /></Screen>;
  return (
    <Screen title={existing ? 'Revise quote' : 'Send quote'} footer={<Btn title={busy ? 'Sending…' : `${existing ? 'Update quote' : 'Send quote'}${total ? ` · ${N(total)}` : ''}`} disabled={busy} onPress={send} />}>
      <Card tone="soft"><Row style={{ justifyContent: 'flex-start', gap: 12 }}><CatTile model={j.dev} cat={j.cat} bg="#fff" /><View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{refOf(j.id)} · {j.dev}</Bold><Muted style={{ fontSize: 12 }}>{j.area} · {j.mode}</Muted><T style={{ fontSize: 12, color: C.mute, lineHeight: 16 }} numberOfLines={2}>{j.issue}</T></View></Row></Card>
      {existing ? <Banner tone="blue" icon="ℹ︎">{`Your current quote: ${N(existing.labour + existing.parts)} · ${plural(existing.days, 'day')} · ${plural(existing.warr, 'month')} warranty`}</Banner> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Labour (₦)" required error={tried && err.labour}><Input invalid={tried && !!err.labour} value={grouped(labour)} onChangeText={t => setLabour(t.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))} keyboardType="number-pad" placeholder="e.g. 6000" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Parts (₦)"><Input value={grouped(parts)} onChangeText={t => setParts(t.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 7))} keyboardType="number-pad" placeholder="0 if none" /></Field></View>
      </View>
      <Field label="Ready in" required error={tried && err.days}><NumberChoice options={[1, 2, 3, 5, 7]} value={days} onChange={setDays} unit="day" max={90} invalid={!!(tried && err.days)} /></Field>
      <Field label="Warranty" required error={tried && err.warr}><NumberChoice options={[1, 2, 3, 6]} value={warr} onChange={setWarr} unit="month" max={24} invalid={!!(tried && err.warr)} /></Field>
      <Field label="Note to customer (optional)"><Input value={note} onChangeText={setNote} multiline placeholder="Part quality, what’s included, how long it takes on site…" /></Field>
      <Card tone="blue"><KV k="Customer pays" v={N(total)} /><KV k={`RepairHub commission (${COMMISSION}%)`} v={`−${N(total * COMMISSION / 100)}`} /><View style={{ height: 1, backgroundColor: C.primaryLine, marginVertical: 4 }} /><Row><Bold>You receive</Bold><Bold style={{ fontSize: 18 }}>{N(net(total))}</Bold></Row></Card>
      <Muted>Valid for 7 days. You can revise or withdraw it until the customer chooses. Include travel in your price for home service.</Muted>
      {existing ? <Btn title="Withdraw quote" variant="danger" onPress={withdraw} /> : null}
    </Screen>
  );
}

/* ───────── T-07 Booking request ───────── */
