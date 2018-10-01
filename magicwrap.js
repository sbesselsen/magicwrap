(function () {
  'use strict';

  var DomUtil = {};

  DomUtil.walkElements = function (elem, enter, leave) {
    if (elem.length > 0 && elem[0].tagName) {
      var tagName = elem[0].tagName.toUpperCase();

      if (tagName === 'SCRIPT' || tagName === 'IFRAME') {
        return;
      }
    }

    if (enter) {
      enter(elem);
    }

    var self = this;
    elem.contents().each(function () {
      self.walkElements(elem.constructor.call(null, this), enter, leave);
    });

    if (leave) {
      leave(elem);
    }
  };

  DomUtil.serializeElementText = function (elem, isContentElement) {
    var textParts = [];
    var inNonContentCounter = 0;
    DomUtil.walkElements(elem, function (item) {
      var isContent = isContentElement(item[0]);

      if (!isContent) {
        inNonContentCounter++;
      }

      if (inNonContentCounter > 0) {
        return;
      }

      if (item[0].nodeType === Node.TEXT_NODE) {
        textParts.push(item[0].nodeValue);
      }
    }, function (item) {
      var isContent = isContentElement(item[0]);

      if (!isContent) {
        inNonContentCounter--;
      }

      if (inNonContentCounter > 0) {
        return;
      }

      if (item[0].tagName) {
        textParts.push(' ');
      }
    });
    return textParts.join('');
  };

  DomUtil.serializeElementTextWithOffsets = function (elem, isContentElement) {
    var nodeInfo = [];
    var textParts = [];
    var length = 0;
    var inNonContentCounter = 0;
    DomUtil.walkElements(elem, function (item) {
      var isContent = isContentElement(item[0]);

      if (!isContent) {
        inNonContentCounter++;
      }

      if (inNonContentCounter > 0) {
        return;
      }

      if (item[0].nodeType === Node.TEXT_NODE) {
        var str = item[0].nodeValue;
        nodeInfo.push({
          offset: length,
          length: str.length,
          node: item[0]
        });
        textParts.push(str);
        length += str.length;
      }
    }, function (item) {
      var isContent = isContentElement(item[0]);

      if (!isContent) {
        inNonContentCounter--;
      }

      if (inNonContentCounter > 0) {
        return;
      }

      if (item[0].tagName) {
        textParts.push(' ');
        length++;
      }
    });
    return {
      nodeInfo: nodeInfo,
      text: textParts.join('')
    };
  };

  var ArrayUtil = {};

  ArrayUtil.uniqueNumbers = function (numbers) {
    var sorted = numbers.slice();
    sorted.sort();
    var unique = [];
    var prev = null;

    for (var i = 0; i < sorted.length; i++) {
      if (i === 0 || prev !== sorted[i]) {
        unique.push(sorted[i]);
      }

      prev = sorted[i];
    }

    return unique;
  };

  var NGramUtil = {};

  NGramUtil.generateNgrams = function (words, n) {
    var ngrams = [];

    for (var i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n));
    }

    return ngrams;
  };

  NGramUtil.ngramKey = function (ngram) {
    return ngram.join('|');
  };

  function NGramIndex(words, n) {
    if (n <= 0) {
      throw 'n must be greater than 0';
    }

    if (n > 1) {
      this.shorterNgramIndex = new NGramIndex(words, n - 1);
    }

    this.ngramIndices = {};
    this.ngrams = {};
    this.words = words.slice();
    this.n = n;
    var ngrams = NGramUtil.generateNgrams(words, n);

    for (var i = 0; i < ngrams.length; i++) {
      var ngram = ngrams[i];
      var ngramKey = NGramUtil.ngramKey(ngram);
      this.ngrams[ngramKey] = ngram;

      if (!this.ngramIndices[ngramKey]) {
        this.ngramIndices[ngramKey] = [];
      }

      this.ngramIndices[ngramKey].push(i);
    }
  }

  NGramIndex.prototype.indicesOf = function (words) {
    if (words.length === 0) {
      return [];
    }

    if (words.length < this.n) {
      return this.shorterNgramIndex.indicesOf(words);
    }

    if (words.length > this.n) {
      // Look for the prefix.
      var prefix = words.slice(0, this.n);
      var indices = this.indicesOf(prefix);
      var output = [];

      for (var i = 0; i < indices.length; i++) {
        if (this.hasWordsAtIndex(words, indices[i])) {
          output.push(indices[i]);
        }
      }

      return output;
    }

    var ngramKey = NGramUtil.ngramKey(words);
    return this.ngramIndices[ngramKey] || [];
  };

  NGramIndex.prototype.hasWordsAtIndex = function (words, index) {
    for (var i = 0; i < Math.min(words.length, this.words.length - index); i++) {
      if (this.words[i + index] !== words[i]) {
        return false;
      }
    }

    return true;
  };

  NGramIndex.prototype.wordArray = function () {
    return this.words;
  };

  var WordUtil = {};

  WordUtil.tokenizeString = function (str) {
    var words = (' ' + str).split(/\b/);
    words[0] = words[0].substr(1);
    var tokens = [];
    tokens.push(['', words[0]]);

    if (words.length % 2 === 0) {
      words.push('');
    }

    for (var i = 1; i < words.length - 1; i += 2) {
      tokens.push([words[i], words[i + 1]]);
    }

    if (tokens[0][0] === '' && tokens[0][1] === '') {
      tokens.shift();
    }

    return tokens;
  };

  WordUtil.tokenWords = function (tokens) {
    var words = [];

    for (var i = 0; i < tokens.length; i++) {
      words.push(tokens[i][0]);
    }

    return words;
  };

  WordUtil.normalizeTokens = function (tokens) {
    var normalizedTokens = [];

    for (var i = 0; i < tokens.length; i++) {
      normalizedTokens.push([this.normalizeWord(tokens[i][0]), tokens[i][1]]);
    }

    return normalizedTokens;
  };

  WordUtil.normalizeWord = function (word) {
    return word.toLowerCase();
  };

  var FuzzySequenceUtil = {};

  FuzzySequenceUtil.bestMatchSequence = function (searchIndex, words, ngramSize, maxChanges) {
    if (!ngramSize) {
      ngramSize = 3;
    }

    if (words.length < ngramSize) {
      ngramSize = words.length;
    }

    var minNgramMatches = 2;
    var wordArray = searchIndex.wordArray(); // Determine potential start positions.

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
    var deleteCost = 1; // Find the best prefix match from each start index and optimize over all.

    var bestResult = null;

    for (var i = 0; i < startIndices.length; i++) {
      var startIndex = Math.max(0, startIndices[i]);
      var wordsFromStart = wordArray.slice(startIndex, startIndex + maxChanges * 2 + words.length * 2);
      var result = FuzzySequenceUtil.prefixDistance(wordsFromStart, words, deleteCost, insertCost, 0, maxChanges);

      if (!bestResult || result.distance < bestResult.distance || result.distance === bestResult.distance && startIndex < bestResult.startIndex) {
        bestResult = result;
        bestResult.startIndex = startIndex;
      }
    }

    if (!bestResult) {
      return null;
    } // Now complete the sequence from the best result.


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
    };
  };

  FuzzySequenceUtil.distance = function (a, b, deleteCost, insertCost, copyCost, maxChanges) {
    var memory = {};

    var recursiveDistance = function recursiveDistance(i, j) {
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
    };

    var flatResult = recursiveDistance(a.length, b.length);
    var result = {
      distance: flatResult.distance,
      operations: []
    };

    while (flatResult.operation !== null) {
      result.operations.unshift(flatResult.operation);
      flatResult = flatResult.prev;
    }

    return result;
  };

  FuzzySequenceUtil.prefixDistance = function (a, b, deleteCost, insertCost, copyCost, maxChanges) {
    var result = this.distance(a, b, deleteCost, insertCost, copyCost, maxChanges); // Now cut off the end.

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

    this.isContentElement = options.isContentElement || function () {
      return true;
    };
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
  };

  FuzzyStringMatcher.prototype.populateIndexWithElement = function (element) {
    return this.populateIndexWithString(DomUtil.serializeElementText(element, this.isContentElement));
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

    if (bestMatch.distance > this.maxChanges) {
      // Match is not good enough.
      return null;
    } // Calculate the string offset.


    var result = {
      offset: 0,
      length: 0,
      distance: bestMatch.distance,
      str: null
    };

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

  function isWrappableElement(node) {
    if (node.nodeName) {
      var nodeName = ('' + node.nodeName).toLowerCase();

      if (nodeName.match(/^(span|a|i|b|em|strong|abbr|font)$/)) {
        return true;
      }
    }

    return false;
  }

  function isContentElement(node) {
    return true;
  }

  function magicWrapFactory($) {
    function wrapExactString(elem, str, wrap, isWrappableElement, isContentElement) {
      var textNodes = [];
      var strData = DomUtil.serializeElementTextWithOffsets(elem, isContentElement);
      var offset = strData.text.indexOf(str); // Find all text nodes.

      for (var i = 0; i < strData.nodeInfo.length; i++) {
        var textPart = strData.nodeInfo[i];

        if (textPart.offset >= offset + str.length) {
          // This text node comes after the match.
          break;
        }

        if (textPart.offset + textPart.length < offset) {
          // This text node comes before the match.
          continue;
        } // There is some overlap.


        var startIndex = Math.max(0, offset - textPart.offset);
        var endIndex = Math.min(textPart.length, offset + str.length - textPart.offset);
        var node = textPart.node;

        if (startIndex > 0) {
          // Split off the start.
          node = textPart.node.splitText(startIndex);
        }

        if (endIndex < textPart.length) {
          // Split off the end.
          node.splitText(endIndex - startIndex);
        }

        textNodes.push(node);
      }

      var elementStack = [];
      var wrappableElements = textNodes.slice();
      DomUtil.walkElements(elem, function (enterElem) {
        var node = enterElem[0];

        if (node.nodeType === Node.TEXT_NODE) {
          if (node.nodeValue === '') {
            // Skip empty nodes.
            return;
          }

          var found = textNodes.indexOf(node) !== -1;

          for (var i = 0; i < elementStack.length; i++) {
            elementStack[i].hasTextNodes = true;
            elementStack[i].fullyContained = elementStack[i].fullyContained && found;

            if (found) {
              elementStack[i].wrappedMatchNodes.push(node);
            }
          }
        } else {
          elementStack.push({
            node: node,
            fullyContained: true,
            hasTextNodes: false,
            wrappedMatchNodes: []
          });
        }
      }, function (leaveElem) {
        if (leaveElem[0].nodeType !== Node.TEXT_NODE) {
          var info = elementStack.pop();

          if (info.fullyContained && info.hasTextNodes && isWrappableElement(leaveElem[0])) {
            wrappableElements.push(info.node);

            for (var i = 0; i < info.wrappedMatchNodes.length; i++) {
              var index = wrappableElements.indexOf(info.wrappedMatchNodes[i]);

              if (index !== -1) {
                // This element is already inside another contained element; we don't have to wrap it separately.
                wrappableElements.splice(index, 1);
              }
            }
          }
        }
      });
      return $(wrappableElements).wrap(wrap);
    }

    function createMatcher(elem, isContentElement) {
      var matcher = new FuzzyStringMatcher({
        isContentElement: isContentElement
      });
      matcher.populateIndexWithElement(elem);
      var data = elem.data('magicwrap') || {};
      data.matcher = matcher;
      elem.data('magicwrap', data);
    }

    function remove(elem) {
      elem.removeData('magicwrap');
      removeWraps(elem);
    }

    function removeWraps(elem) {
      elem.find('.magicwrap').contents().unwrap();
    }

    function apply(elem, wraps, isWrappableElement, isContentElement) {
      var data = elem.data('magicwrap');

      if (!data || !data.matcher) {
        return;
      }

      var matcher = data.matcher;
      var wrapHtml = '<span class="magicwrap"></span>';

      for (var i = 0; i < wraps.length; i++) {
        var wrap = wraps[i];
        var exactStr = null;

        if (wrap.exactStr) {
          exactStr = wrap.exactStr;
        } else {
          var result = matcher.matchString(wrap.str);

          if (result) {
            exactStr = result.str;
          }
        }

        if (!exactStr) {
          continue;
        }

        wrapExactString(elem, exactStr, wrapHtml, isWrappableElement, isContentElement).parent().data('magicwrap-wrap', wrap);
      }

      return $('.magicwrap');
    }

    return function (op, args) {
      if (!args) {
        args = {};
      }

      var wraps = args.wraps || [];
      var isContentElementFunction = args.isContentElement || isContentElement;
      var isWrappableElementFunction = args.isWrappableElement || isWrappableElement;

      switch (op) {
        case 'apply':
          remove(this);
          createMatcher(this, isContentElementFunction);
          return apply(this, wraps, isWrappableElementFunction, isContentElementFunction);

        case 'update':
          removeWraps(this);
          return apply(this, wraps, isWrappableElementFunction, isContentElementFunction);

        case 'remove':
          removeWraps(this);
          remove(this);
          break;
      }
    };
  }

  $.fn.magicwrap = magicWrapFactory($);

}());
