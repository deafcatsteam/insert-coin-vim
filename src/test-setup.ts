// jsdom has no layout engine; CodeMirror's measure pass calls these on Range.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();
