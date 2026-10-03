export interface VersionInfo {
  current: string;
  latest: string | null;
  prerelease: boolean;
  updateAvailable: boolean;
  releaseUrl: string | null;
  releasesUrl: string;
  notes: string | null;
  publishedAt: string | null;
  checkFailed: boolean;
}

// Admin-only GitHub release check, shared by the sidebar badge and Settings.
// Fetched once per session; the server caches GitHub's answer for 6 hours.
export function useUpdateCheck() {
  const info = useState<VersionInfo | null>('update-check', () => null);
  const { user } = useAuth();

  async function load() {
    if (info.value || !user.value?.isAdmin) return;
    try {
      info.value = await $fetch<VersionInfo>('/api/version');
    } catch {
      // not critical — the UI just shows no update notice
    }
  }

  return { info, load };
}
