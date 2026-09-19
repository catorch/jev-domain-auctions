import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Listing, SemanticScores } from "./types.js";

const questions = {
  brandability: score("How strong is this domain name as a memorable, distinctive brand for a legitimate business?", [
    "Confusing, forgettable, or unusable as a brand",
    "Weak; awkward spelling or little brand character",
    "Usable but ordinary",
    "Strong, memorable, and easy to say",
    "Exceptional premium-brand quality",
  ]),
  commercialUtility: score("How many credible commercial uses does this domain naturally support without needing to explain the name?", [
    "No credible commercial use",
    "One strained or very narrow use",
    "At least one clear business use",
    "Several strong business uses",
    "Broad, high-value category or company-name utility",
  ]),
  linguisticClarity: score("How clear, pronounceable, and correctly formed is the domain's second-level name for an English-speaking buyer?", [
    "Looks like noise, a typo, or is very hard to pronounce",
    "Noticeably awkward or ambiguous",
    "Understandable with minor friction",
    "Clear and easy to pronounce and spell",
    "Immediately clear, elegant, and effortless",
  ]),
  semanticCleanliness: score("How free is this domain name from spammy, deceptive, adult, gambling, typo-squatting, or obviously problematic connotations?", [
    "Strongly problematic or deceptive",
    "Material warning signs",
    "Some ambiguity but no clear problem",
    "Clean and suitable for normal business use",
    "Exceptionally clean and trustworthy",
  ]),
} as const;

type Cache = Record<string, SemanticScores>;

function toPercent(value: number): number {
  return (value / 4) * 100;
}

export class JevScorer {
  private readonly client = new TypeSafeClient();
  private cache: Cache = {};

  constructor(private readonly cachePath = ".cache/jev-scores.json") {}

  async load(): Promise<void> {
    try {
      this.cache = JSON.parse(await readFile(this.cachePath, "utf8")) as Cache;
    } catch {
      this.cache = {};
    }
  }

  async evaluate(listing: Listing): Promise<SemanticScores> {
    const cacheKey = JSON.stringify({ domainName: listing.domainName, priceUsd: listing.priceUsd });
    const cached = this.cache[cacheKey];
    if (cached) return cached;

    const response = await this.client.systemOne({
      state: {
        domain: {
          fullName: listing.domainName,
          secondLevelName: listing.sld,
          topLevelDomain: listing.tld,
        },
      },
      questions,
    });

    const answerList = [
      response.answers.brandability,
      response.answers.commercialUtility,
      response.answers.linguisticClarity,
      response.answers.semanticCleanliness,
    ];
    const result: SemanticScores = {
      brandability: toPercent(response.answers.brandability.score),
      commercialUtility: toPercent(response.answers.commercialUtility.score),
      linguisticClarity: toPercent(response.answers.linguisticClarity.score),
      semanticCleanliness: toPercent(response.answers.semanticCleanliness.score),
      total: answerList.reduce((sum, answer) => sum + toPercent(answer.score), 0) / answerList.length,
      confidence: answerList.reduce((sum, answer) => sum + answer.confidence, 0) / answerList.length,
    };

    this.cache[cacheKey] = result;
    await mkdir(dirname(this.cachePath), { recursive: true });
    await writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    return result;
  }
}
