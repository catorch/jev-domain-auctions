#!/usr/bin/env node
import "dotenv/config";
import { resolve } from "node:path";
import { Command } from "commander";
import { downloadFeed, readListings } from "./inventory.js";
import { JevScorer } from "./jev.js";
import { preflightGoDaddy, verifyCandidates } from "./godaddy.js";
import { writeReport } from "./report.js";
import { addSemanticScores, buildCandidate, passesHardFilters } from "./scoring.js";
import type { Candidate, ScanOptions } from "./types.js";

interface CliOptions {
  input?: string;
  feed: string;
  maxPrice: string;
  maxLength: string;
  tlds: string;
  prefilter: string;
  top: string;
  limit?: string;
  jev?: boolean;
  verify?: boolean;
  minJevConfidence: string;
  output: string;
}

const program = new Command()
  .name("domain-scout")
  .description("Find underpriced GoDaddy expiry domains with deterministic signals and JEV judgments")
  .option("--input <path>", "local GoDaddy JSON or JSON.ZIP file instead of downloading")
  .option("--feed <name>", "inventory feed to download", "closeout_listings.json.zip")
  .option("--max-price <usd>", "maximum listing price", "500")
  .option("--max-length <chars>", "maximum second-level name length", "18")
  .option("--tlds <list>", "comma-separated allowed TLDs", "com,ai,io,co,net,org")
  .option("--prefilter <count>", "candidates sent to JEV", "40")
  .option("--top <count>", "final shortlist length", "20")
  .option("--limit <count>", "stop after reading this many listings (useful for development)")
  .option("--no-jev", "skip JEV and rank only with deterministic signals")
  .option("--verify", "verify final candidates with GoDaddy's live listing API")
  .option("--min-jev-confidence <value>", "flag semantic scores below this confidence", "0.55")
  .option("--output <directory>", "report directory", "reports")
  .parse();

const cli = program.opts<CliOptions>();
const options: ScanOptions = {
  maxPriceUsd: Number(cli.maxPrice),
  maxLength: Number(cli.maxLength),
  tlds: new Set(cli.tlds.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)),
  prefilter: Number(cli.prefilter),
  top: Number(cli.top),
  limit: cli.limit ? Number(cli.limit) : undefined,
  useJev: cli.jev !== false,
  minJevConfidence: Number(cli.minJevConfidence),
};

for (const [name, value] of Object.entries(options)) {
  if (typeof value === "number" && (!Number.isFinite(value) || value <= 0)) throw new Error(`Invalid --${name}: ${value}`);
}
if (options.useJev && !process.env.TYPESAFE_API_KEY) {
  throw new Error("TYPESAFE_API_KEY is required unless --no-jev is used");
}
if (cli.verify) {
  console.error("Checking GoDaddy credentials");
  await preflightGoDaddy();
}

const source = cli.input ? resolve(cli.input) : await downloadFeed(cli.feed);
console.error(`Reading ${source}`);
const candidates: Candidate[] = [];
let scanned = 0;
for await (const listing of readListings(source, options.limit)) {
  scanned += 1;
  if (passesHardFilters(listing, options)) candidates.push(buildCandidate(listing));
}
candidates.sort((a, b) => b.opportunityScore - a.opportunityScore);
let shortlist = candidates.slice(0, options.prefilter);
console.error(`Scanned ${scanned.toLocaleString()} listings; ${candidates.length.toLocaleString()} passed hard filters`);

if (options.useJev) {
  const scorer = new JevScorer();
  await scorer.load();
  for (let index = 0; index < shortlist.length; index += 1) {
    const candidate = shortlist[index]!;
    console.error(`JEV ${index + 1}/${shortlist.length}: ${candidate.listing.domainName}`);
    const semantic = await scorer.evaluate(candidate.listing);
    shortlist[index] = addSemanticScores(candidate, semantic, options.minJevConfidence);
  }
  shortlist.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

shortlist = shortlist.slice(0, options.top);
if (cli.verify) {
  const verified = await verifyCandidates(shortlist);
  shortlist = shortlist
    .map((candidate) => ({ ...candidate, verified: verified.get(candidate.listing.domainName) }))
    .filter((candidate) => candidate.verified?.status === "AVAILABLE");
}

const paths = await writeReport(shortlist, cli.output);
console.table(shortlist.map((candidate, index) => ({
  rank: index + 1,
  domain: candidate.listing.domainName,
  price: `$${candidate.listing.priceUsd.toFixed(0)}`,
  valuation: `$${candidate.listing.valuationUsd.toFixed(0)}`,
  score: candidate.opportunityScore.toFixed(1),
  jev: candidate.semantic?.total.toFixed(1) ?? "off",
  confidence: candidate.semantic?.confidence.toFixed(2) ?? "-",
  status: candidate.verified?.status ?? "not verified",
})));
console.error(`Reports: ${paths.json}, ${paths.csv}`);
