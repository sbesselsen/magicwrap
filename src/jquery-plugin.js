function wrapExactString(elem, str, wrap) {
  var textNodes = [];

  var strData = DomUtil.serializeElementTextWithOffsets(elem);
  var offset = strData.text.indexOf(str);

  // Find all text nodes.
  for (var i = 0; i < strData.nodeInfo.length; i++) {
    var textPart = strData.nodeInfo[i];
    if (textPart.offset >= offset + str.length) {
      // This text node comes after the match.
      break;
    }
    if (textPart.offset + textPart.length < offset) {
      // This text node comes before the match.
      continue;
    }
    // There is some overlap.
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
      elementStack.push({ node: node, fullyContained: true, hasTextNodes: false, wrappedMatchNodes: [] });
    }
  }, function (leaveElem) {
    if (leaveElem[0].nodeType !== Node.TEXT_NODE) {
      var info = elementStack.pop();
      if (info.fullyContained && info.hasTextNodes) {
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
};

function createMatcher(elem) {
  var matcher = new FuzzyStringMatcher();
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

function apply(elem, wraps) {
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
    wrapExactString(elem, exactStr, wrapHtml).parent().data('magicwrap-wrap', wrap);
  }

  return $('.magicwrap');
}

$.fn.magicwrap = function (op, args) {
  if (!args) {
    args = {};
  }
  var wraps = args.wraps || [];
  switch (op) {
    case 'apply':
      remove(this);
      createMatcher(this);
      return apply(this, wraps);
    case 'update':
      removeWraps(this);
      return apply(this, wraps);
    case 'remove':
      removeWraps(this);
      remove(this);
      break;
  }
};
