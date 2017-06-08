'use strict';

var expect = require('chai').expect,
    mozCompare = require('./mozilla-version-comparator');

suite('The mozilla-version-comparator', function() {
  suite('verifies', function() {

    //  1.-1
    //  < 1 == 1. == 1.0 == 1.0.0
    //  < 1.1a < 1.1aa < 1.1ab < 1.1b < 1.1c
    //  < 1.1pre == 1.1pre0 == 1.0+
    //  < 1.1pre1a < 1.1pre1aa < 1.1pre1b < 1.1pre1
    //  < 1.1pre2
    //  < 1.1pre10
    //  < 1.1.-1
    //  < 1.1 == 1.1.0 == 1.1.00
    //  < 1.10
    //  < 1.* < 1.*.1
    //  < 2.0

    test('1.-1 < 1', function() {
      expect(mozCompare('1.-1', '1')).to.equal(-1);
    });

    test('1 == 1.', function() {
      expect(mozCompare('1', '1.')).to.equal(0);
    });

    test('1. == 1.0', function() {
      expect(mozCompare('1.', '1.0')).to.equal(0);
    });

    test('1.0 == 1.0.0', function() {
      expect(mozCompare('1.0', '1.0.0')).to.equal(0);
    });

    test('1.0.0 < 1.1a', function() {
      expect(mozCompare('1.0.0', '1.1a')).to.equal(-1);
    });

    test('1.1a < 1.1aa', function() {
      expect(mozCompare('1.1a', '1.1aa')).to.equal(-1);
    });

    test('1.1aa < 1.1ab', function() {
      expect(mozCompare('1.1aa', '1.1ab')).to.equal(-1);
    });

    test('1.1ab < 1.1b', function() {
      expect(mozCompare('1.1ab', '1.1b')).to.equal(-1);
    });

    test('1.1b < 1.1c', function() {
      expect(mozCompare('1.1b', '1.1c')).to.equal(-1);
    });

    test('1.1c < 1.1pre', function() {
      expect(mozCompare('1.1c', '1.1pre')).to.equal(-1);
    });

    test('1.1pre == 1.1.pre0', function() {
      expect(mozCompare('1.1pre', '1.1pre0')).to.equal(0);
    });

    test('1.1pre0 == 1.0+', function() {
      expect(mozCompare('1.1pre0', '1.0+')).to.equal(0);
    });

    test('1.0+ < 1.1.pre1a', function() {
      expect(mozCompare('1.0+', '1.1pre1a')).to.equal(-1);
    });

    test('1.1.pre1a < 1.1.pre1aa', function() {
      expect(mozCompare('1.1pre1a', '1.1pre1aa')).to.equal(-1);
    });

    test('1.1.pre1aa < 1.1.pre1b', function() {
      expect(mozCompare('1.1pre1aa', '1.1pre1b')).to.equal(-1);
    });

    test('1.1.pre1b < 1.1.pre1', function() {
      expect(mozCompare('1.1pre1b', '1.1pre1')).to.equal(-1);
    });

    test('1.1.pre1 < 1.1.pre2', function() {
      expect(mozCompare('1.1pre1', '1.1pre2')).to.equal(-1);
    });

    test('1.1.pre2 < 1.1.pre10', function() {
      expect(mozCompare('1.1pre2', '1.1pre10')).to.equal(-1);
    });

    test('1.1.pre10 < 1.1.-1', function() {
      expect(mozCompare('1.1pre10', '1.1.-1')).to.equal(-1);
    });

    test('1.1.-1 < 1.1', function() {
      expect(mozCompare('1.1.-1', '1.1')).to.equal(-1);
    });

    test('1.1 == 1.1.0', function() {
      expect(mozCompare('1.1', '1.1.0')).to.equal(0);
    });

    test('1.1.0 == 1.1.00', function() {
      expect(mozCompare('1.1.0', '1.1.00')).to.equal(0);
    });

    test('1.1.00 < 1.10', function() {
      expect(mozCompare('1.1.00', '1.10')).to.equal(-1);
    });

    test('1.10 < 1.*', function() {
      expect(mozCompare('1.10', '1.*')).to.equal(-1);
    });

    test('1.* < 1.*.1', function() {
      expect(mozCompare('1.*', '1.*.1')).to.equal(-1);
    });

    test('1.*.1 < 2.0', function() {
      expect(mozCompare('1.*.1', '2.0')).to.equal(-1);
    });

    test('3.0.24 < 24.0.3', function() {
      expect(mozCompare('3.0.24', '24.0.3')).to.equal(-1);
    });

    test('1.001.100 < 1.01.10', function() {
      expect(mozCompare('1.001.100', '1.01.10')).to.equal(-1);
    });
  });

  suite('is reflexive', function() {

    test('1 > 1.-1', function() {
      expect(mozCompare('1', '1.-1')).to.equal(1);
    });

    test('1. == 1', function() {
      expect(mozCompare('1.', '1')).to.equal(0);
    });

    test('1.0 == 1.', function() {
      expect(mozCompare('1.0', '1.')).to.equal(0);
    });

    test('1.0.0 == 1.0', function() {
      expect(mozCompare('1.0.0', '1.0')).to.equal(0);
    });

    test('1.1a > 1.0.0', function() {
      expect(mozCompare('1.1a', '1.0.0')).to.equal(1);
    });

    test('1.1aa > 1.1a', function() {
      expect(mozCompare('1.1aa', '1.1a')).to.equal(1);
    });

    test('1.1ab > 1.1aa', function() {
      expect(mozCompare('1.1ab', '1.1aa')).to.equal(1);
    });

    test('1.1b > 1.1ab', function() {
      expect(mozCompare('1.1b', '1.1ab')).to.equal(1);
    });

    test('1.1c > 1.1b', function() {
      expect(mozCompare('1.1c', '1.1b')).to.equal(1);
    });

    test('1.1pre > 1.1c', function() {
      expect(mozCompare('1.1pre', '1.1c')).to.equal(1);
    });

    test('1.1.pre0 == 1.1pre', function() {
      expect(mozCompare('1.1pre0', '1.1pre')).to.equal(0);
    });

    test('1.0+ == 1.1pre0', function() {
      expect(mozCompare('1.0+', '1.1pre0')).to.equal(0);
    });

    test('1.1.pre1a > 1.0+', function() {
      expect(mozCompare('1.1pre1a', '1.0+')).to.equal(1);
    });

    test('1.1.pre1aa > 1.1.pre1a', function() {
      expect(mozCompare('1.1pre1aa', '1.1pre1a')).to.equal(1);
    });

    test('1.1.pre1b > 1.1.pre1aa', function() {
      expect(mozCompare('1.1pre1b', '1.1pre1aa')).to.equal(1);
    });

    test('1.1.pre1 > 1.1.pre1b', function() {
      expect(mozCompare('1.1pre1', '1.1pre1b')).to.equal(1);
    });

    test('1.1.pre2 > 1.1.pre1', function() {
      expect(mozCompare('1.1pre2', '1.1pre1')).to.equal(1);
    });

    test('1.1.pre10 > 1.1.pre2', function() {
      expect(mozCompare('1.1pre10', '1.1pre2')).to.equal(1);
    });

    test('1.1.-1 > 1.1.pre10', function() {
      expect(mozCompare('1.1.-1', '1.1pre10')).to.equal(1);
    });

    test('1.1 > 1.1.-1', function() {
      expect(mozCompare('1.1', '1.1.-1')).to.equal(1);
    });

    test('1.1.0 == 1.1', function() {
      expect(mozCompare('1.1.0', '1.1')).to.equal(0);
    });

    test('1.1.00 == 1.1.0', function() {
      expect(mozCompare('1.1.00', '1.1.0')).to.equal(0);
    });

    test('1.10 > 1.1.00', function() {
      expect(mozCompare('1.10', '1.1.00')).to.equal(1);
    });

    test('1.* > 1.10', function() {
      expect(mozCompare('1.*', '1.10')).to.equal(1);
    });

    test(' 1.*.1 > 1.*', function() {
      expect(mozCompare('1.*.1', '1.*')).to.equal(1);
    });

    test(' 2.0 > 1.*.1', function() {
      expect(mozCompare('2.0', '1.*.1')).to.equal(1);
    });

    test('24.0.3 > 3.0.24', function() {
      expect(mozCompare('24.0.3', '3.0.24')).to.equal(1);
    });

    test('1.01.10 > 1.001.100', function() {
      expect(mozCompare('1.01.10', '1.001.100')).to.equal(1);
    });
  });
});


