// Transaction ledger and receipts.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Share, Pressable, View, Text } from 'react-native';
import { C, mono, Muted, T, Bold, Btn, Card, Chip, Empty, KV, Link, Row, Screen, Timeline } from '../../../shared/components/ui';
import { shortRef } from '../../../shared/core/api';
import { Withdrawal, PayoutAccount, sessionId, fmtTime, maskAcct, State, COMMISSION, N, shortDate } from '../../../shared/core/data';
import { call, shareText } from '../../../shared/core/native';
import { useStore } from '../../../shared/core/store';

export type LedgerItem = {
  id: string; kind: 'withdrawal' | 'credit'; title: string; sub: string; amount: number; status: string; date: string; time: string;
  w?: Withdrawal; job?: { id: string; dev: string; cust: string; gross: number };
};

export const LEGACY_ACCOUNT: PayoutAccount = { bank: 'GTBank', number: '0123454821', name: 'EMEKA NWOSU' };

export const OLD_PAYOUT: Withdrawal = { ref: 'WD-250925', amount: 20000, fee: 0, speed: 'weekly', status: 'Paid', at: '09:00', date: 'Fri 25 Sep 2026', paidAt: '09:02', eta: 'Fri 25 Sep', account: LEGACY_ACCOUNT, sessionId: sessionId('WD-250925', '260925', '090000') };

export const JOB_TIMES = ['4:12 PM', '11:40 AM', '2:05 PM', '5:30 PM', '10:15 AM', '1:20 PM'];

export function ledger(s: State): LedgerItem[] {
  // Wallet movements from the API: job payments released to the wallet, and withdrawals to the bank.
  const items: LedgerItem[] = [];
  for (const t of s.apiTxns ?? []) {
    const date = shortDate(t.at), time = fmtTime(t.at);
    if (t.type === 'withdrawal') {
      const status = t.status === 'success' ? 'Paid' : t.status === 'failed' ? 'Failed' : 'Processing';
      const account = { bank: t.bank ?? 'Bank', number: t.acct ?? '', name: t.name ?? s.techName };
      const w: Withdrawal = { ref: t.ref, amount: t.amount, fee: 0, speed: 'weekly', status: status as Withdrawal['status'], at: time, date, eta: 'Once RepairHub processes it', account };
      items.push({ id: t.ref, kind: 'withdrawal', title: `Withdrawal to ${account.bank} ${maskAcct(account.number)}`, sub: status === 'Paid' ? '✓ Paid' : status, amount: -t.amount, status, date, time, w });
    } else if (t.type === 'payout') {
      const j = (s.doneJobs ?? []).find(x => x.apiJobId === t.jobId);
      const gross = j?.gross ?? Math.round(t.amount / (1 - COMMISSION / 100));
      items.push({ id: t.ref, kind: 'credit', title: `${j?.dev ?? 'Repair'} · ${j?.cust ?? 'Customer'}`, sub: '✓ Escrow released', amount: t.amount, status: 'Completed', date, time, job: { id: j?.id ?? shortRef(t.jobId), dev: j?.dev ?? 'Repair', cust: j?.cust ?? 'Customer', gross } });
    }
  }
  return items;
}

/** Copy to clipboard on web; share sheet on device (no extra native module needed). */
export function copy(text: string, label: string, toast: (m: string) => void) {
  const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
  if (nav?.clipboard) nav.clipboard.writeText(text).then(() => toast(`${label} copied`)).catch(() => Share.share({ message: text }));
  else Share.share({ message: text }).catch(() => {});
}

export const CopyIcon = ({ done }: { done: boolean }) => <Ionicons name={done ? 'checkmark' : 'copy-outline'} size={16} color={done ? C.okInk : C.primary} />;

export const Copyable = ({ k, v, label }: { k: string; v: string; label: string }) => {
  const { toast } = useStore();
  const [done, setDone] = React.useState(false);
  const onCopy = () => { copy(v, label, toast); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 7 }}>
      <Muted style={{ fontSize: 14, flexShrink: 0 }}>{k}</Muted>
      <Pressable onPress={onCopy} accessibilityRole="button" accessibilityLabel={`Copy ${label}`} hitSlop={8} style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', fontFamily: mono, textAlign: 'right' }}>{v.length > 16 ? v.replace(/(.{6})(?=.)/g, '$1 ') : v}</T>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: done ? C.okBg : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><CopyIcon done={done} /></View>
      </Pressable>
    </View>
  );
};

/* ───────── Transaction details / receipt ───────── */

