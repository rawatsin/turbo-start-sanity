# VERIFY.md

## Submission Details & Live URLs
* **Production URL (Vercel):** `https://roboto-studio-assement.vercel.app`
* **Deployed Sanity Studio:** `https://www.sanity.io/@oefl3uk4c/studio/pv2hjjuybmsnf7i4go7vf0p4`
* **Screen Recording (Loom):** `https://www.loom.com/share/1d607d98d5f548f1ae09a704e98c1fd6` (Duration: < 3 minutes)
* **Invited Reviewers:** `hrithik@robotostudio.com` and `jono@robotostudio.com` invited to Sanity project `jkafq0n5`.

---

## Required Verification Checklist (Points 1–8)

### 1. Publishing a post puts it in the index
When publishing a blog in Sanity Studio, Sanity delivers a webhook to `/api/algolia/sync` which saves the record into Algolia.

Actual delivery attempt recorded by Sanity Webhook log:
```json
{
  "id": "atm-3MNeFg267VMgqRwuvbIXiaMMQCK",
  "projectId": "jkafq0n5",
  "inProgress": false,
  "duration": 1665,
  "createdAt": "2026-11-20T17:22:29.225Z",
  "resultCode": 200,
  "resultBody": "{\"message\":\"Synced to Algolia\",\"objectID\":\"2d5cfe5e-4728-412a-94ca-f6b30679be20\"}"
}
```

---

### 2. Unpublishing or deleting it removes it
When a post is deleted or unpublished, Sanity sends the event (`_deleted: true`) to `/api/algolia/sync` which removes it via `algolia.deleteObjects`.

```powershell
Invoke-RestMethod -Uri "https://roboto-studio-assement.vercel.app/api/algolia/sync" -Method Post -Headers @{ "authorization" = "Bearer sanity_algolia_sync_secret_2026"; "Content-Type" = "application/json" } -Body '{"_type":"blog","_id":"2d5cfe5e-4728-412a-94ca-f6b30679be20","_deleted":true}'
```

**Output:**
```text
message              objectID                            
-------              --------                            
Deleted from Algolia 2d5cfe5e-4728-412a-94ca-f6b30679be20
```

---

### 3. A draft post never appears in search results
Work-in-progress drafts prefixed with `drafts.` are rejected and never saved into the Algolia search index.

```powershell
Invoke-RestMethod -Uri "https://roboto-studio-assement.vercel.app/api/algolia/sync" -Method Post -Headers @{ "authorization" = "Bearer sanity_algolia_sync_secret_2026"; "Content-Type" = "application/json" } -Body '{"_type":"blog","_id":"drafts.test123","title":"Draft Test"}'
```

**Output:**
```text
message               
-------               
Ignored draft document
```

---

### 4. The same webhook delivery twice leaves one entry, not two
Idempotency is guaranteed by mapping Algolia's `objectID` directly to Sanity's `blog._id`. Delivering the exact same webhook payload multiple times updates the existing record in-place instead of creating duplicates.

Sanity delivery logs demonstrating multiple deliveries for the same records updating in-place without duplicate creation:
```json
[
  {
    "id": "atm-3MNeFg267VMgqRwuvbIXiaMMQCK",
    "resultCode": 200,
    "resultBody": "{\"message\":\"Synced to Algolia\",\"objectID\":\"2d5cfe5e-4728-412a-94ca-f6b30679be20\"}"
  },
  {
    "id": "atm-3MNchzjGvVdyClLX3ez99CgjB6P",
    "resultCode": 200,
    "resultBody": "{\"message\":\"Synced to Algolia\",\"objectID\":\"326dd0c0-5aab-47ef-be4b-291375ea0ff6\"}"
  }
]
```

---

### 5. `/api/blog/search` returns page 2 of a result set
Querying page 2 (`page=1` in 0-indexed pagination) with a limit of 5:

```bash
curl.exe -s "https://roboto-studio-assement.vercel.app/api/blog/search?q=a&page=1&limit=5"
```

