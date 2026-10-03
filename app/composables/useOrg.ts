export interface OrgStatus {
  configured: boolean;
  orgName: string | null;
  firstRun: boolean;
}

export function useOrg() {
  const org = useState<OrgStatus>('org', () => ({ configured: false, orgName: null, firstRun: true }));

  async function fetchOrg() {
    org.value = await $fetch('/api/setup');
    return org.value;
  }

  const orgName = computed(() => org.value.orgName || 'GaupeMail');

  return { org, orgName, fetchOrg };
}
