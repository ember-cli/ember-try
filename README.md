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

### Special Thanks

- Much credit is due to [Edward Faulkner](https://github.com/ef4) The scripts in [liquid-fire](https://github.com/ef4/liquid-fire) that test against multiple ember versions were the inspriation for this project.

### TODO
- [ ] Add tests
- [ ] Add a blueprint for the config
- [ ] Add 'force' option to commands to proceed even if bower.json is dirty
- [ ] Look into `SilentError` as seen on other `ember-cli` addons to see if its preferable to `throw new Error` for preconditions.
