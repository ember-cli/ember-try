'use strict';

var expect        = require('chai').expect;
var autoScenarioConfigForEmber   = require('../../lib/utils/auto-scenario-config-for-ember');

describe('utils/auto-scenario-config-for-ember', function() {

  it('includes default scenarios and works with straight version #', function() {
    var config = autoScenarioConfigForEmber({ ember: '2.0.0' });
    expect(config.scenarios).to.eql([
      {
        name: 'default',
        bower: {
          dependencies: {}
        }
      },
      {
        name: 'ember-beta',
        allowedToFail: true,
        bower: {
          dependencies: {
            ember: 'components/ember#beta'
          },
          resolutions: {
            ember: 'beta'
          }
        }
      },
      {
        name: 'ember-canary',
        allowedToFail: true,
        bower: {
          dependencies: {
            ember: 'components/ember#canary'
          },
          resolutions: {
            ember: 'canary'
          }
        }
      },
      {
        name: 'ember-2.0.0',
        bower: {
          dependencies: {
            ember: '2.0.0'
          }
        }
      }
    ]);
  });

  it('works with complex semver statement', function() {
    var availableVersions = [
      'v1.0.0',
      'v1.0.5',
      'v1.0.8',
      'v1.0.15',
      'v1.0.16',
      '1.13.0',
      'v2.0.0',
      'v2.1.1',
      'v3.0.0',
      'v1.11.0',
      'v1.11.14'
    ];

    var config = autoScenarioConfigForEmber({ ember: '1.0.5 - 1.0.15 || >= 2.1.0 || ^1.11.0' }, availableVersions);
    expect(config.scenarios).to.deep.include.members(
      [
        { name: 'ember-1.0.5', bower: { dependencies: { ember: '1.0.5' } } },
        { name: 'ember-1.0.8', bower: { dependencies: { ember: '1.0.8' } } },
        { name: 'ember-1.0.15', bower: { dependencies: { ember: '1.0.15' } } },
        { name: 'ember-1.13.0', bower: { dependencies: { ember: '1.13.0' } } },
        { name: 'ember-2.1.1', bower: { dependencies: { ember: '2.1.1' } } },
        { name: 'ember-3.0.0', bower: { dependencies: { ember: '3.0.0' } } },
        { name: 'ember-1.11.0', bower: { dependencies: { ember: '1.11.0' } } },
        { name: 'ember-1.11.14', bower: { dependencies: { ember: '1.11.14' } }
      }]
    );
  });

});
