/**
 * Pure geometry helpers for GuidedTour — no React deps, fully unit-testable.
 */

const PADDING = 10;     // px of breathing room around the highlighted element
const TOOLTIP_GAP = 16; // px gap between spotlight edge and tooltip card
const ARROW_SIZE = 8;   // px — CSS triangle half-width

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TooltipPosition {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

/** Expand a DOMRect by PADDING on all sides to give the spotlight breathing room. */
export function getSpotlightRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

/**
 * Compute the fixed-position coordinates for the tooltip card.
 * Falls back to "bottom" if position is undefined.
 * Clamps the result inside the visible viewport with a 12px margin.
 */
export function computeTooltipPosition(
  spotlight: Rect,
  position: "top" | "bottom" | "left" | "right" | undefined,
  tooltipWidth: number,
  tooltipHeight: number,
  vw: number,
  vh: number
): TooltipPosition {
  type Side = "top" | "bottom" | "left" | "right";
  const pos: Side = position ?? "bottom";
  const placements: Record<Side, TooltipPosition> = {
    bottom: {
      top: spotlight.top + spotlight.height + TOOLTIP_GAP,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      arrowSide: "top",
    },
    top: {
      top: spotlight.top - TOOLTIP_GAP - tooltipHeight,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      arrowSide: "bottom",
    },
    right: {
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: spotlight.left + spotlight.width + TOOLTIP_GAP,
      arrowSide: "left",
    },
    left: {
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: spotlight.left - TOOLTIP_GAP - tooltipWidth,
      arrowSide: "right",
    },
  };

  const p = { ...placements[pos] };
  const margin = 12;
  p.left = Math.max(margin, Math.min(p.left, vw - tooltipWidth - margin));
  p.top = Math.max(margin, Math.min(p.top, vh - tooltipHeight - margin));
  return p;
}

/**
 * Compute inline styles for the CSS-triangle arrow that connects the
 * tooltip card to the highlighted element.
 *
 * arrowSide is the edge of the tooltip where the arrow appears, which is
 * always the edge facing the spotlight. e.g., arrowSide="top" means the
 * tooltip is BELOW the element and the arrow points upward.
 */
export function arrowStyles(
  side: TooltipPosition["arrowSide"],
  spotlight: Rect,
  tooltip: TooltipPosition
): React.CSSProperties {
  const GOLD = "#C9A227";
  const s = ARROW_SIZE;
  // Clamp the arrow offset so it never bleeds past the card edges
  const hClamp = (raw: number) => Math.max(16, Math.min(raw, 300 - 32));
  const vClamp = (raw: number) => Math.max(16, Math.min(raw, 140));

  const hOffset = hClamp(spotlight.left + spotlight.width / 2 - tooltip.left - s);
  const vOffset = vClamp(spotlight.top + spotlight.height / 2 - tooltip.top - s);

  switch (side) {
    case "top":
      return { top: -s, left: hOffset, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderBottom: `${s}px solid ${GOLD}` };
    case "bottom":
      return { bottom: -s, left: hOffset, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderTop: `${s}px solid ${GOLD}` };
    case "left":
      return { left: -s, top: vOffset, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderRight: `${s}px solid ${GOLD}` };
    case "right":
      return { right: -s, top: vOffset, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderLeft: `${s}px solid ${GOLD}` };
  }
}
