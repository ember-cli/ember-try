export default class {
  setup() {
    return Promise.resolve();
  }

  changeToDependencySet() {
    return Promise.resolve([
      {
        name: 'testDep',
        versionExpected: '2.0.0',
        versionSeen: '2.1.0',
      },
    ]);
  }

  cleanup() {
    return Promise.resolve();
  }
}
