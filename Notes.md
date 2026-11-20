# NOTES.md

* **Production URL:** `https://roboto-studio-assement.vercel.app`
* **Deployed Sanity Studio:** `https://www.sanity.io/@oefl3uk4c/studio/pv2hjjuybmsnf7i4go7vf0p4`

---

## Section 1: What I built and why

### Task 1: Newsletter Signup
* I created a subscriber document in Sanity Studio and defined its schema (`email`, `subscribedAt`, `status`). I set the fields to `readOnly: true` so editors can see subscribers in the sidebar, but cannot accidentally edit or delete their emails.
* After that, I created the route (`/api/newsletter`). To make sure the route handles different ways people submit, I implemented dual parsing. It accepts requests from curl/fetch (`application/json`) as well as native form submissions directly through the website (`application/x-www-form-urlencoded` and `multipart/form-data`).
* I made sure it is idempotent so that two retries with the same email do not create two subscriber entries. I used a deterministic SHA-256 hash for the document ID and used Sanity's built-in `createIfNotExists()`.
* Rate limiting: it lives on the random access memory (RAM) of the server inside a sliding window map. It takes up to 5 requests per minute per IP. If exceeded, it sends a `429 Too Many Requests` status code to prevent bot spam.
* Lastly, I connected the frontend newsletter block on the site to the route I created. For native browser forms, it returns an HTTP 303 redirect back to the page with `?newsletter=success`.

---

### Task 2: Move Blog Search onto Algolia

#### Task 2b: Backfill Script
* I used a GROQ query to select and extract things from Sanity, telling what to include and what to exclude (excluding drafts and internal Sanity fields). This helps in keeping the index clean and fast for search queries.
* There were two options to set up the index: first is through the Algolia dashboard, and second is through writing a script in code. I did not use the dashboard because it is manual and prone to human error, no audit can be done, and it goes directly to production which can cause problems. In code, the script can be reviewed through a PR, reproduced anytime, with less chance of causing issues.
* Idempotency: I had to make sure that running the backfill script multiple times does not create duplicate entries. So I mapped Algolia's objectID to Sanity's blog ID (`objectID: blog._id`). I ran the script multiple times in my terminal and it passed the test.
* Lastly, currently we only have around 23 objects, but if hypothetically we have 4,000 blogs, we can't send them one by one. So we have to batch them together and send them at one time. I used Algolia's pre-written `saveObjects` function for this.

#### Task 2c: Blog Search API & Frontend
* The previous Fuse.js search was taking too much RAM and causing problems on the client by loading all blogs into the browser. So I switched to Algolia using the search-only key. It can safely be exposed to the browser because it is read-only.
* We introduced rate limiting, similar to what we did in the newsletter task. It runs in memory/RAM. At a given time window, users can only make a certain number of calls, so I set it to 30 requests per minute.
* Input bounding: queries with more than 100 characters get cut down to 100, and pages are bounded from 0 to 100.
* Category filtering: I passed the selected category pill directly into the Algolia search filter (`filters: category:"..."`), so clicking category buttons filters results on Algolia.
* Lastly, if hypothetically Algolia is not reachable or is down, I want users to see a proper response like "service unavailable" (503) instead of returning a false empty array.

#### Task 2a: Webhook Sync Route
* First, I made sure the webhook connection is safe and authenticated to prevent timing attacks. When comparing the secret, I used Node's built-in `timingSafeEqual` function.
* I made sure drafts are not indexed and checked that only blogs are added (`_type === "blog"`), excluding authors, FAQs, etc.
* Idempotency: A webhook can fire multiple times by accident (or during retries), so we don't want the same blog indexed multiple times. Using the blog ID as the objectID keeps it idempotent. If deleted/unpublished, it removes it from Algolia.
* Also, the Algolia admin key is not public because it has both read and write permissions, so I kept it safe on the server only.

---

