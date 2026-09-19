import type { Candidate, DeterministicScores, Listing, SemanticScores } from "./types.js";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const logScore = (value: number, ceiling: number) => clamp((Math.log1p(value) / Math.log1p(ceiling)) * 100);

export function passesHardFilters(
  listing: Listing,
  options: { maxPriceUsd: number; minAuthorityScore?: number; maxLength: number; tlds: Set<string> },
): boolean {
  return (
    !listing.isAdult &&
    listing.priceUsd > 0 &&
    listing.priceUsd <= options.maxPriceUsd &&
    (options.minAuthorityScore === undefined || listing.semrushAuthority > options.minAuthorityScore) &&
    listing.sld.length <= options.maxLength &&
    options.tlds.has(listing.tld) &&
    /^[a-z0-9-]+$/.test(listing.sld)
  );
}

export function deterministicScores(listing: Listing): DeterministicScores {
  const appraisalMultiple = listing.valuationUsd / Math.max(listing.priceUsd, 1);
  const underpricing = clamp((Math.log2(Math.max(appraisalMultiple, 0.5)) / Math.log2(25)) * 100);

  const demandSignals = [
    logScore(listing.searchVolume, 100_000),
    logScore(listing.keywordRegistrations, 100_000),
    logScore(listing.exactMatchTlds * 3, 300),
    logScore(listing.developedTlds * 5, 500),
    logScore(listing.cpcUsd * 100, 2_000),
  ];
  const marketDemand = demandSignals.reduce((sum, value) => sum + value, 0) / demandSignals.length;

  const seoQuality = clamp(
    listing.majesticTrustFlow * 1.8 +
      listing.semrushAuthority * 1.3 +
      logScore(Math.max(listing.majesticReferringDomains, listing.semrushReferringDomains), 1_000) * 0.35,
  );

  const lengthScore = clamp(110 - listing.sld.length * 7);
  const noHyphen = listing.sld.includes("-") ? 25 : 100;
  const noDigits = /\d/.test(listing.sld) ? 35 : 100;
  const tldScore = ({ com: 100, ai: 88, io: 78, org: 72, net: 65, co: 62 } as Record<string, number>)[listing.tld] ?? 45;
  const nameStructure = lengthScore * 0.4 + noHyphen * 0.2 + noDigits * 0.2 + tldScore * 0.2;

  const total = underpricing * 0.38 + marketDemand * 0.27 + seoQuality * 0.15 + nameStructure * 0.2;
  return { underpricing, marketDemand, seoQuality, nameStructure, total };
}

export function buildCandidate(listing: Listing): Candidate {
  const deterministic = deterministicScores(listing);
  return {
    listing,
    deterministic,
    opportunityScore: deterministic.total,
    reviewRequired: false,
  };
}

export function addSemanticScores(candidate: Candidate, semantic: SemanticScores, minConfidence: number): Candidate {
  // Semantic quality and observed market signals compensate; neither can erase a truly poor score in the other.
  const opportunityScore = candidate.deterministic.total * 0.55 + semantic.total * 0.45;
  return {
    ...candidate,
    semantic,
    opportunityScore,
    reviewRequired: semantic.confidence < minConfidence,
  };
}
