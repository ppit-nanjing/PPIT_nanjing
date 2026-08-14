export interface PickedElement {
  selector: string;
  description: string;
  rect: { x: number; y: number; width: number; height: number };
}

/** Builds a CSS selector path from the element up to (but not including) <body>. */
export function getElementSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node !== document.body && node.parentElement) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${tag}#${node.id}`);
      break; // ids are unique - no need to go further up
    }
    const classes = Array.from(node.classList).slice(0, 2).join(".");
    const siblings = Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName);
    const index = siblings.indexOf(node) + 1;
    const nth = siblings.length > 1 ? `:nth-of-type(${index})` : "";
    parts.unshift(classes ? `${tag}.${classes}${nth}` : `${tag}${nth}`);
    node = node.parentElement;
  }

  return parts.join(" > ");
}

/** Human-readable summary of an element for display in the admin inbox. */
export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.getAttribute("alt");
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const idPart = el.id ? `#${el.id}` : "";
  const bits = [`<${tag}${idPart}>`, label && `"${label}"`, !label && text && `"${text}${text.length === 60 ? "…" : ""}"`]
    .filter(Boolean)
    .join(" ");
  return bits || `<${tag}${idPart}>`;
}

export function pickElementAt(x: number, y: number): { el: Element; picked: PickedElement } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    el,
    picked: {
      selector: getElementSelector(el),
      description: describeElement(el),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    },
  };
}
