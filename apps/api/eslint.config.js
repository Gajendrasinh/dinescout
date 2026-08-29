const baseConfig = require('@dinescout/eslint-config');

module.exports = [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
