var join = require("path").join;
var fs = require("fs");

function getErrorMessage (error) {
  return fs.readFileSync(join(__dirname, "./data/", error), "utf8");
}
exports.getErrorMessage = getErrorMessage;

function isValidNPMName (s) {
  if (typeof s !== "string") {
    return false;
  }
  return /^[a-z0-9\.][a-z0-9\-_\.]*$/.test(s);
}
exports.isValidNPMName = isValidNPMName;
