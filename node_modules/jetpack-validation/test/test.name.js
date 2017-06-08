var chai = require("chai");
var expect = chai.expect;
var validateName = require("../").validateName;

describe("exports.validateName", function () {
  
  it("Passes when `name` is a valid npm name", function () {
    expect(validateName({ name: "mymodule" })).to.be.equal(true);
  });
  
  it("Fails when `name` is not defined", function () {
    expect(validateName({})).to.be.equal(false);
  });
  
  it("Fails when `name` contains invalid characters for an npm name", function () {
    expect(validateName({ name: "Monads are just monoids in the category of endofunctors." })).to.be.equal(false);
  });
  
  it("Fails when `name` starts with invalid characters for an npm name", function () {
    expect(validateName({ version: ".sorrybub" })).to.be.equal(false);
  });

});
