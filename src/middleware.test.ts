import { describe, it, expect, vi } from "vitest";

// Mock next-auth to avoid Next.js server import issues
vi.mock("@/auth", () => ({
  auth: vi.fn((handler: any) => handler),
}));

vi.mock("next/server", () => ({
  NextResponse: { redirect: vi.fn() },
}));

describe("middleware config", () => {
  it("has correct matcher patterns", async () => {
    const { config } = await import("./middleware");

    expect(config.matcher).toContain("/");
    expect(config.matcher).toContain("/groups/:path*");
    expect(config.matcher).toContain("/members/:path*");
    expect(config.matcher).toContain("/all-groups");
    expect(config.matcher).toContain("/all-members");
    expect(config.matcher).toContain("/verification");
    expect(config.matcher).toContain("/community");
  });

  it("excludes api and static routes", async () => {
    const { config } = await import("./middleware");

    expect(config.matcher).toContain(
      "/((?!api|_next/static|_next/image|favicon.ico).*)"
    );
  });
});
