import { timingSafeEqual } from "node:crypto";
import { env } from "@workspace/env/server";
import { Logger } from "@workspace/logger";
import { algoliasearch } from "algoliasearch";
import { type NextRequest, NextResponse } from "next/server";

const logger = new Logger("AlgoliaSyncWebhook");

// prevent from time attack
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  
  const expectedSecret = env.SANITY_ALGOLIA_WEBHOOK_SECRET;
  const providedSecret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.headers.get("x-sanity-webhook-secret");

  if (
    !(expectedSecret && providedSecret) ||
    !secretsMatch(providedSecret, expectedSecret)
  ) {
    logger.warn("Unauthorized webhook delivery rejected");
    return new Response("Unauthorized", { status: 401 });
  }

  //Parsing
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request: Body must be valid JSON", { status: 400 });
  }

  const { _id, _type } = body ?? {};

  // Non-Blof rejection
  if (_type !== "blog") {
    logger.info("Ignored non-blog document", { _type, _id });
    return NextResponse.json(
      { message: "Ignored non-blog document" },
      { status: 200 }
    );
  }

  // Drafts rejection
  if (typeof _id === "string" && _id.startsWith("drafts.")) {
    logger.info("Ignored draft blog document", { _id });
    return NextResponse.json(
      { message: "Ignored draft document" },
      { status: 200 }
    );
  }

  
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID;
  const adminKey = env.ALGOLIA_ADMIN_API_KEY;
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "blogs";

  if (!appId || !adminKey) {
    logger.error("Missing Algolia configuration in environment");
    return new Response("Server Configuration Error", { status: 500 });
  }

  const algolia = algoliasearch(appId, adminKey);

  //Handle Publish/Edit vs Unpublish/Delete
  const isDeleted = body._deleted === true || body.operation === "delete";

  try {
    if (isDeleted) {
      // Remove from Algolia
      await algolia.deleteObjects({
        indexName,
        objectIDs: [_id],
      });
      logger.info("Deleted blog from Algolia", { _id });
      return NextResponse.json(
        { message: "Deleted from Algolia", objectID: _id },
        { status: 200 }
      );
    } else {
      // Save / Update in Algolia (Idempotent)
      const record = {
        objectID: _id,
        title: body.title,
        description: body.description,
        slug: typeof body.slug === "object" ? body.slug?.current : body.slug,
        category: body.category,
        publishedAt: body.publishedAt,
        authorName: body.authorName || body.author?.name,
      };

      await algolia.saveObjects({
        indexName,
        objects: [record],
      });
      logger.info("Synced blog to Algolia", { _id, title: body.title });
      return NextResponse.json(
        { message: "Synced to Algolia", objectID: _id },
        { status: 200 }
      );
    }
  } catch (error) {
    logger.error("Failed to sync to Algolia", error);
    return new Response("Failed to sync to Algolia", { status: 500 });
  }
}
