#v0.2.9
- Lazily install bower if necessary

#v0.2.8
- Bugfix: Support any command `sh -c` or `cmd /d /s /c` can take.

#v0.2.7
- Support peerDependencies
- Support removing packages in scenarios

#v0.2.6
- Update .npmignore

#v0.2.5
- No longer use 'latest' as version for the ember-try-config dependency

#v0.2.4

- Bugfix: Prevent deprecation with recent versions of `core-object`.

#v0.2.3

- Bugfix: Reduce ember-cli load time, but only performing work when running an `ember try:*` command.

#v0.2.2
- Bugfix: Config should not clobber `ember try:ember` arguments

#v0.2.1
- Feature: Ability for addons to set Ember compatibility in a key in `package.json` to run against many Ember versions, see README.
- Feature: New command `ember try:ember <semver-range>`, runs specified command for each Ember verson in the semver range
- Feature: New command `ember try:config`, shows the config that `ember-try` will run with
- Feature: Config file can now export a function that will receive the ember-cli project as a variable
- Feature: Output header at the top of each scenario run to make output easier to parse

#v0.2.0
- Feature: New command `ember try:one <scenario-name>`, replacement for `ember try <scenario-name>` with different command line signature to better accommodate passing options to the command that is run.
- Feature: New command `ember try:each`, replacement for `ember try:testall`, but with a better name for what it can now do. 
- Feature: New configuration option, `command`, top level and within each scenario to set the command that wil be used by `ember-try`.
- Feature: New configuration option, per scenario, `allowedToFail`. If set, `ember-try` will not fail the overall command if the scenario fails.
- Feature: New configuration options, `bowerOptions` and `npmOptions`; these are passed to `bower` and `npm`, respectively, when used by `ember-try`.
- Deprecation: `ember try <scenario-name>` command is deprecated and replaced with `ember try:one <scenario-name>`
- Deprecation: `ember try:testall` command is deprecated and replaced with `ember try:each`.

#v0.1.3
- Bugfix: Passing options to `ember try <scenario> <command>` was broken.  

#v0.1.2
- Exposes which scenario is currently running via  `EMBER_TRY_CURRENT_SCENARIO`
  env var
- Bugfix: Sometimes the table for display at the end wouldn't align 
- Both are thanks to @rwjblue 

#v0.1.1
- New configuration option `--config-file` courtesy of @rwjblue

#v0.1.0
- Feature: Support npm dependencies as well as bower
- Feature: Improved results output

#v0.0.8
- Feature: Support devDependencies in scenarios (Thanks @martndemus)
 
#v0.0.7
- Bugfix: Configure bower to be interactive:false

#v0.0.6
- npmignore /tmp
- Upgrade ember-cli

#v0.0.5
- Pass through arguments to commands (allows `ember try ember-canary test --server`)
- `--skip-cleanup` option for commands `try` and `try:testall` to not restore the default bower dependency set. This is useful in CI environments when the build is being thrown out and not deployed.
- Change built-in scenarios: Now the default includes Ember release, beta and canary as well as a default scenario which uses the version(s) specified in bower.json

#v0.0.4
- Do not require global `bower` or `ember` commands.

#v0.0.3
- Bugfix: `ember try` was always returning non-zero
- Can now specify resolutions under each scenario
- Remove runtime dependency on `ember-cli`
- Remove dependency on git

#v0.0.2
- Make use of bower resolutions to avoid prompts during install
- Warn instead of error if versions specified do not match those in `bower_components/<packageName>/bower.json`
- Update default config to include new Ember versions (Thanks @rwjblue)

#v0.0.1
- Initial version
