import { describe, it, expect } from "vitest";
import { parseBranchOfService, parseReverseBranchOfService } from "./helpers";

describe("parseBranchOfService", () => {
  it("converts ARMY to Army", () => {
    expect(parseBranchOfService("ARMY")).toBe("Army");
  });

  it("converts NAVY to Navy", () => {
    expect(parseBranchOfService("NAVY")).toBe("Navy");
  });

  it("converts AIR_FORCE to Air Force", () => {
    expect(parseBranchOfService("AIR_FORCE")).toBe("Air Force");
  });

  it("converts COAST_GUARD to Coast Guard", () => {
    expect(parseBranchOfService("COAST_GUARD")).toBe("Coast Guard");
  });

  it("converts MARINE_CORPS to Marine Corps", () => {
    expect(parseBranchOfService("MARINE_CORPS")).toBe("Marine Corps");
  });

  it("converts SPACE_FORCE to Space Force", () => {
    expect(parseBranchOfService("SPACE_FORCE")).toBe("Space Force");
  });
});

describe("parseReverseBranchOfService", () => {
  it("converts Army to ARMY", () => {
    expect(parseReverseBranchOfService("Army")).toBe("ARMY");
  });

  it("converts Navy to NAVY", () => {
    expect(parseReverseBranchOfService("Navy")).toBe("NAVY");
  });

  it("converts Air Force to AIR_FORCE", () => {
    expect(parseReverseBranchOfService("Air Force")).toBe("AIR_FORCE");
  });

  it("converts Coast Guard to COAST_GUARD", () => {
    expect(parseReverseBranchOfService("Coast Guard")).toBe("COAST_GUARD");
  });

  it("converts Marine Corps to MARINE_CORPS", () => {
    expect(parseReverseBranchOfService("Marine Corps")).toBe("MARINE_CORPS");
  });

  it("converts Space Force to SPACE_FORCE", () => {
    expect(parseReverseBranchOfService("Space Force")).toBe("SPACE_FORCE");
  });

  it("returns ANY for unknown input when includeAny is true", () => {
    expect(parseReverseBranchOfService("Unknown")).toBe("ANY");
  });

  it("returns ARMY for unknown input when includeAny is false", () => {
    expect(parseReverseBranchOfService("Unknown", false)).toBe("ARMY");
  });
});
