// Service center profile tab: business details, verification and account menu.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';
import { Avatar, Bar, Banner, Bold, Btn, C, Card, IconTile, Muted, Row, Screen, T } from '../../shared/components/ui';
import { maskAcct, plural } from '../../shared/core/data';
import * as backend from '../../shared/core/backend';
import { pickMedia } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { useLogout } from '../auth/login';
import { areaSummary } from '../technician/common';

/** One row of the profile menu. */
const MenuRow = ({ icon, label, sub, onPress }: { icon: string; label: string; sub?: string; onPress: () => void }) => (
  <Card onPress={onPress} style={{ paddingVertical: 12 }}><Row style={{ gap: 8 }}><Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}><IconTile glyph={icon} size={38} /><View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '600' }}>{label}</T>{sub ? <T style={{ fontSize: 12, color: C.mute }} numberOfLines={1}>{sub}</T> : null}</View></Row><T style={{ color: C.mute }}>›</T></Row></Card>
);

export function CenterProfile() {
  const { s, set, get, run } = useStore();
  const logout = useLogout();
  const resubmit = async () => {
    const m = await pickMedia({ limit: 2, allowVideo: false });
    if (m.length) await run(() => backend.submitCenterVerification(get, set, m), 'Documents sent · back in review');
  };
  return (
    <Screen title="Profile" back={false}>
      <Row style={{ justifyContent: 'flex-start', gap: 14, marginBottom: 12 }}>
        <Avatar label={s.centerName} size={64} verified={s.centerVerif === 'verified'} />
        <View style={{ flex: 1 }}>
          <Bold style={{ fontSize: 18 }}>{s.centerName}</Bold>
          <Muted>{s.centerDesc || 'Repair service center'}</Muted>
          {s.centerRating?.avg ? <Muted style={{ fontSize: 13 }}>⭐ {s.centerRating.avg.toFixed(1)} · {plural(s.centerRating.count, 'review')} · {plural(s.centerRating.jobs, 'job')} completed</Muted> : <Muted style={{ fontSize: 13 }}>No ratings yet — your first completed jobs build your score.</Muted>}
          <View style={{ marginTop: 6 }}><Bar pct={85} /></View>
          <Muted style={{ fontSize: 12, marginTop: 2 }}>Profile 85% complete</Muted>
        </View>
      </Row>
      {s.centerVerif !== 'verified' ? (
        <Card tone="soft" style={{ marginBottom: 4 }}>
          <Row style={{ justifyContent: 'flex-start', gap: 12 }}>
            <IconTile glyph={s.centerVerif === 'rejected' ? '⚠️' : '⏳'} size={38} bg={s.centerVerif === 'rejected' ? C.badBg : '#FEF3E2'} />
            <View style={{ flex: 1 }}>
              <Bold style={{ fontSize: 15 }}>{s.centerVerif === 'rejected' ? 'Verification needs attention' : 'Verification in review'}</Bold>
              <Muted style={{ fontSize: 13, marginTop: 2 }}>{s.centerVerif === 'rejected' ? `Fix the problem and resubmit: ${s.rejectNote || 'your business documents were unclear.'}` : 'We’re checking your business documents. Quoting unlocks once verified.'}</Muted>
              {s.centerVerif === 'rejected' ? <Btn small title="Upload documents again" variant="sec" onPress={resubmit} style={{ marginTop: 10, alignSelf: 'flex-start' }} /> : null}
            </View>
          </Row>
        </Card>
      ) : <Banner tone="ok" icon="✓">Your business is verified — you can quote on jobs and build your team.</Banner>}
      {s.centerAddress ? <Card tone="blue" style={{ paddingVertical: 10 }}><Row style={{ justifyContent: 'flex-start', gap: 10 }}><Ionicons name="location-outline" size={18} color={C.primary} /><T style={{ fontSize: 14, color: C.text, flex: 1 }}>{s.centerAddress}</T></Row></Card> : null}
      <MenuRow icon="🛠" label="Services & coverage" sub={`${plural(s.skills.length + (s.extraServices ?? []).length, 'service')} · ${areaSummary(s.areas ?? [])}`} onPress={() => router.push('/services')} />
      <MenuRow icon="👥" label="My team" sub={`${plural((s.centerTeam ?? []).length, 'technician')} · quote on your jobs`} onPress={() => router.push('/center-team')} />
      <MenuRow icon="🏦" label="Payout account" sub={s.payoutAccount ? `${s.payoutAccount.bank} ${maskAcct(s.payoutAccount.number)}` : 'Not set up'} onPress={() => router.push('/payout-account')} />
      <MenuRow icon="🔑" label="Change password" onPress={() => router.push('/new-password')} />
      <Btn title="Log out" variant="ghost" onPress={() => Alert.alert('Log out of RepairHub?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
    </Screen>
  );
}