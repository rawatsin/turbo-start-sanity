import path from "node:path";
import { config } from "dotenv";

// Loading .env from apps/web/.env
config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@sanity/client";
import { algoliasearch } from "algoliasearch";


const appId = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID;
const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "blogs";

const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const sanityToken =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;

if (!appId || !adminKey) {
  console.error(
    " Missing Algolia credentials in .env (NEXT_PUBLIC_ALGOLIA_APPLICATION_ID or ALGOLIA_ADMIN_API_KEY)"
  );
  process.exit(1);
}

if (!sanityProjectId) {
  console.error(
    " Missing Sanity Project ID in .env (NEXT_PUBLIC_SANITY_PROJECT_ID)"
  );
  process.exit(1);
}

// Initialize Clients
const sanity = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: sanityToken,
});

const algolia = algoliasearch(appId, adminKey);

// GROQ Query for Published Blogs (Excluding Drafts!)
const BLOGS_QUERY = `
  *[_type == "blog" && !(_id in path("drafts.**"))] {
    _id,
    title,
    description,
    "slug": slug.current,
    category,
    publishedAt,
    "authorName": author->name
  }
`;

async function backfill() {
  console.log(" Starting Algolia backfill...\n");

  // step 1 Fetching published blogs from Sanity
  console.log(" Fetching published blogs from Sanity...");
  const blogs = await sanity.fetch(BLOGS_QUERY);
  console.log(` Found ${blogs.length} published blogs.\n`);

  if (blogs.length === 0) {
    console.warn(" No published blogs found to index.");
    return;
  }

  // Step 2 Set Algolia Index Settings in Code(not slug etc)
  console.log(` Configuring index settings for '${indexName}'...`);
  await algolia.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: [
        "title",
        "description",
        "category",
        "authorName",
      ],
      attributesForFaceting: [
        "filterOnly(category)",
      ],
    },
  });
  console.log(
    " Index settings applied successfully (searchableAttributes & attributesForFaceting).\n"
  );

  // Step 3 Format records with objectID (Idempotent)
  const records = blogs.map((blog: any) => ({
    objectID: blog._id,
    title: blog.title,
    description: blog.description,
    slug: blog.slug,
    category: blog.category,
    publishedAt: blog.publishedAt,
    authorName: blog.authorName,
  }));

  // Step 4: Push to Algolia
  console.log(
    ` Uploading ${records.length} records to Algolia index '${indexName}'...`
  );
  await algolia.saveObjects({
    indexName,
    objects: records,
  });

  console.log(
    " Backfill completed successfully! All blogs are now searchable in Algolia.\n"
  );
}

backfill().catch((error) => {
  console.error(" Backfill failed:", error);
  process.exit(1);
});
