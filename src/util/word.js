const WordUtil = {};

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

export default WordUtil;
