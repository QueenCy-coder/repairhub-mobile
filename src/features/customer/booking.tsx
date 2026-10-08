// Booking, payment into escrow, confirmation, appointments (reschedule / cancel).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import * as Linking from 'expo-linking';
import { View, Pressable, Alert, Text, AppState, Platform } from 'react-native';
import { CallButton } from '../../shared/components/callSheet';
import { Avatar, CatTile, ChoiceOrType, Bold, Btn, C, Card, Field, H4, Link, Muted, Opt, Rating, Row, Screen, T, Banner, KV, Chip, SuccessMark, Title, FadeIn, Btns, Empty, Stepper } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { DATES, escrowTotal, first, N, plural, selectedQuote, TIME_WINDOWS, JobStatus, intl, LEKKI, statusLabel, myPastRequests, shortDate } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';



export function Book() {
  const { s, set, toast } = useStore();
  const q = selectedQuote(s);
  const total = escrowTotal(s);
  // The appointment is what the customer already asked for in the request; they only change it if they want to.
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => { set({ date: s.prefDate, time: s.prefTime }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title="Book Technician" footer={<Btn title="Continue to payment →" onPress={() => s.date.trim().length < 3 || !/\d/.test(s.time) ? (setEditing(true), toast('Choose or type a date and time')) : router.push('/pay')} />}>
      <Card onPress={() => { set({ profile: q.name }); router.push({ pathname: '/tech-profile', params: { name: q.name } }); }}>
        <Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={q.name} verified /><View style={{ flex: 1 }}><Bold>{q.name}</Bold><Muted style={{ fontSize: 12 }}>Technician</Muted><Rating r={q.rating} extra={q.jobs ? `(${plural(q.jobs, 'job')} completed)` : undefined} /></View><T style={{ color: C.mute }}>›</T></Row>
      </Card>
      <Card><Row style={{ justifyContent: 'flex-start', gap: 12 }}><CatTile model={s.model} cat={s.cat} /><View><Muted style={{ fontSize: 12 }}>Repair</Muted><Bold style={{ fontSize: 14 }}>{s.model}</Bold><Muted style={{ fontSize: 12 }}>{s.desc.slice(0, 38)}{s.desc.length > 38 ? '…' : ''}</Muted></View></Row></Card>
      <Card tone="blue"><Muted>Quoted price</Muted><T style={{ fontSize: 24, fontWeight: '800' }}>{N(q.total)}</T><Muted style={{ fontSize: 12 }}>{plural(q.days, 'day')} repair · {plural(q.warr, 'month')} warranty</Muted></Card>
      <H4 right={<Link onPress={() => setEditing(e => !e)}>{editing ? 'Done' : 'Change'}</Link>}>Appointment</H4>
      {!editing ? (
        <Card>
          <Row style={{ justifyContent: 'flex-start', gap: 10, marginBottom: 6 }}><Ionicons name="calendar-outline" size={18} color={C.primary} /><T style={{ fontSize: 15, fontWeight: '600' }}>{s.date}</T></Row>
          <Row style={{ justifyContent: 'flex-start', gap: 10, marginBottom: 6 }}><Ionicons name="time-outline" size={18} color={C.primary} /><T style={{ fontSize: 15, fontWeight: '600' }}>{s.time}</T></Row>
          <Row style={{ justifyContent: 'flex-start', gap: 10 }}><Ionicons name={s.mode === 'home' ? 'home-outline' : 'storefront-outline'} size={18} color={C.primary} /><T style={{ fontSize: 15, fontWeight: '600' }}>{s.mode === 'home' ? 'Home service' : 'Visit the workshop'}</T></Row>
          <Muted style={{ fontSize: 12, marginTop: 8 }}>From your request. Change it here if you need to.</Muted>
        </Card>
      ) : <>
        <Field label="Date" required><ChoiceOrType options={DATES} value={s.date} onChange={d => set({ date: d })} placeholder="Type a date, e.g. Wed 14 Oct" /></Field>
        <Field label="Time" required><ChoiceOrType options={TIME_WINDOWS} value={s.time} onChange={t => set({ time: t })} placeholder="Type a time, e.g. 3:30 PM" /></Field>
        <Field label="Service type" required>
          <Opt label="Visit the workshop" sub="At the technician’s workshop · free" on={s.mode === 'shop'} onPress={() => set({ mode: 'shop' })} />
          <Opt label="Home service" sub="Technician comes to your location · included in the quote" on={s.mode === 'home'} onPress={() => set({ mode: 'home' })} />
        </Field>
      </>}
      <Card tone="soft"><Row><View><Bold>Total</Bold><Muted style={{ fontSize: 12 }}>Technician’s quote</Muted></View><T style={{ fontSize: 20, fontWeight: '800' }}>{N(total)}</T></Row></Card>
    </Screen>
  );
}

/* ───────── C-08 Checkout → escrow (Paystack) ───────── */

export function Pay() {
  const { s, set, get, run, busy, toast, refreshNow } = useStore();
  const total = escrowTotal(s), q = selectedQuote(s);
  const [waiting, setWaiting] = React.useState(!!s.payRef && s.status < JobStatus.Accepted);
  const done = () => { if (router.canDismiss()) router.dismissAll(); router.push('/confirmed'); };
  // Paid on Paystack's page → the server confirms it (Paystack's webhook) → the booking is confirmed here.
  const check = React.useCallback(async (quiet = false) => {
    try {
      const r = await backend.checkPayment(get, set);
      if (r === 'paid') { setWaiting(false); done(); }
      else if (r === 'failed') { setWaiting(false); set({ payErr: true, payRef: null }); }
      else if (!quiet) toast('Payment not received yet. Finish paying on the Paystack page, then check again.');
    } catch (e) { if (!quiet) toast(e instanceof Error ? e.message : 'Couldn’t check the payment'); }
  }, [get, set, toast]);
  React.useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => check(true), 4000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') check(true); });
    return () => { clearInterval(id); sub.remove(); };
  }, [waiting, check]);
  const pay = async () => {
    if (s.pay === 'cash') {
      if (await run(() => backend.payCash(get, set))) done();
      return;
    }
    let url = '';
    if (!(await run(async () => { url = (await backend.startPayment(get, set)).authorizationUrl; }))) return;
    set({ payErr: false });
    setWaiting(true);
    if (Platform.OS === 'web') window.open(url, '_blank'); else Linking.openURL(url).catch(() => toast('Couldn’t open the Paystack payment page'));
  };
  const method = (k: typeof s.pay, label: string, sub: string, icon: string) => (
    <Opt key={k} icon={icon} label={label} sub={sub} on={s.pay === k} onPress={() => set({ pay: k, payErr: false })} />
  );
  if (s.status >= JobStatus.Accepted) return <Confirmed />;
  return (
    <Screen title="Checkout" footer={waiting ? <>
      <Btn title={busy ? 'Checking…' : 'I’ve paid · check now'} disabled={busy} onPress={() => { refreshNow(); check(); }} />
      <Btn title="Open the payment page again" variant="ghost" onPress={() => { setWaiting(false); pay(); }} />
    </> : <>
      <Btn title={busy ? 'Processing…' : s.pay === 'cash' ? 'Book · pay cash after the repair' : `🔒 Pay ${N(total)}`} disabled={busy} onPress={pay} />
      <Muted style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>{s.pay === 'cash' ? 'You pay the technician when the repair is done.' : '🛡 Your payment is held securely until you confirm the repair is complete.'}</Muted>
    </>}>
      <Card tone="blue"><Row style={{ justifyContent: 'flex-start', gap: 12 }}><CatTile model={s.model} cat={s.cat} bg="#fff" /><View><Muted style={{ fontSize: 12 }}>Repair</Muted><Bold style={{ fontSize: 14 }}>{s.model}</Bold><Muted style={{ fontSize: 12 }}>{s.date}, {s.time} · {s.mode === 'home' ? 'Home service' : 'Workshop'}</Muted></View></Row></Card>
      <Card><Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={q.name} verified /><View><Bold>{q.name}</Bold><Rating r={q.rating} extra={q.jobs ? `(${plural(q.jobs, 'job')} completed)` : undefined} /></View></Row></Card>
      <Card>
        <Bold style={{ marginBottom: 4 }}>Price details</Bold>
        <KV k="Labour" v={N(q.labour)} /><KV k="Parts" v={N(q.parts)} /><KV k="RepairHub fee" v="₦0" />
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 6 }} />
        <Row><Bold>Total</Bold><T style={{ fontSize: 20, fontWeight: '800' }}>{N(total)}</T></Row>
      </Card>
      {waiting ? (
        <Banner tone="blue" icon="⏳">Complete the payment on the Paystack page that opened. This screen updates as soon as Paystack confirms it.</Banner>
      ) : <>
        <H4>Payment method</H4>
        {method('card', 'Card, bank transfer or USSD', 'Secure checkout by Paystack · held in escrow', '💳')}
        {method('cash', 'Cash after the repair', 'Pay the technician directly when it’s done', '💵')}
        {s.payErr ? <Banner tone="bad" icon="!">Payment didn’t go through. You have not been charged. Try again or choose another method.</Banner> : null}
      </>}
    </Screen>
  );
}