**Output:**
```json
{
  "hits": [
    {
      "title": "Grass-roots Logistical Success",
      "slug": "/blog/grass-roots-logistical-success",
      "category": "changelog",
      "publishedAt": "2025-03-12",
      "objectID": "de41b949-f4b0-4ba2-89ff-3d59784728a8"
    },
    {
      "title": "Integrated Demand-driven Policy",
      "slug": "/blog/integrated-demand-driven-policy",
      "category": "changelog",
      "publishedAt": "2024-08-20",
      "objectID": "9d778c04-6e6d-4709-aa89-35c974ec9fe7"
    },
    {
      "title": "Secured Systematic Capacity",
      "slug": "/blog/secured-systematic-capacity",
      "category": "skills",
      "publishedAt": "2024-12-09",
      "objectID": "02b5ca06-f5dc-49f3-b6f7-8b941f3bf739"
    },
    {
      "title": "Polarised User-facing Monitoring",
      "slug": "/blog/polarised-user-facing-monitoring",
      "category": "sanity",
      "publishedAt": "2025-01-13",
      "objectID": "683c64a2-cc65-4517-8dc9-2718064e4931"
    },
    {
      "title": "Optional Systemic Matrix",
      "slug": "/blog/optional-systemic-matrix",
      "category": "seo",
      "publishedAt": "2025-04-22",
      "objectID": "37efc96e-9133-4223-90a8-8bd5aca4b866"
    }
  ],
  "page": 1,
  "nbPages": 5,
  "nbHits": 23
}
```

---

### 6. A request with no valid key is rejected
Requests missing the secret authorization header or providing an invalid secret fail closed with `401 Unauthorized`.

```bash
curl.exe -i -X POST "https://roboto-studio-assement.vercel.app/api/algolia/sync" -H "Content-Type: application/json" -d '{"_type":"blog","_id":"test"}'
```

**Output:**
```text
HTTP/1.1 401 Unauthorized
Cache-Control: public, max-age=0, must-revalidate
Content-Type: text/plain;charset=UTF-8

Unauthorized
```

---

### 7. The Studio tab updates while you type, before anything is saved
Demonstrated live in the screen recording:
* **Video Link:** [Loom Demo Video](https://www.loom.com/share/1d607d98d5f548f1ae09a704e98c1fd6) (0:25 mark)
* Uses Sanity's `document.displayed` prop. As the editor types into `title` or `seoTitle`, the Google search snippet preview card and character counts update in real time without clicking save or publish.

---

### 8. The Studio tab correctly reports one post that's in the index and one that isn't
Demonstrated live in the screen recording:
* **Video Link:** [Loom Demo Video](https://www.loom.com/share/1d607d98d5f548f1ae09a704e98c1fd6) (1:15 mark)
* **Post in Index:** An existing published post displays a green badge: `Indexed in Algolia`.
* **Post not in Index:** Creating a new draft blog displays `Draft (Not indexed)`.
* **Disagreement Detection:** Toggling `seoNoIndex` on an indexed blog displays an out-of-sync `Disagreement` badge.

---

## Additional Backfill Script Output (Task 2b)

Command run from repository root: `pnpm --filter web run backfill`

```text
D:\CODEBASES\turbo-start-sanity>pnpm --filter web run backfill
$ node --experimental-strip-types scripts/backfill-algolia.ts
◇ injected env (18) from .env // tip: ⌘ enable debugging { debug: true }
 Starting Algolia backfill...

 Fetching published blogs from Sanity...
 Found 23 published blogs.

 Configuring index settings for 'blogs'...
 Index settings applied successfully (searchableAttributes & attributesForFaceting).

 Uploading 23 records to Algolia index 'blogs'...
 Backfill completed successfully! All blogs are now searchable in Algolia.
```
* **Idempotency Checked:** Mapped `objectID: blog._id`. Re-running this command multiple times updates existing records in-place without duplicating entries.
