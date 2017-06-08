var chai = require("chai");
var expect = chai.expect;
var validateVersion = require("../").validateVersion;

describe("exports.validateVersion", function () {
  
  it("Passes when `version` is a valid mozilla toolkit format version", function () {
    expect(validateVersion({ version: "1.4.0" })).to.be.equal(true);
    expect(validateVersion({ version: "4.3.1-beta" })).to.be.equal(true);
  });
  
  it("Fails when no `version` specified.", function () {
    expect(validateVersion({})).to.be.equal(false);
  });
  it("Fails when `version` is not a string.", function () {
    expect(validateVersion({ version: 5 })).to.be.equal(false);
  });
});
