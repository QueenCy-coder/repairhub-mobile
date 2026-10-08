// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'tools/*'],
  },
  {
    // These rules come from the React Compiler, which this app doesn't use (app.json has no reactCompiler).
    // They flag standard React Native patterns (Animated values in refs, "latest value" refs, countdowns using
    // Date.now) that are fine without the compiler, so they are warnings rather than errors.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
