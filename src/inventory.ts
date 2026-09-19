import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable, type Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import parser from "stream-json";
import pick from "stream-json/filters/pick.js";
import streamArray from "stream-json/streamers/stream-array.js";
import unzipper from "unzipper";
import { normalizeListing } from "./listing.js";
import type { Listing, RawListing } from "./types.js";

const INVENTORY_BASE = "https://inventory.auctions.godaddy.com";

function safeFeedName(name: string): string {
  const cleaned = basename(name);
  if (!/^[a-zA-Z0-9_.-]+\.json(?:\.zip)?$/.test(cleaned)) {
    throw new Error(`Unsupported feed name: ${name}`);
  }
  return cleaned;
}

export async function downloadFeed(feed: string, cacheDir = ".cache"): Promise<string> {
  const name = safeFeedName(feed);
  await mkdir(cacheDir, { recursive: true });
  const destination = join(cacheDir, name);

  try {
    const info = await stat(destination);
    if (Date.now() - info.mtimeMs < 30 * 60 * 1000) return destination;
  } catch {
    // Cache miss.
  }

  const response = await fetch(`${INVENTORY_BASE}/${name}`);
  if (!response.ok || !response.body) throw new Error(`Inventory download failed: HTTP ${response.status}`);
  const temporary = `${destination}.partial`;
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(temporary));
  await rename(temporary, destination);
  return destination;
}

function jsonStream(path: string): NodeJS.ReadableStream {
  if (extname(path) !== ".zip") return createReadStream(path);
  const archive = createReadStream(path).pipe(unzipper.ParseOne(/\.json$/i));
  return archive;
}

export async function* readListings(path: string, limit?: number): AsyncGenerator<Listing> {
  const values = jsonStream(path)
    .pipe(parser() as Transform)
    .pipe(pick.asStream({ filter: "data" }))
    .pipe(streamArray.asStream());

  let count = 0;
  for await (const entry of values as AsyncIterable<{ value: RawListing }>) {
    const listing = normalizeListing(entry.value);
    if (listing) {
      yield listing;
      count += 1;
      if (limit && count >= limit) break;
    }
  }
  values.destroy();
}
