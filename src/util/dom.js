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
    self.walkElements($(this), enter, leave);
  });
  if (leave) {
    leave(elem);
  }
};

DomUtil._isLineBreakingTag = function (tagName) {
  var tagNameUpper = tagName.toUpperCase();
  return tagNameUpper === 'P' || tagNameUpper == 'DIV' || tagNameUpper === 'SECTION' || tagNameUpper === 'ARTICLE';
};

DomUtil.serializeElementText = function (elem) {
  var textParts = [];
  DomUtil.walkElements(elem, function (item) {
    if (item[0].nodeType === Node.TEXT_NODE) {
      textParts.push(item[0].nodeValue);
    }
  }, function (item) {
    if (item[0].tagName && DomUtil._isLineBreakingTag(item[0].tagName)) {
      textParts.push(' ');
    }
  });
  return textParts.join('');
};

DomUtil.serializeElementTextWithOffsets = function (elem) {
  var nodeInfo = [];
  var textParts = [];
  var length = 0;
  DomUtil.walkElements(elem, function (item) {
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
    if (item[0].tagName && DomUtil._isLineBreakingTag(item[0].tagName)) {
      textParts.push(' ');
      length++;
    }
  });
  return { nodeInfo: nodeInfo, text: textParts.join('') };
};
