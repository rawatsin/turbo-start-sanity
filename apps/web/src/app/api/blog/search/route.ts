import { env } from "@workspace/env/client";
import { Logger } from "@workspace/logger";
import { algoliasearch } from "algoliasearch";
import { type NextRequest, NextResponse } from "next/server";

const logger = new Logger("BlogSearchAPI");

// rate limiter
const REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60_000;
const recentRequests = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = recentRequests.get(ip) ?? [];
  const validRequests = timestamps.filter((time) => now - time < WINDOW_MS);

  if (validRequests.length >= REQUESTS_PER_MINUTE) {
    return true; //if limit exceed
  }

  validRequests.push(now);
  recentRequests.set(ip, validRequests);
  return false;
}

// initializing client
const appId = env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID;
const searchKey = env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
const indexName = env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "blogs";

const algoliaClient =
  appId && searchKey ? algoliasearch(appId, searchKey) : null;

// main function
export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "local";

  if (isRateLimited(ip)) {
    logger.warn("Search rate limit exceeded", { ip });
    return NextResponse.json(
      { error: "Too many search requests. Please slow down." },
      { status: 429 }
    );
  }
//bounding
  const { searchParams } = new URL(request.url);
  // q
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim().slice(0, 100);

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required." },
      { status: 400 }
    );
  }
  
  // p
  const rawPage = parseInt(searchParams.get("page") ?? "0", 10);
  const page = Math.min(Math.max(0, isNaN(rawPage) ? 0 : rawPage), 100);

  // limit / hitsPerPage (default 10, min 1, max 50)
  const rawLimit = parseInt(
    searchParams.get("limit") ?? searchParams.get("hitsPerPage") ?? "10",
    10
  );
  const hitsPerPage = Math.min(
    Math.max(1, isNaN(rawLimit) ? 10 : rawLimit),
    50
  );

  // Optional category filter (e.g. ?category=nextjs)
  const category = searchParams.get("category")?.trim();

  // Verify Algolia configuration
  if (!algoliaClient) {
    logger.error("Algolia search credentials not configured");
    return NextResponse.json(
      { error: "Search service is not configured." },
      { status: 503 }
    );
  }

  // Query Algolia
  try {
    const result = await algoliaClient.searchSingleIndex({
      indexName,
      searchParams: {
        query,
        page,
        hitsPerPage,
        filters: category ? `category:"${category}"` : undefined,
      },
    });

    return NextResponse.json({
      hits: result.hits,
      page: result.page,
      nbPages: result.nbPages,
      nbHits: result.nbHits,
    });
  } catch (error) {
    // If Algolia is down, fail gracefully with 503 rather than false empty results(as mentioned in assignemt)
    logger.error("Algolia search failed", { error });
    return NextResponse.json(
      { error: "Search service is temporarily unavailable." },
      { status: 503 }
    );
  }
}
