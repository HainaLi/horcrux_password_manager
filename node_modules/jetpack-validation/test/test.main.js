var join = require("path").join;
var chai = require("chai");
var expect = chai.expect;
var validateMain = require("../").validateMain;

var MAIN_DEFINED_AND_DNE = join(__dirname, "./fixtures", "dne_1");
var MAIN_DEFINED_AND_EXISTS = join(__dirname, "./fixtures", "dne_2");
var MAIN_UNDEFINED_WITH_INDEXJS = join(__dirname, "./fixtures", "dne_3");
var MAIN_DEFINED_AS_DIRECTORY_WITH_INDEXJS = join(__dirname, "./fixtures", "dne_4");
var MAIN_DEFINED_AS_DIRECTORY_WITHOUT_INDEXJS = join(__dirname, "./fixtures", "dne_5");
var MAIN_UNDEFINED_WITHOUT_INDEXJS = join(__dirname, "./fixtures", "dne_6");

describe("exports.validateMain", function () {

  it("Passes when `main` is defined and file exists", function () {
    expect(validateMain(MAIN_DEFINED_AND_EXISTS)).to.be.equal(true);
  });

  it("Passes when `main` undefined and but index.js exists", function () {
    expect(validateMain(MAIN_UNDEFINED_WITH_INDEXJS)).to.be.equal(true);
  });

  it("Passes when `main` is defined as a directory containing an index.js", function () {
    expect(validateMain(MAIN_DEFINED_AS_DIRECTORY_WITH_INDEXJS)).to.be.equal(true);
  });

  it("Fails when `main` is defined as a directory not containing an index.js", function () {
    expect(validateMain(MAIN_DEFINED_AS_DIRECTORY_WITHOUT_INDEXJS)).to.be.equal(false);
  });

  it("Fails when `main` defined and file does not exist", function () {
    expect(validateMain(MAIN_DEFINED_AND_DNE)).to.be.equal(false);
  });

  it("Fails when `main` undefined and indexjs does not exist", function () {
    expect(validateMain(MAIN_UNDEFINED_WITHOUT_INDEXJS)).to.be.equal(false);
  });

});
