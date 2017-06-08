var join = require("path").join;
var fs = require("fs");
var getID = require("jetpack-id");
var semver = require("semver");
var resolve = require("resolve");
var utils = require("./utils");

/**
 * Takes a root directory for an addon, where the package.json lives,
 * and build options and validates the information available in the addon.
 *
 * @param {Object} rootPath
 * @return {Object}
 */

function validate (rootPath) {
  var manifest;
  var webextensionManifest;

  var errors = {};

  try {
    manifest = JSON.parse(fs.readFileSync(join(rootPath, "package.json")));
  } catch (e) {
    errors.parsing = utils.getErrorMessage("COULD_NOT_PARSE") + "\n" + e.message;
    return errors;
  }

  if (!validateID(manifest)) {
    errors.id = utils.getErrorMessage("INVALID_ID");
  }

  if (!validateMain(rootPath)) {
    errors.main = utils.getErrorMessage("MAIN_DNE");
  }

  if (!validateTitle(manifest)) {
    errors.title = utils.getErrorMessage("INVALID_TITLE");
  }

  if (!validateName(manifest)) {
    errors.name = utils.getErrorMessage("INVALID_NAME");
  }

  if (!validateVersion(manifest)) {
    errors.version = utils.getErrorMessage("INVALID_VERSION");
  }

  // If both a package.json and a manifest.json files exists in the addon
  // root dir, raise an helpful error message that suggest to use web-ext instead.
  if (fs.existsSync(join(rootPath, "manifest.json"))) {
    errors.webextensionManifestFound = utils.getErrorMessage("WEBEXT_ERROR");
  }

  return errors;
}
module.exports = validate;

function validateID (manifest) {
  return !!getID(manifest);
}
validate.validateID = validateID;

function validateTitle (manifest) {
  var name = manifest.title || manifest.name;
  return !!(name && typeof name === "string" && name.length);
}
validate.validateTitle = validateTitle;

function validateName (manifest) {
  return utils.isValidNPMName(manifest.name);
}
validate.validateName = validateName;

function validateMain (dir) {
  try {
    resolve.sync("./", { basedir: dir });
    return true;
  } catch (e) {
    return false;
  }
}
validate.validateMain = validateMain;

function validateVersion (manifest) {
  if (!manifest || typeof manifest.version !== "string") {
    return false;
  }
  return !!semver.valid(manifest.version);
}
validate.validateVersion = validateVersion;
