import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Candidate } from "./types.js";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function writeReport(candidates: Candidate[], directory = "reports"): Promise<{ json: string; csv: string }> {
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = join(directory, `shortlist-${stamp}.json`);
  const csvPath = join(directory, `shortlist-${stamp}.csv`);
  await writeFile(jsonPath, JSON.stringify(candidates, null, 2));

  const headers = [
    "rank", "domain", "priceUsd", "valuationUsd", "opportunityScore", "deterministicScore",
    "jevScore", "jevConfidence", "reviewRequired", "status", "currentPriceUsd", "auctionEndAt", "url",
  ];
  const rows = candidates.map((candidate, index) => [
    index + 1,
    candidate.listing.domainName,
    candidate.listing.priceUsd.toFixed(2),
    candidate.listing.valuationUsd.toFixed(2),
    candidate.opportunityScore.toFixed(1),
    candidate.deterministic.total.toFixed(1),
    candidate.semantic?.total.toFixed(1) ?? "",
    candidate.semantic?.confidence.toFixed(3) ?? "",
    candidate.reviewRequired,
    candidate.verified?.status ?? "NOT_VERIFIED",
    candidate.verified?.currentPriceUsd?.toFixed(2) ?? "",
    candidate.verified?.auctionEndAt ?? candidate.listing.auctionEndTime ?? "",
    candidate.listing.link ?? "",
  ]);
  await writeFile(csvPath, [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n");
  return { json: jsonPath, csv: csvPath };
}
