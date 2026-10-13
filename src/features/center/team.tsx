// Service center team: add and remove the technicians who quote on the center's jobs.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Avatar, Btn, C, Card, Empty, Field, H4, Input, Muted, Row, Screen, T } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { useStore } from '../../shared/core/store';
import { emailError } from '../auth/signup';

export function CenterTeam() {
  const { s, set, get, toast, run, busy } = useStore();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const team = s.centerTeam ?? [];
  const err = emailError(email);
  const add = async () => {
    setTried(true);
    if (err) return;
    if (await run(() => backend.addTeamMember(get, set, email), 'Technician added to your team')) { setEmail(''); setTried(false); }
  };
  const remove = (m: { id: string; name: string }) => Alert.alert('Remove from team?', `${m.name} will stop quoting and receiving jobs through your center. Their own profile and past jobs are unaffected.`, [
    { text: 'Keep', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await run(() => backend.removeTeamMember(get, set, m.id), 'Removed from team'); } },
  ]);
  return (
    <Screen title="My team" footer={<Btn title={busy ? 'Adding…' : 'Add technician'} disabled={busy} onPress={add} />}>
      <Muted style={{ fontSize: 14, marginBottom: 14 }}>Your team quotes on your center’s jobs — each quote names the technician who will do the work. Add them by the email on their account.</Muted>
      <Field label="Technician email" required error={tried && err}><Input icon="✉︎" value={email} invalid={tried && !!err} onChangeText={setEmail} placeholder="they@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onSubmitEditing={add} /></Field>
      <H4>Team members · {team.length}</H4>
      {team.length ? team.map(m => (
        <Card key={m.id} style={{ paddingVertical: 12 }}>
          <Row style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar label={m.name} size={44} />
              <View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '700' }}>{m.name}</T><Muted style={{ fontSize: 12 }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</Muted></View>
            </Row>
            <Pressable onPress={() => remove(m)} hitSlop={8} accessibilityLabel={`Remove ${m.name}`}><Ionicons name="person-remove-outline" size={22} color={C.bad} /></Pressable>
          </Row>
        </Card>
      )) : <Empty title="No team members yet" sub="Technicians need a RepairHub account first — then add them here by email." />}
    </Screen>
  );
}