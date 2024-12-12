module.exports = {
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  overrides: [
    {
      env: { mocha: true },
      files: ['test/**/*.js'],
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
