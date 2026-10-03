<script setup lang="ts">
const route = useRoute();
const { activeMailbox, mailboxes, composeOpen, bumpRefresh, loadMailboxes } = useMail();

// not awaited — the sidebar fills in when it resolves (no Suspense on the layout)
loadMailboxes().catch(() => {});

const sidebarOpen = ref(false);
watch(() => route.path, () => (sidebarOpen.value = false));
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
    <Sidebar v-model:open="sidebarOpen" />

    <!-- Main -->
    <div class="relative flex min-w-0 flex-1 flex-col">
      <MobileTopBar @menu="sidebarOpen = true" />

      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <main class="min-w-0 flex-1 overflow-y-auto">
          <slot />
        </main>

        <Transition name="fade">
          <div
            v-if="composeOpen"
            class="absolute inset-0 z-20 bg-neutral-900/20 sm:hidden"
            @click="composeOpen = false"
          />
        </Transition>
        <Transition name="drawer">
          <div
            v-if="composeOpen"
            class="absolute inset-y-0 right-0 z-30 w-full border-l border-neutral-200 bg-white shadow-2xl sm:w-[28rem]"
          >
            <ComposeDrawer
              :mailboxes="mailboxes"
              :from-id="activeMailbox?.id ?? null"
              @close="composeOpen = false"
              @sent="loadMailboxes(true); bumpRefresh()"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
