export const NGramUtil = {};
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

export function NGramIndex(words, n) {
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
};

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
