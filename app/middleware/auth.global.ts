export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAuth();
  const { org, fetchOrg } = useOrg();

  // Is the organization set up yet? (only re-check until it is)
  if (!org.value.configured) {
    try {
      await fetchOrg();
    } catch {
      // treat as not configured
    }
  }

  if (!org.value.configured) {
    return to.path === '/setup' ? undefined : navigateTo('/setup');
  }

  // Resolve session once (then cached in state).
  if (user.value === null) {
    try {
      await fetchMe();
    } catch {
      // ignore — treated as signed out
    }
  }

  if (to.path === '/setup') {
    // configured already — only admins may revisit
    if (user.value?.isAdmin) return;
    return navigateTo(user.value ? '/' : '/login');
  }

  if (to.path === '/login') {
    return user.value ? navigateTo('/') : undefined;
  }

  if (!user.value) return navigateTo('/login');

  if (to.path.startsWith('/settings') && !user.value.isAdmin) {
    return navigateTo('/');
  }
});
