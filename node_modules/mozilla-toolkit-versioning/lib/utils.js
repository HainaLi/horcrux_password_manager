/**
 * Breaks up a version string into the 4 components
 * defined in:
 * https://developer.mozilla.org/en-US/docs/Toolkit_version_format
 * @params {String} val
 * @return {String}
 */
function versionParse (val) {
  return val.match(/^([0-9\.]*)([a-zA-Z]*)([0-9\.]*)([a-zA-Z]*)$/);
}
exports.versionParse = versionParse;
