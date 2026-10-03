import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Logged-in mail client — render as a SPA. No SSR means no hydration mismatches
  // (localStorage mailbox selection, locale/timezone date formatting, etc.).
  ssr: false,
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/i18n'],
  i18n: {
    // No locale in the URL. First visit picks from the browser,
    // after that the choice in the account menu is kept in a cookie.
    strategy: 'no_prefix',
    defaultLocale: 'en-US',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'gm_locale', fallbackLocale: 'en-US' },
    locales: [
      { code: 'en-US', language: 'en-US', name: 'English (US)', file: 'en-US.json' },
      { code: 'en-GB', language: 'en-GB', name: 'English (UK)', file: 'en-GB.json' },
      { code: 'da', language: 'da-DK', name: 'Dansk', file: 'da.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'nb', language: 'nb-NO', name: 'Norsk (bokmål)', file: 'nb.json' },
      { code: 'nn', language: 'nn-NO', name: 'Norsk (nynorsk)', file: 'nn.json' },
      { code: 'sv', language: 'sv-SE', name: 'Svenska', file: 'sv.json' },
    ],
  },
  app: {
    head: {
      title: 'GaupeMail',
      titleTemplate: (t?: string) => (t && t !== 'GaupeMail' ? `${t} · GaupeMail` : 'GaupeMail'),
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
    webauthnOrigin: 'http://localhost:3000',
    // Command that reads a raw message on stdin and prints `score/threshold`
    // (e.g. `spamc -c`). Empty disables spam filtering.
    spamAssassinFile: '',
    public: {
      appVersion: pkg.version,
      // GitHub repo checked for new releases (Settings → Version & updates).
      githubRepo: 'gaupestudio/GaupeMail',
    },
  },
});
