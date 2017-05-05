var DomUtil = {};

DomUtil.walkElements = function (elem, enter, leave) {
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

DomUtil.serializeElementText = function (elem) {
  var textParts = [];
  DomUtil.walkElements(elem, function (item) {
    if (item[0].nodeType === Node.TEXT_NODE) {
      textParts.push(item[0].nodeValue);
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
  });
  return { nodeInfo: nodeInfo, text: textParts.join('') };
};
