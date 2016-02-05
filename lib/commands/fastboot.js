'use strict';

module.exports = {
  name: 'try:fastboot',
  description: 'Tests whether the project is FastBoot Compatible' ,
  works: 'insideProject',
  availableOptions: [
    { name: 'timeout', type: Number, default: 30000 }
  ],

  _NpmAdapter: require('../utils/npm-adapter'),
  _TryEachTask: require('../tasks/try-each'),

  run: function(commandOptions) {

    var dependencyManagerAdapter = new this._NpmAdapter({cwd: this.project.root});
    var tryEachTask = new this._TryEachTask({
      ui: this.ui,
      project: this.project,
      dependencyManagerAdapters: [dependencyManagerAdapter],
      commandArgs: ['fastboot'],
      commandOptions: { timeout: { length: commandOptions.timeout, isSuccess: true }}
    });

    var fastbootScenario = {
      name: 'fastboot',
      npm: {
        devDependencies: {
          'ember-cli-fastboot': '>=0.3.4'
        }
      }
    };
    return tryEachTask.run([fastbootScenario]);
  }
};
