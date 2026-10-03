<script setup lang="ts">
definePageMeta({ layout: false });

const { org, fetchOrg } = useOrg();
const { user } = useAuth();

const name = ref(org.value.orgName ?? '');
const busy = ref(false);
const error = ref<string | null>(null);

async function save() {
  const clean = name.value.trim();
  if (clean.length < 2) return (error.value = 'Enter an organization name');
  busy.value = true;
  error.value = null;
  try {
    await $fetch('/api/setup', { method: 'POST', body: { orgName: clean } });
    await fetchOrg();
    // First install → go create the admin; otherwise back to the app.
    await navigateTo(org.value.firstRun && !user.value ? '/login' : '/');
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || e?.message || 'Could not save';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">G</span>
        <div>
          <div class="text-xl font-bold tracking-tight">GaupeMail</div>
          <div class="text-xs text-neutral-400">Set up your organization</div>
        </div>
      </div>

      <Transition name="fade">
        <p v-if="error" class="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{{ error }}</p>
      </Transition>

      <div class="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <label class="block text-sm font-medium text-neutral-700">Organization name</label>
        <p class="text-xs text-neutral-400">Shown throughout the app and used as your workspace identity.</p>
        <input
          v-model="name"
          placeholder="e.g. Gaupestudio"
          autofocus
          class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          @keydown.enter="save"
        />
        <button
          :disabled="busy"
          class="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
          @click="save"
        >
          {{ busy ? 'Saving…' : 'Continue' }}
        </button>
      </div>
    </div>
  </div>
</template>
