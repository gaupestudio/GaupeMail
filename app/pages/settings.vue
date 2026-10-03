<script setup lang="ts">
interface Domain { id: number; name: string; cfAccountId: string; tokenHint: string | null; mailboxes: number }
interface UserRow { id: number; name: string; displayName: string | null; isAdmin: boolean; passkeys: number; mailboxes: number; enrolled: boolean }
interface MailboxRow { id: number; address: string; label: string | null; signatureHtml: string | null; domain: string; owner: { id: number; name: string } }

const { data: domains, refresh: rDomains } = useFetch<Domain[]>('/api/domains', { lazy: true, default: () => [] });
const { data: users, refresh: rUsers } = useFetch<UserRow[]>('/api/users', { lazy: true, default: () => [] });
const { data: boxes, refresh: rBoxes } = useFetch<MailboxRow[]>('/api/mailboxes', { query: { all: 1 }, lazy: true, default: () => [] });

const err = ref<string | null>(null);
const say = (e: any) => (err.value = e?.data?.message || e?.statusMessage || e?.message || 'failed');

// --- organization ---
const { fetchOrg } = useOrg();
const { data: settings, refresh: rSettings } = useFetch<{ orgName: string; orgFooterHtml: string | null }>(
  '/api/settings',
  { lazy: true, default: () => ({ orgName: 'GaupeMail', orgFooterHtml: null }) },
);
const orgName = ref('');
const orgFooter = ref('');
const orgSaved = ref(false);
watch(settings, (s) => {
  if (!s) return;
  orgName.value = s.orgName ?? '';
  orgFooter.value = s.orgFooterHtml ?? '';
}, { immediate: true });
async function saveOrg() {
  err.value = null;
  orgSaved.value = false;
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: { orgName: orgName.value, orgFooterHtml: orgFooter.value },
    });
    await rSettings();
    await fetchOrg();
    orgSaved.value = true;
    setTimeout(() => (orgSaved.value = false), 2000);
  } catch (e) { say(e); }
}

const nd = reactive({ name: '', cfAccountId: '', cfApiToken: '' });
async function addDomain() {
  err.value = null;
  try {
    await $fetch('/api/domains', { method: 'POST', body: { ...nd } });
    nd.name = nd.cfAccountId = nd.cfApiToken = '';
    await rDomains();
  } catch (e) { say(e); }
}
async function delDomain(d: Domain) {
  if (!confirm(`Delete ${d.name} and its ${d.mailboxes} mailbox(es)?`)) return;
  try { await $fetch(`/api/domains/${d.id}`, { method: 'DELETE' }); await rDomains(); await rBoxes(); }
  catch (e) { say(e); }
}

const nu = reactive({ name: '', displayName: '', isAdmin: false });
async function addUser() {
  err.value = null;
  try { await $fetch('/api/users', { method: 'POST', body: { ...nu } }); nu.name = nu.displayName = ''; nu.isAdmin = false; await rUsers(); }
  catch (e) { say(e); }
}
async function delUser(u: UserRow) {
  if (!confirm(`Delete user ${u.name}?`)) return;
  try { await $fetch(`/api/users/${u.id}`, { method: 'DELETE' }); await rUsers(); await rBoxes(); }
  catch (e) { say(e); }
}

const nb = reactive({ localPart: '', domainId: 0, userId: 0, label: '' });
async function addBox() {
  err.value = null;
  try {
    await $fetch('/api/mailboxes', { method: 'POST', body: { ...nb, domainId: Number(nb.domainId), userId: Number(nb.userId) } });
    nb.localPart = nb.label = ''; nb.domainId = nb.userId = 0;
    await rBoxes(); await rUsers(); await rDomains();
  } catch (e) { say(e); }
}
async function delBox(b: MailboxRow) {
  if (!confirm(`Delete ${b.address}?`)) return;
  try { await $fetch(`/api/mailboxes/${b.id}`, { method: 'DELETE' }); await rBoxes(); }
  catch (e) { say(e); }
}

