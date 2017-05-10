var FuzzySequenceUtil = {};
FuzzySequenceUtil.bestMatchSequence = function (searchIndex, words, ngramSize, maxChanges) {
  if (!ngramSize) {
    ngramSize = 3;
  }
  if (words.length < ngramSize) {
    ngramSize = words.length;
  }
  var minNgramMatches = 2;

  var wordArray = searchIndex.wordArray();

  // Determine potential start positions.
  var queryNgrams = NGramUtil.generateNgrams(words, ngramSize);
  var startIndices = [];
  var seenIndices = {};
  for (var i = 0; i < queryNgrams.length; i++) {
    var queryNgram = queryNgrams[i];
    var ngramIndices = searchIndex.indicesOf(queryNgram);
    for (var j = 0; j < ngramIndices.length; j++) {
      var startIndexOptions = [ngramIndices[j] - i - maxChanges, ngramIndices[j] - i];
      for (var k = 0; k < startIndexOptions.length; k++) {
        var startIndex = startIndexOptions[k];
        if (!seenIndices[startIndex]) {
          seenIndices[startIndex] = 1;
        } else {
          seenIndices[startIndex]++;
        }
        if (seenIndices[startIndex] >= minNgramMatches) {
          startIndices.push(startIndex);
        }
      }
    }
  }
  startIndices = ArrayUtil.uniqueNumbers(startIndices);

  var insertCost = 1;
  var deleteCost = 1;

  // Find the best prefix match from each start index and optimize over all.
  var bestResult = null;
  for (var i = 0; i < startIndices.length; i++) {
    var startIndex = startIndices[i];
    var wordsFromStart = wordArray.slice(startIndex, startIndex + maxChanges * 2 + words.length * 2);
    var result = FuzzySequenceUtil.prefixDistance(wordsFromStart, words, deleteCost, insertCost, 0, maxChanges);
    if (!bestResult || result.distance < bestResult.distance || (result.distance === bestResult.distance && startIndex < bestResult.startIndex)) {
      bestResult = result;
      bestResult.startIndex = startIndex;
    }
  }

  if (!bestResult) {
    return null;
  }

  // Now complete the sequence from the best result.
  var length = 0;
  var index = bestResult.startIndex;
  var distance = bestResult.distance;
  for (var i = 0; i < bestResult.operations.length; i++) {
    if (bestResult.operations[i] === -1) {
      index++;
      distance -= deleteCost;
    } else if (bestResult.operations[i] === 1) {
      distance -= insertCost;
    } else {
      break;
    }
  }
  for (; i < bestResult.operations.length; i++) {
    if (bestResult.operations[i] !== 1) {
      length++;
    }
  }

  return {
    index: index,
    length: length,
    distance: distance
  }
};

FuzzySequenceUtil.distance = function (a, b, deleteCost, insertCost, copyCost, maxChanges) {
  var memory = {};
  var recursiveDistance = function (i, j) {
    var k = i + '|' + j;
    if (k in memory) {
      return memory[k];
    }
    if (i === 0 && j === 0) {
      return {
        distance: 0,
        operation: null,
        prev: null
      };
    }
    if (maxChanges > 0 && Math.abs(i - j) > maxChanges) {
      if (a.length > b.length) {
        if (j < b.length || i < j) {
          return null;
        }
      } else {
        if (i < a.length || j < i) {
          return null;
        }
      }
    }

    var bestResult;

    if (i > 0) {
      var prevResult = recursiveDistance(i - 1, j);
      if (prevResult) {
        var deleteResult = {
          distance: prevResult.distance + deleteCost,
          operation: -1,
          prev: prevResult
        };
        if (!bestResult || deleteResult.distance < bestResult.distance) {
          bestResult = deleteResult;
        }
      }
    }
    if (j > 0) {
      var prevResult = recursiveDistance(i, j - 1);
      if (prevResult) {
        var insertResult = {
          distance: prevResult.distance + insertCost,
          operation: 1,
          prev: prevResult
        };
        if (!bestResult || insertResult.distance < bestResult.distance) {
          bestResult = insertResult;
        }
      }
    }
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      var prevResult = recursiveDistance(i - 1, j - 1);
      if (prevResult) {
        var copyResult = {
          distance: prevResult.distance + copyCost,
          operation: 0,
          prev: prevResult
        };
        if (!bestResult || copyResult.distance < bestResult.distance) {
          bestResult = copyResult;
        }
      }
    }

    memory[k] = bestResult;
    return bestResult;
  }

  var flatResult = recursiveDistance(a.length, b.length);
  var result = {
    distance: flatResult.distance,
    operations: []
  }
  while (flatResult.operation !== null) {
    result.operations.unshift(flatResult.operation);
    flatResult = flatResult.prev;
  }
  return result;
};

FuzzySequenceUtil.prefixDistance = function (a, b, deleteCost, insertCost, copyCost, maxChanges) {
  var result = this.distance(a, b, deleteCost, insertCost, copyCost, maxChanges);

  // Now cut off the end.
  for (var i = result.operations.length - 1; i >= 0; i--) {
    var op = result.operations[i];
    if (op === 0) {
      break;
    }
    if (op === -1) {
      result.distance -= deleteCost;
    } else if (op === 1) {
      result.distance -= insertCost;
    }
  }

  result.operations = result.operations.slice(0, i + 1);
  return result;
};

function FuzzyStringMatcher(options) {
  if (!options) {
    options = {};
  }
  this.nGramSize = options.nGramSize || 3;
  this.maxChanges = options.maxChanges || 10;
}

FuzzyStringMatcher.prototype.populateIndexWithTokens = function (tokens) {
  this.tokens = tokens;

  var normalizedTokens = WordUtil.normalizeTokens(tokens);
  var words = WordUtil.tokenWords(normalizedTokens);

  this.index = new NGramIndex(words, this.nGramSize);
};

FuzzyStringMatcher.prototype.populateIndexWithString = function (str) {
  var tokens = WordUtil.tokenizeString(str);
  return this.populateIndexWithTokens(tokens);
}

FuzzyStringMatcher.prototype.populateIndexWithElement = function (element) {
  return this.populateIndexWithString(DomUtil.serializeElementText(element));
};

FuzzyStringMatcher.prototype.matchString = function (str) {
  var tokens = WordUtil.tokenizeString(str);
  return this.matchTokens(tokens);
};

FuzzyStringMatcher.prototype.matchTokens = function (tokens) {
  if (!this.index) {
    return null;
  }

  var normalizedTokens = WordUtil.normalizeTokens(tokens);
  var words = WordUtil.tokenWords(normalizedTokens);

  var bestMatch = FuzzySequenceUtil.bestMatchSequence(this.index, words, this.nGramSize, this.maxChanges);

  if (!bestMatch) {
    // Perhaps decrease the nGramSize and increase maxChanges?
    return null;
  }

  // Calculate the string offset.
  var result = {
    offset: 0,
    length: 0,
    distance: bestMatch.distance,
    str: null
  }
  for (var i = 0; i < bestMatch.index; i++) {
    var token = this.tokens[i];
    result.offset += token[0].length + token[1].length;
  }
  var strParts = [];
  for (var i = 0; i < bestMatch.length; i++) {
    var token = this.tokens[bestMatch.index + i];
    strParts.push(token[0]);
    if (i < bestMatch.length - 1) {
      strParts.push(token[1]);
    }
  }
  result.str = strParts.join('');
  result.length = result.str.length;

  return result;
};