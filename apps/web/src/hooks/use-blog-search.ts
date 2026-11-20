"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import type { Blog } from "@/types";

const SEARCH_DEBOUNCE_MS = 400;
const CACHE_STALE_TIME_MS = 30_000;

interface AlgoliaSearchResponse {
  hits: Blog[];
  page: number;
  nbPages: number;
  nbHits: number;
}

// Added 'category' parameter to support on-site category filtering
async function searchBlog(
  query: string,
  category: string | undefined,
  signal: AbortSignal
): Promise<Blog[]> {
  if (!query.trim()) {
    return [];
  }

  // Appended &category=... if an active category is present
  const categoryParam = category
    ? `&category=${encodeURIComponent(category)}`
    : "";

  const response = await fetch(
    `/api/blog/search?q=${encodeURIComponent(query)}${categoryParam}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Failed to search");
  }

  // Extract 'hits' and map 'objectID' to '_id' for React key prop
  const data = (await response.json()) as AlgoliaSearchResponse;
  return (data.hits ?? []).map((hit: any) => ({
    ...hit,
    _id: hit._id || hit.objectID,
  }));
}

export function useBlogSearch(activeCategory?: string) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const hasQuery = debouncedQuery.trim().length > 0;
  const { data, isLoading, error } = useQuery({
    // Included activeCategory in queryKey so results update when switching categories
    queryKey: ["blog-search", debouncedQuery, activeCategory],
    // Pass activeCategory into searchBlog
    queryFn: ({ signal }) => searchBlog(debouncedQuery, activeCategory, signal),
    enabled: hasQuery,
    staleTime: CACHE_STALE_TIME_MS,
  });

  return {
    searchQuery,
    setSearchQuery,
    results: data ?? [],
    isSearching: isLoading,
    error,
    hasQuery,
  };
}