const editingBox = ref<number | null>(null);
const eb = reactive({ label: '', signatureHtml: '' });
function openBox(b: MailboxRow) {
  editingBox.value = editingBox.value === b.id ? null : b.id;
  eb.label = b.label ?? '';
  eb.signatureHtml = b.signatureHtml ?? '';
}
async function saveBox(id: number) {
  err.value = null;
  try {
    await $fetch(`/api/mailboxes/${id}`, { method: 'PATCH', body: { label: eb.label, signatureHtml: eb.signatureHtml } });
    editingBox.value = null;
    await rBoxes();
  } catch (e) { say(e); }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-8 sm:px-8">
    <h1 class="mb-1 text-2xl font-bold tracking-tight">Settings</h1>
    <p class="mb-8 text-sm text-neutral-400">{{ settings?.orgName || 'GaupeMail' }} · domains, users &amp; mailboxes</p>

    <Transition name="fade">
      <p v-if="err" class="mb-6 bg-brand-50 px-3 py-2 text-sm text-brand-700">{{ err }}</p>
    </Transition>

    <div class="space-y-10">
      <!-- Organization -->
      <section>
        <h2 class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Organization</h2>
        <p class="mb-3 text-xs text-neutral-500">
          The <span class="font-medium">name</span> shows throughout the app. The
          <span class="font-medium">email footer</span> is HTML appended to the bottom of every message sent
          from any mailbox (after the per-mailbox footer, if set).
        </p>
        <div class="space-y-4 border border-neutral-200 bg-white p-4 shadow-sm">
          <div>
            <label class="block text-xs font-medium text-neutral-500">Name</label>
            <input
              v-model="orgName"
              placeholder="Gaupestudio"
              class="mt-1 w-full max-w-xs border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-500">Email footer (HTML)</label>
            <textarea
              v-model="orgFooter"
              rows="5"
              placeholder="&lt;p style=&quot;color:#888;font-size:12px&quot;&gt;Gaupestudio · Copenhagen&lt;/p&gt;"
              class="mt-1 w-full border border-neutral-300 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div class="flex items-center gap-3">
            <button
              class="bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-95"
              @click="saveOrg"
            >
              Save
            </button>
            <Transition name="fade">
              <span v-if="orgSaved" class="text-sm text-green-600">Saved ✓</span>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Domains -->
      <section>
        <h2 class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Sending domains</h2>
        <p class="mb-3 text-xs text-neutral-500">
          Each domain uses its own Cloudflare account. Paste the account id and an API token with the
          <span class="font-medium">Send Email</span> permission.
        </p>
        <div class="overflow-hidden border border-neutral-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-neutral-100">
              <tr v-for="d in domains" :key="d.id" class="transition hover:bg-neutral-50">
                <td class="px-4 py-2.5 font-medium">{{ d.name }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-neutral-500">
                  {{ d.cfAccountId }}
                  <span v-if="d.tokenHint" class="ml-1 text-neutral-400">· token {{ d.tokenHint }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs text-neutral-500">{{ d.mailboxes }} mailbox(es)</td>
                <td class="px-4 py-2.5 text-right">
                  <button class="text-xs text-brand-600 transition hover:underline" @click="delDomain(d)">delete</button>
                </td>
              </tr>
              <tr v-if="!domains?.length"><td class="px-4 py-3 text-neutral-400" colspan="4">No domains.</td></tr>
            </tbody>
          </table>
          </div>
          <form class="flex flex-wrap gap-2 border-t border-neutral-100 bg-neutral-50/60 p-3" @submit.prevent="addDomain">
            <input v-model="nd.name" placeholder="example.com" class="w-44 border border-neutral-300 px-3 py-1.5 text-sm" />
            <input v-model="nd.cfAccountId" placeholder="cloudflare account id" class="w-72 border border-neutral-300 px-3 py-1.5 font-mono text-xs" />
            <input v-model="nd.cfApiToken" type="password" placeholder="API token (Send Email)" class="w-56 border border-neutral-300 px-3 py-1.5 text-sm" />
            <button class="bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-95">Add</button>
          </form>
        </div>
      </section>

      <!-- Users -->
      <section>
        <h2 class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Users</h2>
        <p class="mb-3 text-xs text-neutral-500">
          New users enroll their own passkey from the sign-in page (allowed until they have one).
        </p>
        <div class="overflow-hidden border border-neutral-200 bg-white shadow-sm">
          <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-neutral-100">
              <tr v-for="u in users" :key="u.id" class="transition hover:bg-neutral-50">
                <td class="px-4 py-2.5 font-medium">
                  {{ u.name }}
                  <span v-if="u.displayName" class="text-neutral-400">· {{ u.displayName }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs">
                  <span v-if="u.isAdmin" class="bg-brand-100 px-1.5 py-0.5 font-medium text-brand-700">admin</span>
                </td>
                <td class="px-4 py-2.5 text-xs" :class="u.enrolled ? 'text-green-600' : 'text-amber-600'">
                  {{ u.enrolled ? `${u.passkeys} passkey(s)` : 'not enrolled' }}
                </td>
                <td class="px-4 py-2.5 text-xs text-neutral-500">{{ u.mailboxes }} mailbox(es)</td>
                <td class="px-4 py-2.5 text-right">
                  <button class="text-xs text-brand-600 transition hover:underline" @click="delUser(u)">delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <form class="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/60 p-3" @submit.prevent="addUser">
            <input v-model="nu.name" placeholder="username" class="w-40 border border-neutral-300 px-3 py-1.5 text-sm" />
            <input v-model="nu.displayName" placeholder="display name" class="w-44 border border-neutral-300 px-3 py-1.5 text-sm" />
            <label class="flex items-center gap-1.5 text-sm text-neutral-600"><input v-model="nu.isAdmin" type="checkbox" class="accent-brand-600" /> admin</label>
            <button class="bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-95">Add user</button>
          </form>
        </div>
      </section>

      <!-- Mailboxes -->
      <section>
        <h2 class="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Mailboxes</h2>
        <p class="mb-3 text-xs text-neutral-500">
          The <span class="font-medium">sender name</span> shows as the display name on outgoing mail. Each
          mailbox can also carry an HTML <span class="font-medium">footer</span> appended to every message it sends.
        </p>
        <div class="overflow-hidden border border-neutral-200 bg-white shadow-sm">
          <ul class="divide-y divide-neutral-100">
            <li v-for="b in boxes" :key="b.id">
              <div class="flex items-center gap-3 px-4 py-2.5 transition hover:bg-neutral-50">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium">
                    <span v-if="b.label" class="text-neutral-900">{{ b.label }}</span>
                    <span class="text-neutral-500">{{ b.label ? ` · ${b.address}` : b.address }}</span>
                  </div>
                  <div class="text-xs text-neutral-400">
                    owner: {{ b.owner.name }}<span v-if="b.signatureHtml"> · has footer</span>
                  </div>
                </div>
                <button class="px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100" @click="openBox(b)">
                  {{ editingBox === b.id ? 'close' : 'edit' }}
                </button>
                <button class="text-xs text-brand-600 transition hover:underline" @click="delBox(b)">delete</button>
              </div>
              <Transition name="reveal">
                <div v-if="editingBox === b.id" class="space-y-2 border-t border-neutral-100 bg-neutral-50/60 px-4 py-3">
                  <label class="block text-xs font-medium text-neutral-500">Sender name
                    <input v-model="eb.label" placeholder="e.g. Johan · Gaupestudio"
                      class="mt-1 w-full border border-neutral-300 px-3 py-1.5 text-sm" />
                  </label>
                  <label class="block text-xs font-medium text-neutral-500">Footer HTML (appended to every send)
                    <textarea v-model="eb.signatureHtml" rows="4" placeholder="&lt;p&gt;— Johan&lt;br&gt;Gaupestudio&lt;/p&gt;"
                      class="mt-1 w-full border border-neutral-300 px-3 py-1.5 font-mono text-xs" />
                  </label>
                  <button class="bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-95" @click="saveBox(b.id)">Save</button>
                </div>
              </Transition>
            </li>
            <li v-if="!boxes?.length" class="px-4 py-3 text-sm text-neutral-400">No mailboxes.</li>
          </ul>
          <form class="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/60 p-3" @submit.prevent="addBox">
            <input v-model="nb.localPart" placeholder="hello" class="w-28 border border-neutral-300 px-3 py-1.5 text-sm" />
            <span class="text-sm text-neutral-400">@</span>
            <select v-model="nb.domainId" class="border border-neutral-300 px-2 py-1.5 text-sm">
              <option :value="0" disabled>domain</option>
              <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <select v-model="nb.userId" class="border border-neutral-300 px-2 py-1.5 text-sm">
              <option :value="0" disabled>owner</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
            <input v-model="nb.label" placeholder="sender name (optional)" class="w-44 border border-neutral-300 px-3 py-1.5 text-sm" />
            <button class="bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-95">Add mailbox</button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
