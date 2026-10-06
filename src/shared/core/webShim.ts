// Web-only shims so the browser preview behaves like the iOS app.
// Native builds ignore this file's effects entirely (Platform.OS !== 'web').
import { Alert, AlertButton, Platform } from 'react-native';
import { showDialog } from '../components/alertHost';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // react-native-web's Alert.alert is a no-op, which silently breaks confirmations. Route it to the in-app dialog.
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => showDialog(title, message, buttons);

  // Hide the focus ring after mouse/touch clicks, keep it for keyboard users (accessibility).
  const style = document.createElement('style');
  style.textContent = ':focus:not(:focus-visible){outline:none!important} input,textarea{outline:none}';
  document.head.appendChild(style);
}
