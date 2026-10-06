// Earnings overview.
import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { AnimatedNumber, FadeIn, Bars, Bold, Btn, C, Card, Chip, H4, IconTile, Muted, Row, Screen, Segments, T } from '../../shared/components/ui';
import { COMMISSION, EARN, escrowTotal, first, jobs, MIN_PAYOUT, N, net, plural, myDoneJobs } from '../../shared/core/data';
import * as backend from '../../shared/core/backend';
import { useStore } from '../../shared/core/store';
import { useWallet } from './common';
import { ledger } from './payouts/transactions';
import { PayoutSummary, Withdraw } from './payouts/withdraw';

export function Earnings() {
  const { s, set, toast, notify, refreshNow } = useStore();
  // Fresh wallet, transactions and reviews whenever Earnings opens.
  React.useEffect(() => { backend.wantExtras(); refreshNow(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const w = useWallet();
  const [range, setRange] = React.useState<'week' | 'month' | 'all'>('month');
  const fresh = w.completed === 0 && w.month === 0; // brand-new technician: no history to chart yet
  const MONTH_NAME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekly = EARN.weekly.slice(0, 12);
  // A new technician's chart is built from their real jobs only (today: the released RH-0841 payout).
  const real = s.techIsNew ? [...myDoneJobs(s).map(j => ({ t: j.at, amt: net(j.gross) })), ...(w.released ? [{ t: s.completedAt || Date.now(), amt: net(escrowTotal(s)) }] : [])] : null;
  const now = new Date();
  const bucket = (idx: (d: Date) => number, n: number) => { const a = Array(n).fill(0); real!.forEach(j => { const i = idx(new Date(j.t)); if (i >= 0 && i < n) a[i] += j.amt; }); return a; };
  const bars = real
    ? range === 'week' ? bucket(d => (Math.floor((now.getTime() - d.getTime()) / 864e5) < 7 ? (d.getDay() + 6) % 7 : -1), 7)
      : range === 'month' ? bucket(d => (d.getMonth() === now.getMonth() ? Math.min(3, Math.floor((d.getDate() - 1) / 7)) : -1), 4)
      : bucket(d => (d.getFullYear() === now.getFullYear() ? d.getMonth() : -1), 12)
    : range === 'week' ? [40, 62, 35, 70, 55, 80, 48] : range === 'month' ? [0, 3, 6, 9].map(i => weekly[i] + weekly[i + 1] + weekly[i + 2]) : [30, 45, 52, 60, 58, 72, 80, 76, 90, 85, 95, 100];
  const barLabels = range === 'week' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : range === 'month' ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'] : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const txns = ledger(s).slice(0, 8);
  return (
    <Screen title="Earnings" back={false} right={<Chip tone="blue" label="📅 This month" />}>
      <Card tone="blue">
        <Row><Bold style={{ fontSize: 14 }}>Total earnings</Bold>{s.techIsNew ? null : <Chip tone="ok" label="↗ +12.8%" />}</Row>
        <Row style={{ alignItems: 'flex-end', marginTop: 4 }}>
          <View style={{ flex: 1 }}><AnimatedNumber value={w.month} format={N} style={{ fontSize: 28, fontWeight: '800', color: C.ink }} /><Muted style={{ fontSize: 12 }}>{MONTH_NAME[new Date().getMonth()]} · {plural(w.monthJobs, 'job')} · after {COMMISSION}% commission</Muted></View>
          {fresh || s.techIsNew ? null : <View style={{ width: 96 }}><Bars values={[40, 55, 70, 45, 80, 95]} highlight={5} height={44} /></View>}
        </Row>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}><Row style={{ justifyContent: 'flex-start', gap: 8 }}><IconTile glyph="👛" size={32} /><Muted style={{ fontSize: 12 }}>Available</Muted></Row><AnimatedNumber value={w.available} format={N} style={{ fontSize: 18, marginTop: 6, fontWeight: '700', color: C.ink }} /></Card>
        <Card style={{ flex: 1 }}><Row style={{ justifyContent: 'flex-start', gap: 8 }}><IconTile glyph="🕒" size={32} /><Muted style={{ fontSize: 12 }}>Pending (escrow)</Muted></Row><AnimatedNumber value={w.pending} format={N} style={{ fontSize: 18, marginTop: 6, fontWeight: '700', color: C.ink }} /></Card>
      </View>
      <Btn title={w.available < MIN_PAYOUT ? `Minimum withdrawal is ${N(MIN_PAYOUT)}` : `Withdraw ${N(w.available)}`} disabled={w.available < MIN_PAYOUT} onPress={() => router.push('/withdraw')} />
      <View style={{ marginTop: 12 }}><PayoutSummary /></View>
      <H4>Earning overview</H4>
      <Segments items={[['week', 'This week'], ['month', 'This month'], ['all', 'All time']]} value={range} onChange={setRange} />
      {fresh ? <Card tone="soft" style={{ alignItems: 'center', paddingVertical: 24 }}><Text style={{ fontSize: 26 }}>📈</Text><Bold style={{ marginTop: 6 }}>Your earnings chart starts here</Bold><Muted style={{ textAlign: 'center', fontSize: 13 }}>Complete your first job and we’ll chart your earnings by day, week and month.</Muted></Card> : <>
        <Bars values={bars} highlight={bars.indexOf(Math.max(...bars))} height={130} labels={barLabels} />
        <Muted style={{ marginTop: 4, textAlign: 'center', fontSize: 12 }}>{range === 'week' ? 'Last 7 days' : range === 'month' ? MONTH_NAME[now.getMonth()] : String(now.getFullYear())}{real ? ` · ${N(bars.reduce((a, b) => a + b, 0))}` : ''}</Muted>
      </>}
      <H4>Recent transactions</H4>
      {!txns.length ? <Card tone="soft"><Muted style={{ fontSize: 13 }}>No transactions yet. Released job payments and withdrawals will appear here.</Muted></Card> : null}
      {txns.map((t, i) => (
        <FadeIn key={t.id} delay={i * 40}>
          <Card tone={t.amount > 0 ? 'blue' : undefined} style={{ paddingVertical: 10 }} onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })}>
            <Row>
              <View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{t.title}</Bold><Muted style={{ fontSize: 12 }}>{t.sub} · {t.date.replace(/^\w{3} /, '').replace(' 2026', '')}, {t.time}</Muted></View>
              <Row style={{ gap: 6 }}><Bold style={{ color: t.amount > 0 ? C.okInk : C.ink }}>{t.amount > 0 ? '+' : '−'}{N(Math.abs(t.amount))}</Bold><T style={{ color: C.faint }}>›</T></Row>
            </Row>
          </Card>
        </FadeIn>
      ))}
    </Screen>
  );
}

/* ───────── T-10 Reviews & replies ───────── */
