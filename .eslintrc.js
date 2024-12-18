module.exports = {
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  overrides: [
    {
      env: { mocha: true },
      files: ['test/**/*.js'],
      parserOptions: { sourceType: 'module' },
      rules: {
        'n/no-extraneous-import': 'off',
      },
    },
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    requireConfigFile: false,
    sourceType: 'script',
  },
  root: true,
  rules: {
    'n/no-process-exit': 'off',
  },
};
