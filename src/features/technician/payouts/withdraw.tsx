// Withdrawing earnings.
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Text, View } from 'react-native';
import { Bold, Btn, C, Card, Chip, Empty, Field, Input, KV, Link, Muted, Row, Screen, T, Stepper, Title } from '../../../shared/components/ui';
import { walletBase, grouped, maskAcct, MIN_PAYOUT, N } from '../../../shared/core/data';
import * as backend from '../../../shared/core/backend';
import { useStore } from '../../../shared/core/store';
import { ledger } from './transactions';

/** Wallet balance available to withdraw (from the API). */
export function useAvailable() {
  const { s } = useStore();
  return walletBase(s).available;
}

export function Withdraw() {
  const { s, set, get, run, busy } = useStore();
  const available = useAvailable();
  const [amount, setAmount] = React.useState(available >= MIN_PAYOUT ? String(Math.floor(available)) : '');
  const [tried, setTried] = React.useState(false);
  if (!s.payoutAccount) return (
    <Screen title="Withdraw"><Empty title="Add a payout account" sub="Tell us which bank account to pay your earnings into. It must be in your own name." action="Add bank account" onPress={() => router.push({ pathname: '/payout-account', params: { next: '/withdraw' } })} /></Screen>
  );
  const a = s.payoutAccount;
  const amt = Number(amount) || 0;
  const err = amt < MIN_PAYOUT ? `The minimum withdrawal is ${N(MIN_PAYOUT)}` : amt > available ? `You can withdraw up to ${N(available)}` : null;
  const submit = () => {
    if (err) { setTried(true); return; }
    Alert.alert(`Withdraw ${N(amt)}?`, `To ${a.bank} ${maskAcct(a.number)} · ${a.name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', onPress: async () => {
        if (!(await run(() => backend.withdraw(get, set, amt, a)))) return;
        const w = ledger(get()).find(t => t.kind === 'withdrawal');
        router.replace({ pathname: '/withdraw-done', params: { ref: w?.id ?? '' } });
      } },
    ]);
  };
  return (
    <Screen title="Withdraw" footer={<Btn title={busy ? 'Sending…' : `Withdraw ${amt ? N(amt) : ''}`} disabled={busy} onPress={submit} />}>
      <Card tone="blue"><Muted>Available to withdraw</Muted><T style={{ fontSize: 26, fontWeight: '800' }}>{N(available)}</T></Card>
      <Field label="Amount" required error={tried && err}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Input invalid={tried && !!err} value={grouped(amount)} onChangeText={t => setAmount(t.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7))} keyboardType="number-pad" placeholder={`Min ${N(MIN_PAYOUT)}`} icon="₦" /></View>
          <Btn small variant="sec" title="Max" onPress={() => setAmount(String(Math.floor(available)))} style={{ marginTop: 0, paddingHorizontal: 18 }} />
        </View>
      </Field>
      <Field label="Pay into">
        <Card style={{ marginBottom: 0 }}><Row><View><Bold style={{ fontSize: 14 }}>{a.bank} {maskAcct(a.number)}</Bold><Muted>{a.name}</Muted></View><Link onPress={() => router.push({ pathname: '/payout-account', params: { next: '/withdraw' } })}>Change</Link></Row></Card>
      </Field>
      <Muted style={{ fontSize: 12 }}>RepairHub’s team checks and pays withdrawals to your bank. You’ll see it here as Processing until it’s paid.</Muted>
    </Screen>
  );
}

/* ───────── Withdrawal receipt with live status ───────── */

export function WithdrawDone() {
  const { s } = useStore();
  const ref = useLocalSearchParams<{ ref?: string }>().ref;
  const items = ledger(s).filter(t => t.kind === 'withdrawal');
  const w = (items.find(t => t.id === ref) ?? items[0])?.w;
  if (!w) return <Screen title="Withdrawal"><Empty title="No withdrawals yet" sub="Your payouts will appear here." /></Screen>;
  const paid = w.status === 'Paid';
  const steps = ['Requested', 'Processing', 'Paid'];
  return (
    <Screen title="Withdrawal" back={false} footer={<><Btn title="Back to earnings" onPress={() => router.replace('/earnings')} /></>}>
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: paid ? C.okBg : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 32 }}>{paid ? '✅' : w.speed === 'instant' ? '⏳' : '🗓'}</Text></View>
        <Title style={{ marginTop: 10, fontSize: 19 }}>{paid ? 'Money sent' : 'Withdrawal requested'}</Title>
        <T style={{ fontSize: 28, fontWeight: '800' }}>{N(w.amount - w.fee)}</T>
        <Chip tone={paid ? 'ok' : 'warn'} label={paid ? '✓ Paid' : w.status} />
      </View>
      <Stepper steps={steps} current={paid ? 2 : 1} />
      <Card>
        <KV k="Paid into" v={`${w.account.bank} ${maskAcct(w.account.number)}`} /><KV k="Account name" v={w.account.name} />
        <KV k="Amount" v={N(w.amount)} /><KV k="Fee" v={w.fee ? N(w.fee) : 'Free'} /><KV k="You receive" v={N(w.amount - w.fee)} />
        <KV k="Requested" v={`${w.date}, ${w.at}`} /><KV k={paid ? 'Arrived' : 'Expected'} v={paid ? 'Today' : w.eta} /><KV k="Reference" v={w.ref} />
      </Card>
      <Btn title="View full receipt" variant="sec" onPress={() => router.push({ pathname: '/transaction', params: { id: w.ref } })} />
      <Muted style={{ marginTop: 10 }}>Quote the reference if you contact support about this payout.</Muted>
    </Screen>
  );
}

/** Earnings header block: payout account + verification status, used on the Earnings tab. */
export function PayoutSummary() {
  const { s } = useStore();
  const a = s.payoutAccount;
  return (
    <Card>
      <Row>
        <View style={{ flex: 1 }}>
          <Muted style={{ fontSize: 12 }}>Payouts go to</Muted>
          <Bold style={{ fontSize: 14 }}>{a ? `${a.bank} ${maskAcct(a.number)} · ${a.name}` : 'No payout account yet'}</Bold>
          <Muted style={{ fontSize: 12 }}>Withdrawals are paid out by RepairHub’s team</Muted>
        </View>
        <Link onPress={() => router.push('/payout-account')}>{a ? 'Manage' : 'Set up'}</Link>
      </Row>
    </Card>
  );
}


/* ───────── Ledger: every wallet movement, for the Earnings list and the receipt screen ───────── */
