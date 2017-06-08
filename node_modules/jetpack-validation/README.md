jetpack-validation
==================

[![Build Status](http://img.shields.io/travis/mozilla-jetpack/jetpack-validation.svg?style=flat-square)](https://travis-ci.org/mozilla-jetpack/jetpack-validation)
[![Build Status](http://img.shields.io/npm/v/jetpack-validation.svg?style=flat-square)](https://www.npmjs.org/package/jetpack-validation)

Validate a directory with a manifest for Firefox Add-ons using the [Jetpack/Add-on SDK](https://github.com/mozilla/addon-sdk/) and [jpm](https://github.com/mozilla/jpm).

## Install

```
npm install jetpack-validate --save
```

## Usage

The main export takes a path to a directory and returns an object containing properties that have error messages as values. Some should be showstoppers (invalid ID) and some should just be used as warnings (invalid semver version, only for use with npm).

```
var validate = require("jetpack-validation");

var errors = validate("/path/to/my/addon");

if (Object.keys(errors).length) {
  Object.keys(errors).forEach(function (key) {
    console.error("Found " + key + " error: " + errors[key]);
  });
} else {
  console.log("No errors found!");
}
```

## Validations

* **id**: Uses [jetpack-id](https://github.com/jsantell/jetpack-id) to ensure a proper ID for [AMO](https://addons.mozilla.org/en-US/firefox/). Manifest must contain either an `id` field, adhering to Mozilla's [Add-on manifest rules](https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#id) as either a GUID or a domain (in the case of jetpack addons converted from the cfx tool), or just a valid `name` field, which works as identification in `jpm` addons, and is compatable with `npm`'s naming scheme.
* **main**: Ensures that the `main` entry in the manifest refers to a file that exists, or resolves to a file that exists (using node loading rules), or that there is an `index.js` file in the root.
* **title**: Ensures that the manifest contains either a `title` property to be displayed when using the addon, and falls back to the more strict `name` property.
* **name**: Validates that the `name` property is a valid name for use with `npm`.
* **version**: Validates that the `version` property is in proper [semver](http://semver.org) format, for use with `npm`, as Mozilla's [toolkit version format](https://developer.mozilla.org/en-US/docs/Toolkit_version_format) is much less strict.

## License

MIT License, Copyright (c) 2014 Jordan Santell
