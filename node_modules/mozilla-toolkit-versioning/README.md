# mozilla-toolkit-versioning

[![Build Status](https://travis-ci.org/jsantell/mozilla-toolkit-versioning.png)](https://travis-ci.org/jsantell/mozilla-toolkit-versioning)

A node library to parse simple [node-semver](https://github.com/isaacs/node-semver/)-ish strings to generate a min and max version of Mozilla platform support using Mozilla's [toolkit version format](https://developer.mozilla.org/en-US/docs/Toolkit_version_format). For comparing versions, check out [mozilla-version-comparator](https://github.com/linagora/mozilla-version-comparator).
## API

### mozVersion.parse(s)

```javascript
var mozVersion = require('mozilla-toolkit-versioning');
var parsed = mozVersion.parse('>=3.6 <= 30.0');
parsed.min; // '3.6'
parsed.max; // '30.0'

var parsed = mozVersion.parse('>26');
parsed.min; // '26.1'
parsed.max; // undefined
```

## Ranges

* `1.2.3` - A specific version
* `>1.2.3` - Greater than a specific version
* `<1.2.3` - Less than a specific version (does not include pre-release)
* `>=1.2.3` - Greater than or equal to a specific version (does not include pre-release)
* `<=1.2.3` - Less than a specific version (DOES include pre-release)
* `>=1.2.3 <=2.3.4` - Between or equal to the range
* `1.2.3 - 2.3.4` := `>=1.2.3 <=2.3.4`

