export interface ApifyActor {
  id: string;
  label: string;
  description: string;
  timeoutSeconds: number;
}

export const ACTORS = {
  INSTAGRAM: {
    id: "apify/instagram-scraper",
    label: "Instagram Scraper",
    description:
      "Scrapes Instagram profiles, posts, reels, hashtags, comments, and search results in one run",
    timeoutSeconds: 300,
  },
  GOOGLE_SEARCH: {
    id: "apify/google-search-scraper",
    label: "Google Search Scraper",
    description:
      "Scrapes Google search results for local competitor discovery and search intent",
    timeoutSeconds: 120,
  },
} as const satisfies Record<string, ApifyActor>;

export type ActorKey = keyof typeof ACTORS;

export interface InstagramProfileLookupInput {
  directUrls: string[];
  resultsType: "details";
  resultsLimit: number;
}

export interface InstagramPostsForProfileInput {
  directUrls: string[];
  resultsType: "posts";
  resultsLimit: number;
}

export interface InstagramHashtagSearchInput {
  hashtags: string[];
  resultsType: "posts";
  resultsLimit: number;
}

export interface InstagramLocationSearchInput {
  searchType: "place";
  searchQueries: string[];
  resultsLimit: number;
}

export interface InstagramCommentsInput {
  directUrls: string[];
  resultsType: "comments";
  resultsLimit: number;
}

export interface GoogleLocalCompetitorsInput {
  queries: string; // newline-separated per Apify google-search-scraper input schema
  maxPagesPerQuery: number;
  resultsPerPage: number;
}

export const INPUT_TEMPLATES = {
  INSTAGRAM_PROFILE_LOOKUP: {
    directUrls: [],
    resultsType: "details",
    resultsLimit: 1,
  } as InstagramProfileLookupInput,

  INSTAGRAM_POSTS_FOR_PROFILE: {
    directUrls: [],
    resultsType: "posts",
    resultsLimit: 50,
  } as InstagramPostsForProfileInput,

  INSTAGRAM_HASHTAG_SEARCH: {
    hashtags: [],
    resultsType: "posts",
    resultsLimit: 30,
  } as InstagramHashtagSearchInput,

  INSTAGRAM_LOCATION_SEARCH: {
    searchType: "place",
    searchQueries: [],
    resultsLimit: 20,
  } as InstagramLocationSearchInput,

  INSTAGRAM_COMMENTS: {
    directUrls: [],
    resultsType: "comments",
    resultsLimit: 30,
  } as InstagramCommentsInput,

  GOOGLE_LOCAL_COMPETITORS: {
    queries: "",
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
  } as GoogleLocalCompetitorsInput,
} as const;
