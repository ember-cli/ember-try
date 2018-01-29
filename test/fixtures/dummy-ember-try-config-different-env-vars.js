module.exports = {
  useYarn: true,
  scenarios: [
    {
      name: 'test1',
      command: './fail-if-no-foo.sh',
      env: {
        FOO: true
      },
      npm: {}
    },
    {
      name: 'test2',
      command: './fail-if-foo.sh',
      npm: {}
    }
  ]
};
