export interface Me {
  id: number;
  name: string;
  displayName: string | null;
  isAdmin: boolean;
}

export function useAuth() {
  const user = useState<Me | null>('auth:user', () => null);
  const firstRun = useState<boolean>('auth:firstRun', () => false);

  async function fetchMe() {
    // useRequestFetch forwards cookies during SSR; on the client it is just $fetch.
    const data = await useRequestFetch()('/api/auth/me');
    user.value = data.user;
    firstRun.value = data.firstRun;
    return data;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    await navigateTo('/login');
  }

  return { user, firstRun, fetchMe, logout };
}
