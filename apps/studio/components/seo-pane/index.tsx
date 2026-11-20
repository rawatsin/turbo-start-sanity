import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface SeoPaneProps {
  document: {
    displayed: Record<string, any>;
    draft: Record<string, any> | null;
    published: Record<string, any> | null;
  };
  documentId: string;
  schemaType: {
    name: string;
    title?: string;
  };
}

export function SeoPane({ document }: SeoPaneProps) {
  const doc = document.displayed || {};
  const isPublished = Boolean(document.published);

  // 1. Compute Fallbacks (per seo-fields.ts fallback rules)
  const title = (doc.seoTitle || doc.title || "").trim();
  const description = (doc.seoDescription || doc.description || "").trim();
  const slug = doc.slug?.current || "untitled-post";
  const hasImage = Boolean(doc.seoImage?.asset || doc.image?.asset);
  const isNoIndex = Boolean(doc.seoNoIndex);

  // Clean published ID (strip "drafts." prefix)
  const publishedId = (doc._id || "").replace(/^drafts\./, "");

  // 2. SEO Checks logic
  const titleLength = title.length;
  const isTitleSet = titleLength > 0;
  const isTitleOptimal = titleLength > 0 && titleLength <= 60;

  const descLength = description.length;
  const isDescOptimal = descLength >= 140 && descLength <= 160;

  // 3. Algolia Status State
  const [algoliaStatus, setAlgoliaStatus] = useState<
    "loading" | "indexed" | "not_indexed" | "error"
  >("loading");
  const [isChecking, setIsChecking] = useState(false);

  const appId =
    process.env.SANITY_STUDIO_ALGOLIA_APP_ID ||
    process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID ||
    "";
  const searchKey =
    process.env.SANITY_STUDIO_ALGOLIA_SEARCH_KEY ||
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ||
    "";
  const indexName =
    process.env.SANITY_STUDIO_ALGOLIA_INDEX_NAME ||
    process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ||
    "blogs";

  const checkAlgolia = useCallback(async () => {
    if (!appId || !searchKey || !publishedId) {
      setAlgoliaStatus("error");
      return;
    }

    setIsChecking(true);
    try {
      const res = await fetch(
        `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/${encodeURIComponent(publishedId)}`,
        {
          headers: {
            "X-Algolia-Application-Id": appId,
            "X-Algolia-API-Key": searchKey,
          },
        }
      );

      if (res.status === 200) {
        setAlgoliaStatus("indexed");
      } else if (res.status === 404) {
        setAlgoliaStatus("not_indexed");
      } else {
        setAlgoliaStatus("error");
      }
    } catch {
      setAlgoliaStatus("error");
    } finally {
      setIsChecking(false);
    }
  }, [appId, searchKey, indexName, publishedId]);

  useEffect(() => {
    checkAlgolia();
  }, [checkAlgolia]);

  return (
    <Card height="fill" overflow="auto" padding={4} tone="transparent">
      <Stack gap={5}>
        <Heading size={1}>SEO &amp; Index Inspector</Heading>

        {/* ── CARD 1: SEARCH PREVIEW (Google SERP Simulator) ── */}
        <Card border padding={4} radius={3} tone="primary">
          <Stack gap={3}>
            <Text muted size={1} weight="semibold">
              SEARCH PREVIEW (Google SERP)
            </Text>

            <Box
              style={{
                backgroundColor: "#ffffff",
                padding: "16px",
                borderRadius: "8px",
                fontFamily: "Arial, sans-serif",
                color: "#1a0dab",
              }}
            >
              {/* Breadcrumb URL */}
              <div
                style={{
                  color: "#202124",
                  fontSize: "14px",
                  marginBottom: "4px",
                }}
              >
                <span>yoursite.com</span>
                <span style={{ color: "#5f6368" }}> › blog › {slug}</span>
              </div>

              {/* Title (Truncated at 60 chars) */}
              <div
                style={{
                  color: "#1a0dab",
                  fontSize: "20px",
                  lineHeight: "1.3",
                  textDecoration: "underline",
                  marginBottom: "4px",
                  wordBreak: "break-word",
                }}
              >
                {title
                  ? title.length > 60
                    ? `${title.slice(0, 60)}…`
                    : title
                  : "Untitled Blog Post"}
              </div>

              {/* Description (Truncated at 160 chars) */}
              <div
                style={{
                  color: "#4d5156",
                  fontSize: "14px",
                  lineHeight: "1.58",
                  wordBreak: "break-word",
                }}
              >
                {description
                  ? description.length > 160
                    ? `${description.slice(0, 160)}…`
                    : description
                  : "No description provided. Search engines will generate a snippet from your content."}
              </div>
            </Box>
          </Stack>
        </Card>

        {/* ── CARD 2: SEO CHECKS ── */}
        <Card border padding={4} radius={3}>
          <Stack gap={4}>
            <Text muted size={1} weight="semibold">
              SEO CHECKS
            </Text>

            <Stack gap={3}>
              {/* Check 1: Meta Title */}
              <Flex align="center" gap={3}>
                {isTitleOptimal ? (
                  <CheckCircle2 color="#22c55e" size={18} />
                ) : isTitleSet ? (
                  <AlertCircle color="#eab308" size={18} />
                ) : (
                  <XCircle color="#ef4444" size={18} />
                )}
                <Text size={1}>
                  {isTitleOptimal
                    ? `Meta title optimal — ${titleLength} characters`
                    : isTitleSet
                      ? `Meta title too long — ${titleLength} characters (recommended ≤ 60)`
                      : "Meta title missing"}
                </Text>
              </Flex>

              {/* Check 2: Meta Description */}
              <Flex align="center" gap={3}>
                {isDescOptimal ? (
                  <CheckCircle2 color="#22c55e" size={18} />
                ) : descLength === 0 ? (
                  <XCircle color="#ef4444" size={18} />
                ) : (
                  <AlertCircle color="#eab308" size={18} />
                )}
                <Text size={1}>
                  {descLength === 0
                    ? "Meta description missing"
                    : isDescOptimal
                      ? `Description optimal length — ${descLength} characters`
                      : descLength < 140
                        ? `Description too short — ${descLength} characters (schema recommends 140–160)`
                        : `Description too long — ${descLength} characters (schema recommends 140–160)`}
                </Text>
              </Flex>

              {/* Check 3: Image Set */}
              <Flex align="center" gap={3}>
                {hasImage ? (
                  <CheckCircle2 color="#22c55e" size={18} />
                ) : (
                  <XCircle color="#ef4444" size={18} />
                )}
                <Text size={1}>{hasImage ? "Image set" : "Image missing"}</Text>
              </Flex>

              {/* Check 4: Indexing Allowed */}
              <Flex align="center" gap={3}>
                {!isNoIndex ? (
                  <CheckCircle2 color="#22c55e" size={18} />
                ) : (
                  <AlertCircle color="#eab308" size={18} />
                )}
                <Text size={1}>
                  {!isNoIndex
                    ? "Indexing allowed"
                    : "Do Not Index is switched ON (seoNoIndex)"}
                </Text>
              </Flex>
            </Stack>
          </Stack>
        </Card>

        {/* ── CARD 3: SEARCH INDEX STATUS (Algolia Live Check) ── */}
        <Card border padding={4} radius={3}>
          <Stack gap={4}>
            <Flex align="center" justify="space-between">
              <Text muted size={1} weight="semibold">
                SEARCH INDEX STATUS (Algolia)
              </Text>
              <Button
                disabled={isChecking}
                fontSize={1}
                icon={RefreshCw}
                mode="ghost"
                onClick={checkAlgolia}
                padding={2}
                text={isChecking ? "Checking…" : "Re-check"}
              />
            </Flex>

            {isChecking || algoliaStatus === "loading" ? (
              <Flex align="center" gap={3} paddingY={2}>
                <Spinner size={2} />
                <Text muted size={1}>
                  Checking Algolia search index for objectID:{" "}
                  <code>{publishedId}</code>…
                </Text>
              </Flex>
            ) : algoliaStatus === "error" ? (
              <Card padding={3} radius={2} tone="caution">
                <Flex align="center" gap={3}>
                  <AlertCircle color="#eab308" size={18} />
                  <Text size={1}>
                    Could not query Algolia. Please check your Studio
                    environment variables (SANITY_STUDIO_ALGOLIA_SEARCH_KEY).
                  </Text>
                </Flex>
              </Card>
            ) : algoliaStatus === "indexed" && isPublished && !isNoIndex ? (
              // Case 1: All in sync!
              <Card padding={3} radius={2} tone="positive">
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <CheckCircle2 color="#22c55e" size={18} />
                    <Text size={1} weight="semibold">
                      Found in Algolia (objectID: {publishedId})
                    </Text>
                    <Badge tone="positive">In Sync</Badge>
                  </Flex>
                  <Text muted size={1}>
                    This blog post is published and searchable in Algolia.
                  </Text>
                </Stack>
              </Card>
            ) : algoliaStatus === "not_indexed" && isPublished && !isNoIndex ? (
              // Case 2: Disagreement - Published but missing from Algolia!
              <Card padding={3} radius={2} tone="critical">
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <XCircle color="#ef4444" size={18} />
                    <Text size={1} weight="semibold">
                      Not found in Algolia — but this post is published.
                    </Text>
                    <Badge tone="critical">Out of Sync</Badge>
                  </Flex>
                  <Text size={1}>
                    Something is out of sync. This post is published in Sanity
                    but does not exist in the search index.
                  </Text>
                </Stack>
              </Card>
            ) : algoliaStatus === "indexed" && isNoIndex ? (
              // Case 3: Disagreement - seoNoIndex is true, but sitting in Algolia!
              <Card padding={3} radius={2} tone="critical">
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <XCircle color="#ef4444" size={18} />
                    <Text size={1} weight="semibold">
                      Found in Algolia — but "Do Not Index" is set on this post!
                    </Text>
                    <Badge tone="critical">Out of Sync</Badge>
                  </Flex>
                  <Text size={1}>
                    This post has "Do Not Index" enabled, but it is currently
                    sitting in search results. It should be removed.
                  </Text>
                </Stack>
              </Card>
            ) : !isPublished && algoliaStatus === "indexed" ? (
              // Case 4: Disagreement - Draft is sitting in Algolia!
              <Card padding={3} radius={2} tone="critical">
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <XCircle color="#ef4444" size={18} />
                    <Text size={1} weight="semibold">
                      Draft found in Algolia!
                    </Text>
                    <Badge tone="critical">Draft Indexed</Badge>
                  </Flex>
                  <Text size={1}>
                    This document is an unpublished draft, but its ID was found
                    in Algolia. Drafts must never appear in search results.
                  </Text>
                </Stack>
              </Card>
            ) : (
              // Case 5: Unpublished draft and not in Algolia (Correct behavior)
              <Card padding={3} radius={2} tone="default">
                <Stack gap={2}>
                  <Flex align="center" gap={2}>
                    <CheckCircle2 color="#22c55e" size={18} />
                    <Text size={1} weight="semibold">
                      Not in Algolia (Unpublished Draft)
                    </Text>
                    <Badge tone="default">Draft</Badge>
                  </Flex>
                  <Text muted size={1}>
                    This document is an unpublished draft. Drafts are safely
                    excluded from the search index.
                  </Text>
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}