/* ───────── C-09 Booking confirmed (Figma) ───────── */

/** Shown in place of a booking screen when the booking no longer exists (cancelled). */
export function NoBooking() {
  const { s } = useStore();
  if (s.cancelled || s.status < JobStatus.Requested) return <Screen title="Booking"><Empty title={s.dispute?.status === 'Resolved' ? 'RepairHub refunded you' : 'This repair was cancelled'} sub={`${s.refund ? `${N(s.refund)} is being refunded to you.` : 'Nothing was charged.'}${s.dispute?.outcome ? ` ${s.dispute.outcome}` : ''} You can request a new repair any time.`} action="Go home" onPress={() => router.replace('/home')} /></Screen>;
  return <Screen title="Booking"><Empty title="Not booked yet" sub="Choose a quote and pay to book your technician." action="Compare quotes" onPress={() => router.replace('/compare')} /></Screen>;
}

export function Confirmed() {
  const { s } = useStore();
  if (s.status < JobStatus.Accepted || !s.sel) return <NoBooking />;
  const q = selectedQuote(s), ref = shortRef(s.rid);
  return (
    <Screen title="" back={false} footer={<>
      <Btn title="Track Repair →" onPress={() => router.replace('/track')} />
      {s.qBy?.phone ? <CallButton name={q.name} role={`Your technician · ${ref}`} phone={intl(s.qBy.phone)} label="Call Technician" /> : null}
    </>}>
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <SuccessMark />
        <Title style={{ marginTop: 14 }}>Booking Confirmed!</Title>
        <Chip tone="blue" label={`ID: ${ref}`} />
      </View>
      <Card style={{ marginTop: 18 }}>
        <Row style={{ justifyContent: 'flex-start', gap: 12, marginBottom: 8 }}><Avatar label={q.name} verified /><View><Bold>{q.name}</Bold><Rating r={q.rating} extra={q.jobs ? `· ${plural(q.jobs, 'job')} completed` : undefined} /></View></Row>
        <KV k="Date / time" v={`${s.date}, ${s.time}`} /><KV k="Address" v={s.mode === 'home' ? (s.location || LEKKI.label) : 'Technician’s workshop'} /><KV k={s.payState === 'cash' ? 'Pay in cash after the repair' : 'Amount in escrow'} v={N(escrowTotal(s))} /><KV k="Warranty" v={plural(q.warr, 'month')} />
      </Card>
      <Banner tone="blue" icon="ℹ︎">{`${first(q.name)} has your booking and will update you here as the repair moves along.`}</Banner>
      <Pressable onPress={() => router.push('/appointments')} style={{ alignItems: 'center' }}><Link>Reschedule or cancel</Link></Pressable>
    </Screen>
  );
}

