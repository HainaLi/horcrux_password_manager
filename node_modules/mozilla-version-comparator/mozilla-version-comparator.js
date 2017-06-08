'use strict';

/*
 * return the indexOf the first occurrence of one of char in chars within string.
 * see c++ strpbrk function.
 */
var strpbrk = function(string, chars) {
  for (var i = 0; i < string.length; i++) {
    var index = chars.indexOf(string.charAt(i));
    if (index >= 0) {
      return string.indexOf(chars[index]);
    }
  }
  return -1;
};

var parseVersionParts = function(versionPart) {
  var result = {
    numberA: 0,
    numberC: 0
  };

  if (!versionPart) {
    return result;
  }

  if (versionPart === '*') {
    result.numberA = Number.MAX_VALUE;
    result.stringB = '';
    return result;
  } else {
    result.numberA = parseInt(versionPart, 10);
    result.stringB = versionPart.substr(result.numberA.toString().length);
  }

  if (result.stringB[0] === '+') {
    result.stringB = result.stringB.replace('+', 'pre');
    ++result.numberA;
  } else {
    var indexOfNextNumber = strpbrk(result.stringB, '0123456789+-');
    if (indexOfNextNumber >= 0) {
      var extra = result.stringB.substr(indexOfNextNumber);
      result.numberC = parseInt(extra, 10);
      result.stringD = result.stringB.slice(indexOfNextNumber + result.numberC.toString().length);
      result.stringB = result.stringB.slice(0, result.stringB.length - extra.length);
    }
  }

  return result;
};

var compare = function(a, b) {
  if (a > b) {
    return 1;
  } else if (a === b) {
    return 0;
  } else {
    return -1;
  }
};

var strcmp = function(str1, str2) {
  if (!str1) {
    return (str2) ? 1 : 0;
  } else if (!str2) {
    return -1;
  } else {
    return compare(str1.replace(/00/g, '0'), str2.replace(/00/g, '0'));
  }
};

var compareVersionPart = function(versionPart1, versionPart2) {
  if (!versionPart1) {
    return -1;
  } else if (!versionPart2) {
    return 1;
  } else {
    var result = compare(versionPart1.numberA, versionPart2.numberA);
    if (result) {
      return result;
    }

    result = strcmp(versionPart1.stringB, versionPart2.stringB);
    if (result) {
      return result;
    }

    result = compare(versionPart1.numberC, versionPart2.numberC);
    if (result) {
      return result;
    }

    result = strcmp(versionPart1.stringD, versionPart2.stringD);
    return result;
  }
};

var compareVersions = function(version1, version2) {
  var result = 0;

  var partsOfVersion1 = version1.split('.');
  var partsOfVersion2 = version2.split('.');

  var maxLength = Math.max(partsOfVersion1.length, partsOfVersion2.length);

  for (var i = 0; i < maxLength; i++) {
    var versionPart1 = parseVersionParts(partsOfVersion1[i]);
    var versionPart2 = parseVersionParts(partsOfVersion2[i]);
    result = compareVersionPart(versionPart1, versionPart2);
    if (result) {
      return result;
    }
  }

  return result;
};

module.exports = function(v1, v2) {
  return compareVersions(v1, v2);
};
