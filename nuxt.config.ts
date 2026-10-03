import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Private mail client — render as a SPA. No SSR means no hydration mismatches
  // (localStorage mailbox selection, locale/timezone date formatting, etc.).
  ssr: false,
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'GaupeMail',
      titleTemplate: (t?: string) => (t && t !== 'GaupeMail' ? `${t} · GaupeMail` : 'GaupeMail'),
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block',
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Allow tunnelled hosts (ngrok etc.) to reach the dev server.
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.trycloudflare.com', '.devtunnels.ms']
    }
  },
  runtimeConfig: {
    // Cloudflare Email Worker -> POST /api/incoming shared secret
    recvVerifyToken: '',
    // Cloudflare Email Sending credentials are per-domain (stored on the Domain row).
    // WebAuthn / passkeys. rpId must match the browser hostname (no port/scheme).
    webauthnRpId: 'localhost',
    webauthnRpName: 'GaupeMail',
    webauthnOrigin: 'http://localhost:3000'
  },
});
