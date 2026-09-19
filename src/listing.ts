import type { Listing, RawListing } from "./types.js";

function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeListing(raw: RawListing): Listing | null {
  const domainName = text(raw.domainName).toLowerCase();
  const lastDot = domainName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === domainName.length - 1) return null;

  const sld = domainName.slice(0, lastDot);
  const tld = domainName.slice(lastDot + 1);
  const priceUsd = numeric(raw.price);
  if (priceUsd < 0) return null;

  return {
    domainName,
    sld,
    tld,
    link: text(raw.link) || null,
    auctionType: text(raw.auctionType) || "Unknown",
    auctionEndTime: text(raw.auctionEndTime) || null,
    priceUsd,
    bids: numeric(raw.numberOfBids),
    ageYears: numeric(raw.domainAge),
    pageviews: numeric(raw.pageviews),
    valuationUsd: numeric(raw.valuation),
    parkingRevenueUsd: numeric(raw.monthlyParkingRevenue),
    isAdult: raw.isAdult === true || String(raw.isAdult).toLowerCase() === "true",
    majesticTrustFlow: numeric(raw.majesticTf),
    majesticCitationFlow: numeric(raw.majesticCf),
    majesticBacklinks: numeric(raw.majesticBacklinks),
    majesticReferringDomains: numeric(raw.majesticReferringDomains),
    exactMatchTlds: numeric(raw.exactMatchTlds),
    keywordRegistrations: numeric(raw.keywordRegistrations),
    developedTlds: numeric(raw.developedTlds),
    semrushAuthority: numeric(raw.semrushAs),
    semrushReferringDomains: numeric(raw.semrushReferringDomains),
    semrushBacklinks: numeric(raw.semrushBacklinks),
    semrushIndexedPages: numeric(raw.semrushIndexedPages),
    semrushTopReferringDomains: text(raw.semrushTopReferringDomains),
    searchVolume: numeric(raw.semrushSearchVolume),
    cpcUsd: numeric(raw.semrushCpc),
  };
}
