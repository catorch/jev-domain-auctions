export interface RawListing {
  domainName?: unknown;
  link?: unknown;
  auctionType?: unknown;
  auctionEndTime?: unknown;
  price?: unknown;
  numberOfBids?: unknown;
  domainAge?: unknown;
  pageviews?: unknown;
  valuation?: unknown;
  monthlyParkingRevenue?: unknown;
  isAdult?: unknown;
  majesticTf?: unknown;
  majesticCf?: unknown;
  majesticBacklinks?: unknown;
  majesticReferringDomains?: unknown;
  exactMatchTlds?: unknown;
  keywordRegistrations?: unknown;
  developedTlds?: unknown;
  semrushAs?: unknown;
  semrushReferringDomains?: unknown;
  semrushBacklinks?: unknown;
  semrushIndexedPages?: unknown;
  semrushTopReferringDomains?: unknown;
  semrushSearchVolume?: unknown;
  semrushCpc?: unknown;
}

export interface Listing {
  domainName: string;
  sld: string;
  tld: string;
  link: string | null;
  auctionType: string;
  auctionEndTime: string | null;
  priceUsd: number;
  bids: number;
  ageYears: number;
  pageviews: number;
  valuationUsd: number;
  parkingRevenueUsd: number;
  isAdult: boolean;
  majesticTrustFlow: number;
  majesticCitationFlow: number;
  majesticBacklinks: number;
  majesticReferringDomains: number;
  exactMatchTlds: number;
  keywordRegistrations: number;
  developedTlds: number;
  semrushAuthority: number;
  semrushReferringDomains: number;
  semrushBacklinks: number;
  semrushIndexedPages: number;
  semrushTopReferringDomains: string;
  searchVolume: number;
  cpcUsd: number;
}

export interface DeterministicScores {
  underpricing: number;
  marketDemand: number;
  seoQuality: number;
  nameStructure: number;
  total: number;
}

export interface SemanticScores {
  brandability: number;
  commercialUtility: number;
  linguisticClarity: number;
  semanticCleanliness: number;
  total: number;
  confidence: number;
}

export interface VerifiedListing {
  status: string;
  listingId?: number;
  listingType?: string;
  currentPriceUsd?: number;
  buyNowPriceUsd?: number;
  auctionEndAt?: string;
}

export interface Candidate {
  listing: Listing;
  deterministic: DeterministicScores;
  semantic?: SemanticScores;
  opportunityScore: number;
  reviewRequired: boolean;
  verified?: VerifiedListing;
}

export interface ScanOptions {
  maxPriceUsd: number;
  minAuthorityScore?: number;
  maxLength: number;
  tlds: Set<string>;
  prefilter: number;
  top: number;
  limit?: number;
  useJev: boolean;
  minJevConfidence: number;
}
