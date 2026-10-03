<script setup lang="ts">
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

definePageMeta({ layout: false });

const { firstRun, fetchMe } = useAuth();
const { orgName } = useOrg();
const busy = ref(false);
const error = ref<string | null>(null);
const mode = ref<'signin' | 'enroll'>('signin');

const regName = ref('');
const regDisplay = ref('');

const msg = (e: any) =>
  e?.data?.message || e?.data?.statusMessage || e?.statusMessage || e?.message || 'Something went wrong';

async function signIn() {
  busy.value = true;
  error.value = null;
  try {
    const options = await $fetch('/api/auth/login/options', { method: 'POST' });
    const response = await startAuthentication({ optionsJSON: options as any });
    await $fetch('/api/auth/login/verify', { method: 'POST', body: { response } });
    await fetchMe();
    await navigateTo('/');
  } catch (e) {
    error.value = msg(e);
  } finally {
    busy.value = false;
  }
}

async function enroll() {
  busy.value = true;
  error.value = null;
  try {
    const name = firstRun.value ? regName.value.trim() || 'admin' : regName.value.trim();
    const options = await $fetch('/api/auth/register/options', { method: 'POST', body: { name } });
    const response = await startRegistration({ optionsJSON: options as any });
    await $fetch('/api/auth/register/verify', {
      method: 'POST',
      body: { response, displayName: regDisplay.value.trim() || undefined },
    });
    await fetchMe();
    await navigateTo('/');
  } catch (e) {
    error.value = msg(e);
  } finally {
    busy.value = false;
  }
}

onMounted(fetchMe);
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center bg-brand-600 text-lg font-black text-white">G</span>
        <div>
          <div class="text-xl font-bold tracking-tight">GaupeMail</div>
          <div class="text-xs text-neutral-400">{{ orgName }}</div>
        </div>
      </div>

      <Transition name="fade" mode="out-in">
        <p v-if="error" key="err" class="mb-4 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {{ error }}
        </p>
      </Transition>

      <!-- First run -->
      <div v-if="firstRun" class="space-y-3 border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-sm font-semibold">Create the admin account</h2>
        <p class="text-xs text-neutral-400">This is the first account, so it becomes the {{ orgName }} admin.</p>
        <input v-model="regName" placeholder="Username"
          class="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        <input v-model="regDisplay" placeholder="Display name (optional)"
          class="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        <button :disabled="busy" @click="enroll"
          class="w-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
          {{ busy ? 'Waiting for passkey…' : 'Create passkey' }}
        </button>
      </div>

      <!-- Sign in / enroll -->
      <div v-else class="border border-neutral-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex gap-1 bg-neutral-100 p-1 text-sm">
          <button class="flex-1 py-1.5 transition" :class="mode === 'signin' ? 'bg-white font-medium shadow-sm' : 'text-neutral-500'" @click="mode = 'signin'">Sign in</button>
          <button class="flex-1 py-1.5 transition" :class="mode === 'enroll' ? 'bg-white font-medium shadow-sm' : 'text-neutral-500'" @click="mode = 'enroll'">Enroll passkey</button>
        </div>

        <Transition name="reveal" mode="out-in">
          <div v-if="mode === 'signin'" key="signin">
            <button :disabled="busy" @click="signIn"
              class="w-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
              {{ busy ? 'Waiting for passkey…' : 'Sign in with passkey' }}
            </button>
          </div>
          <div v-else key="enroll" class="space-y-3">
            <p class="text-xs text-neutral-400">Works for an account an admin created that has no passkey yet.</p>
            <input v-model="regName" placeholder="Username"
              class="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            <button :disabled="busy || !regName.trim()" @click="enroll"
              class="w-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50">
              {{ busy ? 'Waiting for passkey…' : 'Enroll passkey' }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
