module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // Muss zuletzt stehen
  ],
  plugins: [
    'react',
    'react-native',
    '@typescript-eslint',
    'prettier',
    'react-hooks',
  ],
  env: {
    browser: true,
    node: true,
    'react-native/react-native': true,
    es6: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Beispielregeln, die du anpassen kannst
    'prettier/prettier': 'error',
    'react-hooks/rules-of-hooks': 'error', // Überprüft die Regeln der Hooks
    'react-hooks/exhaustive-deps': 'warn', // Überprüft die Abhängigkeiten der Hooks
    // Weitere benutzerdefinierte Regeln
  },
};
