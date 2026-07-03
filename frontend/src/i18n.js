import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    message: {
      hello: 'Welcome to PixelPanel',
      dashboard: 'Dashboard',
      apps: 'Applications',
      settings: 'Settings'
    }
  },
  id: {
    message: {
      hello: 'Selamat Datang di PixelPanel',
      dashboard: 'Dasbor',
      apps: 'Aplikasi',
      settings: 'Pengaturan'
    }
  }
}

export const i18n = createI18n({
  locale: 'en', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages,
})
