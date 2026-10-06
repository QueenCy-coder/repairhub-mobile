// Bank account for payouts.
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { Banner, Bold, Btn, C, Card, Chip, Empty, Field, Input, Link, mono, Muted, Opt, Row, Screen, T } from '../../../shared/components/ui';
import { BANKS, maskAcct, PayoutAccount } from '../../../shared/core/data';
import { useStore } from '../../../shared/core/store';
import { PinBoxes, resolveName, upper } from './verification';

export function PayoutAccountScreen() {
  const { s, set, toast, notify } = useStore();
  const back = useLocalSearchParams<{ next?: string }>().next;
  const [editing, setEditing] = React.useState(!s.payoutAccount);
  const [bank, setBank] = React.useState(s.payoutAccount?.bank ?? '');
  const [q, setQ] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [name, setName] = React.useState(upper(s.techName));
  const [tried, setTried] = React.useState(false);
  const [allBanks, setAllBanks] = React.useState(false);

  if (!editing && s.payoutAccount) {
    const a = s.payoutAccount;
    return (
      <Screen title="Payout account" footer={back ? <Btn title="Continue" onPress={() => router.replace(back as never)} /> : undefined}>
        <Card tone="blue">
          <Row><Bold>{a.bank}</Bold></Row>
          <T style={{ fontSize: 20, fontWeight: '800', fontFamily: mono, marginVertical: 6 }}>{a.number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}</T>
          <Muted>{a.name}</Muted>
        </Card>
        <Muted>All withdrawals are paid into this account. It must be in your own name.</Muted>
        <Btn title="Change payout account" variant="sec" onPress={() => { setEditing(true); setBank(''); setNumber(''); setName(upper(s.techName)); }} />
      </Screen>
    );
  }

  const lookup = (n: string) => setNumber(n);
  const save = () => {
    const problem = !bank ? 'Choose your bank' : number.length !== 10 ? 'Enter your 10-digit account number' : name.trim().length < 3 ? 'Enter the account name' : null;
    if (problem) { setTried(true); toast(problem); return; }
    const acct: PayoutAccount = { bank, number, name: name.trim().toUpperCase() };
    set({ payoutAccount: acct });
    notify('Payout account updated', `Withdrawals now go to ${bank} ${maskAcct(number)}.`, '/payout-account', 'technician');
    toast('Payout account saved');
    if (back) router.replace(back as never); else setEditing(false);
  };
  const matches = BANKS.filter(b => b.toLowerCase().includes(q.toLowerCase()));
  // Show the most-used banks first; the full list appears on search or "Show all".
  const banks = q || allBanks ? matches : matches.slice(0, 6);
  return (
    <Screen title={s.payoutAccount ? 'Change payout account' : 'Add payout account'} footer={<Btn title="Save account" onPress={save} />}>
      <Field label="Bank" required error={tried && !bank ? 'Choose your bank' : null}>
        {bank ? <Opt label={bank} on onPress={() => setBank('')} sub="Tap to change" /> : <>
          <Input icon="⌕" value={q} onChangeText={setQ} placeholder="Search banks" />
          <View style={{ marginTop: 8 }}>{banks.map(b => <Opt key={b} label={b} on={false} onPress={() => { setBank(b); setQ(''); setAllBanks(false); if (number.length === 10) lookup(number); }} />)}</View>
          {!q && !allBanks && matches.length > banks.length ? <Link onPress={() => setAllBanks(true)}>Show all {matches.length} banks</Link> : null}
          {q && !matches.length ? <Muted>No bank matches “{q}”.</Muted> : null}
        </>}
      </Field>
      <Field label="Account number (NUBAN)" required error={tried && number.length !== 10 ? 'Account number must be 10 digits' : null}>
        <Input invalid={tried && number.length !== 10} value={number} onChangeText={t => lookup(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="10 digits" maxLength={10} />
      </Field>
      <Field label="Account name" required error={tried && name.trim().length < 3 ? 'Enter the account name' : null}>
        <Input value={name} onChangeText={setName} autoCapitalize="characters" placeholder="As shown by your bank" />
      </Field>
      <Muted style={{ fontSize: 12 }}>Payouts can only go to an account in your own name. RepairHub checks it before paying.</Muted>
    </Screen>
  );
}

/* ───────── Withdraw: amount → speed → review → PIN ───────── */
