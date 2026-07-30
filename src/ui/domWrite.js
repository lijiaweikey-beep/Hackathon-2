export function clearChildren(element) {
  if (!element) return;
  if (typeof element.replaceChildren === "function") {
    element.replaceChildren();
    return;
  }
  if (Array.isArray(element.children)) {
    element.children.length = 0;
  }
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  element.textContent = "";
}

export function appendTrustedMarkup(element, markup = "") {
  if (!element) return;
  clearChildren(element);
  const html = String(markup);
  if (!html) return;

  const doc = element.ownerDocument ?? globalThis.document;
  const Parser = doc?.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!Parser) {
    element.textContent = html;
    return;
  }

  const parsed = new Parser().parseFromString(`<body>${html}</body>`, "text/html");
  element.append(...parsed.body.childNodes);
}
