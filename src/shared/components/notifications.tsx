// Shared notification list for both roles: an icon per notification type, newest first, tap to open.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Bold, C, Card, Empty, FadeIn, Muted, Row } from './ui';

type Note = { title: string; body: string; at: string; route?: string };
type Icon = React.ComponentProps<typeof Ionicons>['name'];

const KINDS: [RegExp, Icon, string, string][] = [
  [/dispute|issue|problem|declined|incorrect/i, 'alert-circle', C.bad, C.badBg],
  [/warranty/i, 'shield-checkmark', C.primary, C.primarySoft],
  [/quote/i, 'pricetags', '#7A5AF8', '#F4F3FF'],
  [/booking|appointment|rescheduled|cancelled|accepted your/i, 'calendar', C.primary, C.primarySoft],
  [/paid|payment|payout|withdraw|wallet|refund|escrow|released/i, 'wallet', C.okInk, C.okBg],
  [/review|rated/i, 'star', '#B54708', '#FEF6E4'],
  [/completed|repair|status|update|synced|on the way/i, 'construct', C.primary, C.primarySoft],
];
const kind = (t: string) => KINDS.find(([re]) => re.test(t)) ?? [null, 'notifications' as Icon, C.mute, C.soft];

export function NotificationList({ list, emptySub }: { list: Note[]; emptySub: string }) {
  if (!list.length) return <Empty title="You’re all caught up" sub={emptySub} />;
  return (
    <>
      {list.map((n, i) => {
        const [, icon, fg, bg] = kind(n.title);
        return (
          <FadeIn key={i} delay={Math.min(i, 8) * 30}>
            <Card onPress={n.route ? () => router.push(n.route as never) : undefined} style={{ paddingVertical: 12 }}>
              <Row style={{ alignItems: 'flex-start', gap: 12, justifyContent: 'flex-start' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={18} color={fg} /></View>
                <View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>{n.title}</Bold><Muted>{n.body}</Muted></View>
                <Muted style={{ fontSize: 12 }}>{n.at}</Muted>
              </Row>
            </Card>
          </FadeIn>
        );
      })}
    </>
  );
}