export function TransactionDetail() {
  const { s, toast } = useStore();
  const id = useLocalSearchParams<{ id?: string }>().id;
  const t = ledger(s).find(x => x.id === id);
  if (!t) return <Screen title="Transaction"><Empty title="Transaction not found" sub="Pull to refresh, or check again in a moment." /></Screen>;
  const credit = t.kind === 'credit';
  const receipt = credit
    ? `RepairHub receipt\n${t.title}\nCredited: ${N(t.amount)}\nJob: ${t.job!.id}\nTransaction ID: ${t.id}\n${t.date}, ${t.time}`
    : `RepairHub payout receipt\nAmount: ${N(t.w!.amount - t.w!.fee)}\nTo: ${t.w!.account.bank} ${t.w!.account.number} (${t.w!.account.name})\nReference: ${t.w!.ref}\n${t.date}, ${t.time}\nStatus: ${t.status}`;
  return (
    <Screen title="Transaction details" footer={<><Btn title="⬆ Share receipt" onPress={async () => { const r = await shareText('RepairHub receipt', receipt); if (r === 'copied') toast('Receipt copied. Paste it into WhatsApp, email or notes'); else if (r === 'failed') toast('Couldn’t share the receipt on this device'); }} /><Pressable onPress={() => call('+2348000000000')} style={{ alignItems: 'center', marginTop: 10 }}><Link>Report a problem with this transaction</Link></Pressable></>}>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: credit ? C.okBg : C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26 }}>{credit ? '↙' : '↗'}</Text></View>
        <Muted style={{ marginTop: 8 }}>{credit ? 'Job payment received' : 'Withdrawal'}</Muted>
        <T style={{ fontSize: 30, fontWeight: '800', color: credit ? C.okInk : C.ink }}>{credit ? '+' : '−'}{N(Math.abs(t.amount))}</T>
        <Chip tone={t.status === 'Paid' || t.status === 'Completed' ? 'ok' : 'warn'} label={t.status === 'Paid' || t.status === 'Completed' ? `✓ ${t.status}` : t.status} />
      </View>

      {credit ? <>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Job</Bold>
          <KV k="Job ID" v={t.job!.id} /><KV k="Device" v={t.job!.dev} /><KV k="Customer" v={t.job!.cust} />
        </Card>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Breakdown</Bold>
          <KV k="Customer paid (escrow)" v={N(t.job!.gross)} /><KV k={`RepairHub commission (${COMMISSION}%)`} v={`−${N(t.job!.gross * COMMISSION / 100)}`} />
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
          <Row><Bold>Credited to your wallet</Bold><Bold style={{ color: C.okInk }}>{N(t.amount)}</Bold></Row>
        </Card>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Details</Bold>
          <KV k="Date" v={t.date} /><KV k="Time" v={t.time} /><KV k="Type" v="Escrow release" /><KV k="Credited to" v="RepairHub wallet" />
          <Copyable k="Transaction ID" v={t.id} label="Transaction ID" />
        </Card>
      </> : <>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Recipient</Bold>
          <KV k="Bank" v={t.w!.account.bank} /><KV k="Account name" v={t.w!.account.name} />
          <Copyable k="Account number" v={t.w!.account.number} label="Account number" />
        </Card>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Amount</Bold>
          <KV k="Withdrawal" v={N(t.w!.amount)} /><KV k="Fee" v={t.w!.fee ? `−${N(t.w!.fee)}` : 'Free'} />
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
          <Row><Bold>Amount received</Bold><Bold>{N(t.w!.amount - t.w!.fee)}</Bold></Row>
        </Card>
        <Card>
          <Bold style={{ marginBottom: 4 }}>Transfer details</Bold>
          <Copyable k="Reference" v={t.w!.ref} label="Reference" />
          <KV k="Narration" v={`RepairHub payout ${t.w!.ref}`} />
          <KV k="Requested" v={`${t.date}, ${t.time}`} />
          <KV k={t.status === 'Paid' ? 'Paid' : 'Expected'} v={t.status === 'Paid' ? `${t.date}, ${t.w!.paidAt ?? t.time}` : t.w!.eta} />
        </Card>
        <Timeline items={[
          { label: 'Withdrawal requested', sub: `${t.date}, ${t.time}`, state: 'done' },
          { label: 'Processed by RepairHub', sub: t.status === 'Paid' ? 'Completed' : t.w!.eta, state: t.status === 'Paid' ? 'done' : 'now' },
          { label: `Paid into ${t.w!.account.bank} ${maskAcct(t.w!.account.number)}`, sub: t.status === 'Paid' ? `${t.date}, ${t.w!.paidAt ?? t.time}` : 'Pending', state: t.status === 'Paid' ? 'done' : 'todo' },
        ]} />
      </>}
    </Screen>
  );
}
