const ArrayUtil = {};
ArrayUtil.uniqueNumbers = function (numbers) {
  const sorted = numbers.slice();
  sorted.sort();
  const unique = [];
  let prev = null;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || prev !== sorted[i]) {
      unique.push(sorted[i]);
    }
    prev = sorted[i];
  }
  return unique;
};

export default ArrayUtil;
