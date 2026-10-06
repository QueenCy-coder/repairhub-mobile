// Entering the signed-in app.
import { router } from 'expo-router';

/** Role switching (demo): one device plays both sides. Plays the launch screen and lands on that role's home. */
/** Enters the signed-in part of the app with a fresh history, so Back never returns to the sign-up screens. */
export function enterApp(to: string) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(to as never);
}
