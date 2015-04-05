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
