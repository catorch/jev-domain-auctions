import type { Candidate, VerifiedListing } from "./types.js";

interface AvailabilityResponse {
  availabilities?: Array<{
    domainName?: string;
    status?: string;
    listing?: {
      listingId?: number;
      listingType?: string;
      priceCurrent?: number;
      priceBuyItNow?: number;
      auctionEndAt?: string;
    };
  }>;
}

const fromMicros = (value: number | undefined) => (value === undefined ? undefined : value / 1_000_000);

function configuration(): { authorization: string; customerId: string; baseUrl: string } {
  const apiKey = process.env.GODADDY_API_KEY?.trim();
  const apiSecret = process.env.GODADDY_API_SECRET?.trim();
  if (!apiKey) throw new Error("GODADDY_API_KEY is required with --verify");

  const credential = apiKey.includes(":") ? apiKey : apiSecret ? `${apiKey}:${apiSecret}` : null;
  if (!credential) {
    throw new Error(
      "GoDaddy Auctions requires a Classic Developer Key and secret. Set GODADDY_API_KEY and GODADDY_API_SECRET, " +
        "or put the complete key:secret pair in GODADDY_API_KEY. Personal Access Tokens are not supported.",
    );
  }

  const customerId = process.env.GODADDY_CUSTOMER_ID ?? "MY";
  const baseUrl = process.env.GODADDY_API_BASE_URL ?? "https://api.godaddy.com";
  if (customerId !== "MY" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customerId)) {
    throw new Error("GODADDY_CUSTOMER_ID must be MY or the account's customer UUID, not its numeric shopper ID");
  }
  return { authorization: `sso-key ${credential}`, customerId, baseUrl };
}

export async function preflightGoDaddy(): Promise<void> {
  const { authorization, customerId, baseUrl } = configuration();
  // Validate the exact permission this application needs. A valid Auctions key may not have
  // access to the broader Shoppers endpoint, so that endpoint is not a reliable preflight.
  const response = await fetch(
    `${baseUrl}/v1/customers/${encodeURIComponent(customerId)}/aftermarket/listings/available?currencyId=USD&includes=listingMin`,
    {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ domains: ["example.com"] }),
    },
  );
  if (response.status === 401) {
    throw new Error(
      "GoDaddy rejected the Classic Developer Key (HTTP 401). Check the production key and secret; Auctions does not accept a PAT.",
    );
  }
  if (response.status === 403) {
    throw new Error(
      `GoDaddy recognized the credentials but denied Auctions access (HTTP 403): ${await response.text()}`,
    );
  }
  if (!response.ok) throw new Error(`GoDaddy Auctions check failed: HTTP ${response.status} ${await response.text()}`);
}

export async function verifyCandidates(candidates: Candidate[]): Promise<Map<string, VerifiedListing>> {
  const { authorization, customerId, baseUrl } = configuration();
  const verified = new Map<string, VerifiedListing>();

  for (let offset = 0; offset < candidates.length; offset += 50) {
    const group = candidates.slice(offset, offset + 50);
    const response = await fetch(
      `${baseUrl}/v1/customers/${encodeURIComponent(customerId)}/aftermarket/listings/available?currencyId=USD&includes=listing,enrichment`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains: group.map((candidate) => candidate.listing.domainName) }),
      },
    );
    if (!response.ok) throw new Error(`GoDaddy verification failed: HTTP ${response.status} ${await response.text()}`);
    const payload = (await response.json()) as AvailabilityResponse;
    for (const item of payload.availabilities ?? []) {
      if (!item.domainName) continue;
      verified.set(item.domainName.toLowerCase(), {
        status: item.status ?? "UNKNOWN",
        listingId: item.listing?.listingId,
        listingType: item.listing?.listingType,
        currentPriceUsd: fromMicros(item.listing?.priceCurrent),
        buyNowPriceUsd: fromMicros(item.listing?.priceBuyItNow),
        auctionEndAt: item.listing?.auctionEndAt,
      });
    }
  }
  return verified;
}
