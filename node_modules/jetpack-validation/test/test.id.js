var chai = require("chai");
var expect = chai.expect;
var validateID = require("../").validateID;

/**
 * Most of these tests are handled in the `jetpack-id` dependency, so this
 * is mostly just redundant.
 */
describe("exports.validateID", function () {
  
  it("Passes when `id` is a guid", function () {
    expect(validateID({ id: "{8490ae4f-93bc-13af-80b3-39adf9e7b243}" })).to.be.equal(true);
  });
  it("Passes when `id` is a domain", function () {
    expect(validateID({ id: "my-jetpacks@domain.yup" })).to.be.equal(true);
  });
  it("Passes when `name` is available and contains safe characters", function () {
    expect(validateID({ name: "my-jetpacks" })).to.be.equal(true);
  });

  it("Fails when `id` is neither a guid or domain", function () {
    expect(validateID({ id: "my-jetpacks", name: "@doesntmatter" })).to.be.equal(false);
  });
  it("Fails when neither `id` nor `name` specified", function () {
    expect(validateID({})).to.be.equal(false);
  });
});
