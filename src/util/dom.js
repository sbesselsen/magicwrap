const DomUtil = {};

DomUtil.walkElements = function (elem, enter, leave) {
  if (elem.length > 0 && elem[0].tagName) {
    const tagName = elem[0].tagName.toUpperCase();
    if (tagName === 'SCRIPT' || tagName === 'IFRAME') {
      return;
    }
  }
  if (enter) {
    enter(elem);
  }
  const self = this;
  elem.contents().each(function () {
    self.walkElements(elem.constructor.call(null, this), enter, leave);
  });
  if (leave) {
    leave(elem);
  }
};

DomUtil.serializeElementText = function (elem, isContentElement) {
  const textParts = [];
  let inNonContentCounter = 0;
  DomUtil.walkElements(elem, function (item) {
    const isContent = isContentElement(item[0]);
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
    const isContent = isContentElement(item[0]);
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
  const nodeInfo = [];
  const textParts = [];
  let length = 0;
  let inNonContentCounter = 0;
  DomUtil.walkElements(elem, function (item) {
    const isContent = isContentElement(item[0]);
    if (!isContent) {
      inNonContentCounter++;
    }
    if (inNonContentCounter > 0) {
      return;
    }
    if (item[0].nodeType === Node.TEXT_NODE) {
      const str = item[0].nodeValue;
      nodeInfo.push({
        offset: length,
        length: str.length,
        node: item[0]
      });
      textParts.push(str);
      length += str.length;
    }
  }, function (item) {
    const isContent = isContentElement(item[0]);
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
  return { nodeInfo: nodeInfo, text: textParts.join('') };
};

export default DomUtil;
