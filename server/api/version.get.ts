// Current version + the latest GitHub release, for the update notice. Admin only.
interface LatestRelease {
  version: string;
  prerelease: boolean;
  url: string;
  notes: string | null;
  publishedAt: string | null;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}

// Highest published release, pre-releases included (GitHub's /releases/latest
// skips those). Cached for 6 hours so we stay well under GitHub's anonymous
// rate limit; network errors throw and are not cached, so the next request retries.
const fetchLatestRelease = defineCachedFunction(
  async (repo: string): Promise<LatestRelease | null> => {
    const releases = await $fetch<GithubRelease[]>(`https://api.github.com/repos/${repo}/releases`, {
      query: { per_page: 30 },
      headers: { 'User-Agent': 'GaupeMail', Accept: 'application/vnd.github+json' },
    });
    const newest = releases
      .filter((r) => !r.draft)
      .reduce<GithubRelease | null>((best, r) => (!best || compareVersions(r.tag_name, best.tag_name) > 0 ? r : best), null);
    if (!newest) return null;
    return {
      version: newest.tag_name.replace(/^v/i, ''),
      prerelease: newest.prerelease,
      url: newest.html_url,
      notes: newest.body,
      publishedAt: newest.published_at,
    };
  },
  { name: 'github-releases', maxAge: 6 * 60 * 60, getKey: (repo: string) => repo },
);

// 1 if a > b, -1 if a < b, 0 if equal. A pre-release (1.2.0-beta) sorts before its release.
function compareVersions(a: string, b: string) {
  const parse = (v: string) => {
    const [core = '', pre] = v.replace(/^v/i, '').split('-', 2);
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre: !!pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return x.pre === y.pre ? 0 : x.pre ? -1 : 1;
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { appVersion, githubRepo } = useRuntimeConfig(event).public;

  let latest: LatestRelease | null = null;
  let checkFailed = false;
  try {
    latest = await fetchLatestRelease(githubRepo);
  } catch (e) {
    console.warn('[version] GitHub release check failed:', e);
    checkFailed = true;
  }

  return {
    current: appVersion,
    latest: latest?.version ?? null,
    prerelease: latest?.prerelease ?? false,
    updateAvailable: !!latest && compareVersions(latest.version, appVersion) > 0,
    releaseUrl: latest?.url ?? null,
    releasesUrl: `https://github.com/${githubRepo}/releases`,
    notes: latest?.notes ?? null,
    publishedAt: latest?.publishedAt ?? null,
    checkFailed,
  };
});
