import { describe, expect, it } from "vitest";
import { normalizeListing } from "../src/listing.js";
import { deterministicScores, passesHardFilters } from "../src/scoring.js";

describe("listing normalization", () => {
  it("parses formatted money and splits the domain", () => {
    const listing = normalizeListing({ domainName: "Example.COM", price: "$1,234", valuation: "$5,678" });
    expect(listing).toMatchObject({ domainName: "example.com", sld: "example", tld: "com", priceUsd: 1234, valuationUsd: 5678 });
  });

  it("rejects malformed names", () => {
    expect(normalizeListing({ domainName: "not-a-domain", price: "$5" })).toBeNull();
  });
});

describe("deterministic screening", () => {
  const options = { maxPriceUsd: 500, minSearchVolume: 0, maxLength: 18, tlds: new Set(["com"]) };

  it("applies budget, TLD, adult, and name filters", () => {
    const good = normalizeListing({ domainName: "northpeak.com", price: "$80" })!;
    expect(passesHardFilters(good, options)).toBe(true);
    expect(passesHardFilters({ ...good, priceUsd: 501 }, options)).toBe(false);
    expect(passesHardFilters({ ...good, isAdult: true }, options)).toBe(false);
    expect(passesHardFilters({ ...good, tld: "xyz" }, options)).toBe(false);
  });

  it("enforces minimum Semrush search volume", () => {
    const listing = normalizeListing({ domainName: "northpeak.com", price: "$80", semrushSearchVolume: 99 })!;
    expect(passesHardFilters(listing, { ...options, minSearchVolume: 100 })).toBe(false);
    expect(passesHardFilters({ ...listing, searchVolume: 100 }, { ...options, minSearchVolume: 100 })).toBe(true);
  });

  it("rewards a stronger price-to-valuation gap", () => {
    const base = normalizeListing({ domainName: "northpeak.com", price: "$100", valuation: "$200" })!;
    const bargain = { ...base, valuationUsd: 2_000 };
    expect(deterministicScores(bargain).underpricing).toBeGreaterThan(deterministicScores(base).underpricing);
  });
});
