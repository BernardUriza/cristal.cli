import { describe, expect, it } from "vitest";
import { circle, group, polygon, rect, stroked } from "../../domain/shapes";
import { shapeToSvg, toSvg } from "./serialize";

describe("svg serializer", () => {
  it("emits one element per shape with formatted numbers", () => {
    expect(shapeToSvg(rect(1.26, 2, 3, 4, { fill: "#fff", stroke: "#000", strokeWidth: 0.55 }))).toBe('<rect x="1.3" y="2.0" width="3.0" height="4.0" fill="#fff" stroke="#000" stroke-width="0.6"/>');
    expect(shapeToSvg(polygon([[0, 0], [1, 1]], stroked("#0f0", 1, { join: "round", opacity: 0.5 })))).toBe('<polygon points="0.0,0.0 1.0,1.0" fill="none" stroke="#0f0" stroke-width="1.0" opacity="0.5" stroke-linejoin="round"/>');
  });

  it("applies group transforms in order", () => {
    const g = group([{ rotate: 90 }, { translate: [0, -22] }], [circle(1, 1, 1, { fill: "#f00" })]);
    expect(shapeToSvg(g)).toBe('<g transform="rotate(90) translate(0.0 -22.0)"><circle cx="1.0" cy="1.0" r="1.0" fill="#f00"/></g>');
  });

  it("adds the glow filter only when a shape asks for it", () => {
    expect(toSvg([circle(0, 0, 1, { fill: "#f00" })], 10, 10)).not.toContain("<defs>");
    const glowing = toSvg([circle(0, 0, 1, { fill: "#f00", glow: true })], 10, 10);
    expect(glowing).toContain('<filter id="glow"');
    expect(glowing).toContain('filter="url(#glow)"');
  });
});
