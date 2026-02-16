import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./apiClient";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3000");
  mockFetch.mockReset();
});

describe("apiClient", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await apiClient("/api/test");
    expect(result).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/test",
      {}
    );
  });

  it("throws FetchError with status and info on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "forbidden" }),
    });

    try {
      await apiClient("/api/test");
      expect.unreachable("Should have thrown");
    } catch (error: any) {
      expect(error.message).toBe("An error occurred while fetching the data.");
      expect(error.status).toBe(403);
      expect(error.info).toEqual({ error: "forbidden" });
    }
  });

  it("passes options to fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient("/api/test", { method: "POST" });
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:3000/api/test", {
      method: "POST",
    });
  });
});
