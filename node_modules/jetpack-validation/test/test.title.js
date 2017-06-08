var chai = require("chai");
var expect = chai.expect;
var validateTitle = require("../").validateTitle;

describe("exports.validateTitle", function () {
  
  it("Passes when `title` specified", function() {
    expect(validateTitle({ title: "yo world" })).to.be.equal(true);
  });
  it("Passes when `name` specified", function() {
    expect(validateTitle({ name: "yo-world" })).to.be.equal(true);
  });
  it("Passes when `name` and `title` specified", function() {
    expect(validateTitle({ title: "yo world", name: "yo-world" })).to.be.equal(true);
  });
  it("Fails when neither `title` or `name` are specified", function () {
    expect(validateTitle({})).to.be.equal(false);
  });
  it("Fails if `title` or `name` is not a string", function () {
    expect(validateTitle({ title: 5 })).to.be.equal(false);
    expect(validateTitle({ name: 5 })).to.be.equal(false);
    expect(validateTitle({ title: {} })).to.be.equal(false);
    expect(validateTitle({ name: true })).to.be.equal(false);
  });
});
