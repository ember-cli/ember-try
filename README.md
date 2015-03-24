# ember-try

An ember-cli addon to test against multiple bower dependencies, such as `ember` and `ember-data`.

### Installation

```
ember install:addon ember-try
```

### Limitations

Can only change versions for Ember 1.10+ due to template compiler changes that this addon does not attempt to handle.

### Requirements

- Git

### Usage

This addon provides a few commands:

#### `ember try:testall`

This command will run `ember test` with each scenario's specified in the config and exit appropriately.
Especially useful to use on CI to test against multiple `ember` versions.

#### `ember try <scenario> <command (Default: test)>`

This command will run any `ember-cli` command with the specified scenario. The command will default to `ember test`. 

For example:

```
  ember try ember-1.11-with-ember-data-beta-16 test
```

or

```
  ember try ember-1.11-with-ember-data-beta-16 serve
```

#### `ember try:reset`

This command checks out `bower.json` from git, `rm -rf`s `bower_components` and runs `bower install`. 
For use if any of the other commands fail to clean up after (they run this by default on completion).

### Config

Configuration will be read from a file in your ember app in `config/ember-try.js`. It should look like: 

```js
module.exports = {
  scenarios: [
    {
      name: "Ember 1.10 with ember-data",
      dependencies: {
        "ember": "1.10.0",
        "ember-data": "1.0.0-beta.15"
      }
    },
    {
      name: "Ember 1.11.0-beta.5",
      dependencies: {
        "ember": "1.11.0-beta.5"
      }
    }
  ]
};
```

Scenarios are sets of dependencies (`bower` only). They can be specified exactly as in the `bower.json`
The `name` can be used to try just one scenario using the `ember try` command.
 
If no `config/ember-try.js` file is present, the default config will be used. This is the current default config:

```js
{
  scenarios: [
    {
      name: 'ember-1.10',
      dependencies: {
        "ember": "1.10.0"
      }
    },
    {
      name: 'ember-1.11.0-beta.5',
      dependencies: {
        "ember": "1.11.0-beta.5"
      }
    }
  ]
}
```

See an example of using `ember-try` for CI [here](https://github.com/kategengler/ember-feature-flags/commit/aaf0226975c76630c875cf6b923fdc23b025aa79), and the resulting build [output](https://travis-ci.org/kategengler/ember-feature-flags/builds/55597086). 

### Special Thanks

- Much credit is due to [Edward Faulkner](https://github.com/ef4) The scripts in [liquid-fire](https://github.com/ef4/liquid-fire) that test against multiple ember versions were the inspriation for this project.

### TODO
- [ ] Add tests
- [ ] Add a blueprint for the config
- [ ] Add 'force' option to commands to proceed even if bower.json is dirty
- [ ] Look into `SilentError` as seen on other `ember-cli` addons to see if its preferable to `throw new Error` for preconditions.