### Task 3: SEO and Indexing View in Sanity Studio
* **Real-time updates without external state:** I built the SEO & Index view inside the Studio without adding custom state management like Redux, event listeners, or debouncing. Sanity already provides the `document.displayed` prop, which streams updates live as the editor types before anything is saved or published.
* **Google SERP preview card:** Because there is no official library for Google search snippets, I used custom CSS (with AI assistance) to mimic Google's desktop search snippet typography, line height, spacing, and colors.
* **Fallback hierarchy:** When specific SEO fields are not provided, the preview automatically falls back to the post content fields:
  * Title: `seoTitle` -> `title`
  * Description: `seoDescription` -> `description`
  * Image: `seoImage` -> `image`
* **Character limits & justification:**
  * **Description:** I used `apps/studio/schemaTypes/documents/blog.ts` as the reference, where the schema defines validation rules of minimum 140 and maximum 160 characters.
  * **Title:** Kept within 1 to 60 characters, which aligns with Google's search result snippet pixel cutoff before truncating with an ellipsis. Exceeding or missing these limits displays visual warning badges.
* **Studio integration & UI components:** Injected the custom SEO panel into `apps/studio/structure.ts` by extending `.views()` alongside the default form view (`S.view.form()`). Used `@sanity/ui` primitives (`Card`, `Stack`, `Text`, `Badge`) to keep the interface consistent with Sanity Studio's native design system.
* **Algolia browser security & draft IDs:**
  * Used Algolia's **Search-Only Key** (never the Admin API Key) since this runs client-side in the browser.
  * Sanity prefixes draft documents with `drafts.`. To check whether the document is in the Algolia index, I stripped this prefix using `doc._id.replace(/^drafts\./, '')` to match against the published `objectID` in Algolia and flag any disagreements (e.g. published posts missing from search, or `seoNoIndex` posts still sitting in the index).

---

## Section 2: What I noticed (Bugs Found / Observations)

* **Direct API navigation on native form rate-limit:** When someone submits the newsletter through the website's HTML form more than 5 times, the browser directly loads the raw `/api/newsletter` page showing the JSON error (`{"error":"Too many requests..."}`). This happens because a standard HTML `<form action="/api/newsletter">` navigates the browser window directly to the action URL when an error status (like 429 or 400) is returned without a redirect.
* **Turborepo cache warning on Vercel:** When adding new keys like `ALGOLIA_ADMIN_API_KEY` and `SANITY_ALGOLIA_WEBHOOK_SECRET`, Turborepo warned during Vercel builds that they were missing from `turbo.json`. That took me quite a bit of time to debug, so I added both of them to `globalEnv` in `turbo.json` so they get recognized at build time.
* **`orderRank` warning in Studio:** In the blog document editor, there is a warning stating *"Unknown field found. The field is not defined in the schema"*. This appears to be leftover data from a legacy drag-and-drop ordering plugin. It should either be removed from the dataset or defined in the blog schema.
* **Draft ID prefix behavior:** Sanity prefixes documents currently being edited with `drafts.<id>`, which will fail lookups against external search engines or databases unless the prefix is stripped first.

---

## Section 3: What I'd do with more time

* **Frontend Notifications & Status Handling:** For the newsletter, I would add push/toast notifications on the frontend instead of raw API redirects. I would also return more specific status messages (for example, telling the user *"You are already subscribed!"* rather than a generic success).
* **Advanced Bot & Rate Limiting Techniques:** I would implement advanced bot prevention techniques, like a hidden honeypot form field (which bots fill out but humans don't) and Cloudflare Turnstile / bot protection to filter out scripts before they even touch the server.
* **Webhook Retries and Fallbacks:** If Algolia is temporarily unreachable or down when something changes in Sanity, the webhook would fail and that update would be missed. I would like to figure out a retry or queue system so that failed syncs don't just get dropped and can retry automatically once Algolia is back up.
* **Detailed Webhook Logging:** I would make more detailed logging inside the webhook attempt logs, making it clearly visible whether a draft was detected, why a payload was accepted, or the exact reason why a document was rejected.
* **Persistent Rate Limiting (Redis):** Currently, rate limiting is stored in server RAM in a Map. On serverless platforms like Vercel, memory isn't shared across different instances. I would connect an Upstash Redis store so the rate limit persists across serverless cold starts.
* **Studio Deep Dive:** Honestly, I would spend more time reading through the Studio editor internals, understanding all the schema fields (like Open Graph settings and metadata), and exploring what each field does under the hood.
