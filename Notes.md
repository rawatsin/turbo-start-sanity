## Task 3: SEO and Indexing View in Sanity Studio

### Section 1: Architecture & Technical Decisions

- **Real-time updates without external state:** I built the SEO & Index view inside the Studio without adding custom state management like Redux, event listeners, or debouncing. Sanity already provides the `document.displayed` prop, which streams updates live as the editor types before anything is saved or published.
- **Google SERP preview card:** Because there is no official library for Google search snippets, I used custom CSS (with AI assistance) to mimic Google's desktop search snippet typography, line height, spacing, and colors.
- **Fallback hierarchy:** When specific SEO fields are not provided, the preview automatically falls back to the post content fields:
  - Title: `seoTitle` -> `title`
  - Description: `seoDescription` -> `description`
  - Image: `seoImage` -> `image`
- **Character limits & justification:**
  - **Description:** I used `apps/studio/schemaTypes/documents/blog.ts` as the reference, where the schema defines validation rules of minimum 140 and maximum 160 characters.
  - **Title:** Kept within 1 to 60 characters, which aligns with Google's search result snippet pixel cutoff before truncating with an ellipsis. Exceeding or missing these limits displays visual warning badges.
- **Studio integration & UI components:** Injected the custom SEO panel into `apps/studio/structure.ts` by extending `.views()` alongside the default form view (`S.view.form()`). Used `@sanity/ui` primitives (`Card`, `Stack`, `Text`, `Badge`) to keep the interface consistent with Sanity Studio's native design system.
- **Algolia browser security & draft IDs:**
  - Used Algolia's **Search-Only Key** (never the Admin API Key) since this runs client-side in the browser.
  - Sanity prefixes draft documents with `drafts.`. To check whether the document is in the Algolia index, I stripped this prefix using `doc._id.replace(/^drafts\./, '')` to match against the published `objectID` in Algolia and flag any disagreements (e.g. published posts missing from search, or `seoNoIndex` posts still sitting in the index).

### Section 2: Bugs Found / Observations

- **`orderRank` warning in Studio:** In the blog document editor, there is a warning stating _"Unknown field found. The field is not defined in the schema"_. This appears to be leftover data from a legacy drag-and-drop ordering plugin. It should either be removed from the dataset or defined in the blog schema.
- **Draft ID prefix behavior:** Sanity prefixes documents currently being edited with `drafts.<id>`, which will fail lookups against external search engines or databases unless the prefix is stripped first.

### Section 3: What I'd Do Next (If I Had More Time)

- Honestly, I don't know what more to add here right now. If I had more time, I would spend it reading more about the Sanity Studio editor, all the schema fields (like Open Graph settings and metadata), and understanding what each of those fields does under the hood.
