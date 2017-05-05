var ArrayUtil = {};
ArrayUtil.uniqueNumbers = function (numbers) {
  var sorted = numbers.slice();
  sorted.sort();
  var unique = [];
  var prev;
  for (var i = 0; i < sorted.length; i++) {
    if (i === 0 || prev !== sorted[i]) {
      unique.push(sorted[i]);
    }
    prev = sorted[i];
  }
  return unique;
};
