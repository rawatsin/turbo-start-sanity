# Verification Guide (VERIFY.md)

## Task 3: SEO and Indexing View in Sanity Studio

### 1. Screen Recording

- **Demo Video Link:** `https://www.loom.com/share/1d607d98d5f548f1ae09a704e98c1fd6` (Duration: < 3 minutes)

### 2. Live URLs

- **Deployed Sanity Studio:** `https://www.sanity.io/@oefl3uk4c/studio/pv2hjjuybmsnf7i4go7vf0p4`
- **Deployed Vercel Production Site:** `https://roboto-studio-assement.vercel.app`
- **Invited Reviewers:** `hrithik@robotostudio.com` and `jono@robotostudio.com` invited to the Sanity project `jkafq0n5`.

---

### 3. Verification Steps & Results

#### Test 3.1: Real-Time SERP Preview Updates (`document.displayed`)

- **Test:** Open any blog in Sanity Studio, switch to the `[ SEO & Index ]` view, and edit the Title / SEO Title in real time.
- **Result:** **PASS**
  - The Google SERP snippet preview updates immediately as characters are typed.
  - No manual save, publish action, or page reload is required.

#### Test 3.2: Fallback Hierarchy

- **Test:** Test missing SEO values against post content fields.
  - Clear `seoTitle` $\rightarrow$ verifies snippet falls back to post `title`.
  - Clear `seoDescription` $\rightarrow$ verifies snippet falls back to post `description`.
  - Clear `seoImage` $\rightarrow$ verifies preview falls back to post `image`.
- **Result:** **PASS**
  - Fallback hierarchy resolves correctly across all three fields.

#### Test 3.3: SEO Checklist & Character Bounds

- **Test:** Verify length boundaries against schema validation and search engine standards:
  - **Title limit (1–60 chars):** Titles under 60 chars show a green checkmark; titles exceeding 60 characters display a yellow warning badge indicating Google snippet pixel truncation.
  - **Description bounds (140–160 chars):** Values under 140 or over 160 characters show yellow warning badges referencing `apps/studio/schemaTypes/documents/blog.ts` validation rules. Values between 140–160 show a green checkmark.
- **Result:** **PASS**
  - Checklist dynamically flags warnings and passes according to character length rules.

#### Test 3.4: Algolia Client-Side Status & Disagreement Detection

- **Test:** Verify live Algolia querying and status state matching:
  - **Published Blog (In Sync):** Published post displays a green badge: `Indexed in Algolia` with matching Algolia `objectID`.
  - **Draft Document:** Creating an unpublished draft blog displays a `Draft (Not indexed)` badge, properly verifying drafts are omitted from search.
  - **Disagreement Detection:** When `seoNoIndex` is checked on an already-indexed blog, the component flags an out-of-sync **Disagreement** badge (document marked `noindex` but present in Algolia index).
- **Result:** **PASS**
  - Strip `drafts.` prefix logic accurately targets published object IDs.
  - Uses client-side Search-Only API key safely in the browser.
