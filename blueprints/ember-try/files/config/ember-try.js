
'use strict';

module.exports = {
  scenarios: [
    {
      name: "default",
      dependencies: { } // no dependencies needed as the
                        // default is already specified in
                        // the consuming app's bower.json
    },
    {
      name: "ember-release",
      dependencies: {
        "ember": "release"
      }
    },
    {
      name: "ember-beta",
      dependencies: {
        "ember": "beta"
      }
    },
    {
      name: "ember-canary",
      dependencies: {
        "ember": "canary"
      }
    }
  ]
};
