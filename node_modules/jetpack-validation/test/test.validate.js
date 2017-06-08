var join = require("path").join;
var chai = require("chai");
var expect = chai.expect;
var validate = require("../");

var FIXTURES = join(__dirname, "fixtures");

describe("validate", function () {

  it("Passes when no errors found", function () {
    var errors = validate(join(FIXTURES, "valid"));
    expect(Object.keys(errors).length).to.be.equal(0);
  });

  it("Reports parsing failures", function () {
    var errors = validate(join(FIXTURES, "invalidjson"));
    expect(Object.keys(errors).length).to.be.equal(1);
    expect(errors.parsing).to.contain("Could not parse");
  });

  it("Reports main DNE failures", function () {
    var errors = validate(join(FIXTURES, "dne_1"));
    expect(Object.keys(errors).length).to.be.equal(1);
    expect(errors.main).to.contain("no valid entry point");
  })

  it("Reports invalid id failures", function () {
    var errors = validate(join(FIXTURES, "invalidid"));
    expect(Object.keys(errors).length).to.be.equal(1);
    expect(errors.id).to.contain("valid IDs");
  });
  
  it("Reports invalid version failures", function () {
    var errors = validate(join(FIXTURES, "invalidversion"));
    expect(Object.keys(errors).length).to.be.equal(1);
    expect(errors.version).to.contain("semantic");
  });

  it("Reports WebExtension Manifest found failures", function () {
    var errors = validate(join(FIXTURES, "webextensionmanifest"));
    expect(Object.keys(errors).length).to.be.equal(1);
    expect(errors.webextensionManifestFound).to.contain("web-ext");
  });
});
