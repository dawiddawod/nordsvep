const JOBSEARCH = "https://jobsearch.api.jobtechdev.se";
const JOBLINKS = "https://links.api.jobtechdev.se";
const TAXONOMY = "https://taxonomy.api.jobtechdev.se/v1/taxonomy";

export type Job = {
  id: string;
  headline: string;
  employer: string;
  location: string | null;
  hours: string | null;
  // The job site JobAd Links found the ad on; null for Platsbanken's own ads.
  source: string | null;
  adUrl: string;
  applyUrl: string | null;
  excerpt: string;
};

export type Option = { id: string; label: string };

export type JobFilters = { field?: string; q?: string; page?: number };

type SearchHit = {
  id: string;
  headline: string;
  employer: { name: string | null; workplace: string | null };
  workplace_address: { municipality: string | null; region: string | null };
  working_hours_type: { label: string } | null;
  webpage_url: string;
  application_details: { url: string | null } | null;
  description: { text: string | null };
};

type LinksHit = {
  id: string;
  headline: string;
  brief: string | null;
  employer: { name: string | null };
  workplace_addresses: { municipality: string | null; region: string | null }[];
  source_links: { label: string; url: string }[];
};

type Concept = {
  "taxonomy/id": string;
  "taxonomy/preferred-label": string;
};

const PLATSBANKEN_PER_PAGE = 20;
// After dropping Platsbanken duplicates, JobAd Links adds only ~4% more ads, so a few per page spreads them through the deck.
const LINKS_PER_PAGE = 4;
// Both APIs refuse offsets beyond 2000.
const MAX_OFFSET = 2000;

export async function searchJobs({ field, q, page = 0 }: JobFilters) {
  const [platsbanken, links] = await Promise.all([
    withinLimit(page * PLATSBANKEN_PER_PAGE, (offset) => searchPlatsbanken(field, q, offset)),
    // Extra ads are a bonus: if JobAd Links is down, keep swiping Platsbanken rather than failing the page.
    withinLimit(page * LINKS_PER_PAGE, (offset) => searchLinks(field, q, offset)).catch(() => NO_RESULTS),
  ]);

  const next = page + 1;
  const hasMore =
    next * PLATSBANKEN_PER_PAGE < Math.min(platsbanken.total, MAX_OFFSET) ||
    next * LINKS_PER_PAGE < Math.min(links.total, MAX_OFFSET);

  return { jobs: interleave(platsbanken.jobs, links.jobs), hasMore };
}

const NO_RESULTS = { total: 0, jobs: [] as Job[] };

// The sources run out at different pages; once one passes the offset limit, the other keeps the deck going.
function withinLimit(offset: number, search: (offset: number) => Promise<typeof NO_RESULTS>) {
  return offset < MAX_OFFSET ? search(offset) : Promise.resolve(NO_RESULTS);
}

function filterParams(field: string | undefined, q: string | undefined, offset: number, limit: number) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort: "pubdate-desc" });
  if (field) params.set("occupation-field", field);
  // Free text also matches places, so "Göteborg" doubles as a location filter.
  if (q) params.set("q", q);
  return params;
}

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

async function searchPlatsbanken(field: string | undefined, q: string | undefined, offset: number) {
  const params = filterParams(field, q, offset, PLATSBANKEN_PER_PAGE);
  // Short cache: ads change through the day, but every swiper on the same filter shares one upstream call.
  const data = await getJson<{ total: { value: number }; hits: SearchHit[] }>(`${JOBSEARCH}/search?${params}`, 300);
  return { total: data.total.value, jobs: data.hits.map(fromPlatsbanken) };
}

async function searchLinks(field: string | undefined, q: string | undefined, offset: number) {
  const params = filterParams(field, q, offset, LINKS_PER_PAGE);
  // Most JobAd Links ads are copies of Platsbanken ads, which we already get in full from JobSearch.
  params.set("exclude_source", "arbetsformedlingen.se");
  const data = await getJson<{ total: { value: number }; hits: LinksHit[] }>(`${JOBLINKS}/joblinks?${params}`, 300);
  return { total: data.total.value, jobs: data.hits.filter((h) => h.source_links.length).map(fromLinks) };
}

function fromPlatsbanken(hit: SearchHit): Job {
  const { municipality, region } = hit.workplace_address;
  return {
    id: hit.id,
    headline: hit.headline,
    employer: hit.employer.workplace ?? hit.employer.name ?? "Unknown employer",
    location: municipality ?? region,
    hours: hit.working_hours_type?.label ?? null,
    source: null,
    adUrl: hit.webpage_url,
    applyUrl: hit.application_details?.url ?? null,
    excerpt: excerpt(hit.description.text ?? ""),
  };
}

function fromLinks(hit: LinksHit): Job {
  const place = hit.workplace_addresses[0];
  const [origin] = hit.source_links;
  return {
    // JobAd Links and JobSearch ids come from different systems; prefix so they can never collide.
    id: `links:${hit.id}`,
    headline: hit.headline,
    employer: hit.employer.name ?? "Unknown employer",
    location: place?.municipality ?? place?.region ?? null,
    hours: null,
    source: origin.label,
    adUrl: origin.url,
    // Scraped ads have no application link of their own; applying happens on the source site.
    applyUrl: null,
    excerpt: excerpt(hit.brief ?? ""),
  };
}

// Spread the extra ads evenly instead of clumping them at the end of each page.
function interleave(main: Job[], extra: Job[]) {
  const gap = Math.max(1, Math.ceil(main.length / (extra.length + 1)));
  const queue = [...extra];
  const result = main.flatMap((job, i) => ((i + 1) % gap === 0 && queue.length ? [job, queue.shift()!] : [job]));
  return [...result, ...queue];
}

function excerpt(text: string, max = 600) {
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max)) + "…";
}

const toOptions = (list: Concept[]): Option[] =>
  list
    .map((c) => ({ id: c["taxonomy/id"], label: c["taxonomy/preferred-label"] }))
    .sort((a, b) => a.label.localeCompare(b.label, "sv"));

export async function getOccupationFields() {
  // Taxonomy lists change a few times a year.
  return toOptions(await getJson<Concept[]>(`${TAXONOMY}/main/concepts?type=occupation-field`, 86400));
}