export function Appointments() {
  const { s, set, get, run, busy } = useStore();
  const [date, setDate] = React.useState(s.date), [time, setTime] = React.useState(s.time), [editing, setEditing] = React.useState(false);
  const upcoming = !!s.jobId && s.status >= JobStatus.Accepted && s.status < JobStatus.Released && !s.cancelled;
  // The API allows changes until work has started (accepted / on the way).
  const canChange = upcoming && s.status <= JobStatus.OnTheWay;
  const q = selectedQuote(s), total = escrowTotal(s), ref = shortRef(s.rid);
  const cancel = () => {
    Alert.alert('Cancel this appointment?', s.payState === 'held' ? `${N(total)} is refunded to you and ${first(q.name)} is notified.` : `${first(q.name)} is notified.`, [
      { text: 'Keep appointment', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: async () => {
        if (await run(() => backend.cancelAppointment(get, set), 'Appointment cancelled')) router.replace('/repairs');
      } },
    ]);
  };
  const past = myPastRequests(s).filter(p => p.status === 'Completed');
  const step = s.status <= JobStatus.Accepted ? 0 : s.status === JobStatus.OnTheWay ? 1 : s.status === JobStatus.InProgress ? 2 : 3;
  return (
    <Screen title="Appointments">
      {upcoming ? (
        <FadeIn>
          <Card tone="strong">
            <Row><Chip tone="ok" label={statusLabel(s)} /><Muted style={{ fontSize: 12 }}>{ref}</Muted></Row>
            <Row style={{ justifyContent: 'flex-start', gap: 12, marginTop: 10 }}>
              <View style={{ width: 52, height: 56, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>{s.date.split(' ')[2]?.toUpperCase()}</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink, lineHeight: 24 }}>{s.date.split(' ')[1]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Bold style={{ fontSize: 17 }}>{s.date.split(' ')[0]}, {s.time}</Bold>
                <Muted style={{ fontSize: 13 }}>{s.mode === 'home' ? '🏠 Home service' : '🏪 Workshop visit'}{s.rescheduled ? ' · rescheduled' : ''}</Muted>
              </View>
            </Row>
            <Stepper steps={['Booked', s.mode === 'home' ? 'On the way' : 'Dropped off', 'Repairing', 'Done']} current={step} />
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
            <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
              <CatTile model={s.model} cat={s.cat} size={44} />
              <View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{s.model}</Bold><Muted style={{ fontSize: 12 }} >{s.desc.split(/[,.]/)[0]}</Muted></View>
            </Row>
            <Row style={{ justifyContent: 'flex-start', gap: 12, marginTop: 12 }}>
              <Avatar label={q.name} size={44} verified />
              <View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{q.name}</Bold><Rating r={q.rating} extra={`· ${plural(q.warr, 'month')} warranty`} /></View>
              {s.qBy?.phone ? <View style={{ width: 96 }}><CallButton small name={q.name} role={`Your technician · ${ref}`} phone={intl(s.qBy.phone)} /></View> : null}
            </Row>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1.4, backgroundColor: C.soft, borderRadius: 10, padding: 10 }}><Muted style={{ fontSize: 11 }}>📍 Where</Muted><T style={{ fontSize: 13, fontWeight: '600' }}>{s.mode === 'home' ? (s.location || LEKKI.label) : 'Technician’s workshop'}</T></View>
              <View style={{ flex: 1, backgroundColor: C.soft, borderRadius: 10, padding: 10 }}><Muted style={{ fontSize: 11 }}>{s.payState === 'cash' ? '💵 Pay in cash' : '🔒 In escrow'}</Muted><T style={{ fontSize: 15, fontWeight: '800' }}>{N(total)}</T></View>
            </View>
            {editing ? <>
              <Bold style={{ marginTop: 12, fontSize: 14 }}>New date</Bold><ChoiceOrType options={DATES} value={date} onChange={setDate} placeholder="Type a date, e.g. Wed 14 Oct" />
              <Bold style={{ fontSize: 14 }}>New time</Bold><ChoiceOrType options={TIME_WINDOWS} value={time} onChange={setTime} placeholder="Type a time, e.g. 3:30 PM" />
              <Btns><Btn small title="Back" variant="ghost" onPress={() => setEditing(false)} /><Btn small title={busy ? 'Saving…' : 'Confirm new time'} disabled={busy} onPress={async () => {
                if (date.trim().length < 3 || !/\d/.test(time)) return run(async () => { throw new Error('Choose or type a new date and time'); });
                if (await run(() => backend.reschedule(get, set, date, time), `Moved to ${date}, ${time}`)) setEditing(false);
              }} /></Btns>
            </> : <>
              <Btn icon="navigate-circle-outline" title="Track repair" onPress={() => router.push('/track')} />
              {canChange ? <Btns><Btn small icon="calendar-outline" title="Reschedule" variant="sec" onPress={() => setEditing(true)} /><Btn small icon="close-circle-outline" title="Cancel" variant="danger" onPress={cancel} /></Btns>
                : <Muted style={{ marginTop: 10, fontSize: 12, textAlign: 'center' }}>ⓘ The repair has started, so the time can’t be changed. Something wrong? Report it from tracking.</Muted>}
            </>}
          </Card>
        </FadeIn>
      ) : <Empty title="No upcoming appointments" sub="Book a technician from your quotes and it will show up here." action="Request a repair" onPress={() => router.push('/new-request')} />}
      {past.length ? <>
        <H4>Past</H4>
        {past.map(p => (
          <FadeIn key={p.id} delay={80}>
            <Card onPress={() => router.push({ pathname: '/repair', params: { id: p.id } })}>
              <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
                <CatTile model={p.dev} cat={p.cat} size={44} />
                <View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{p.dev}</Bold><Muted style={{ fontSize: 12 }}>{shortDate(p.at)}</Muted><Muted style={{ fontSize: 12 }}>{p.id} · {(p.service ?? '').toLowerCase()}</Muted></View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}><Bold style={{ fontSize: 14 }}>{N(p.gross)}</Bold><Chip tone="ok" label="Completed" /></View>
              </Row>
            </Card>
          </FadeIn>
        ))}
      </> : null}
    </Screen>
  );
}

/* ───────── Customer profile (Figma tab) ───────── */
