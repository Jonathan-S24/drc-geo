import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

interface LanguageContextValue {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const LANG_KEY = 'drcgeo-lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  // FR is the default; the user's explicit choice persists across visits.
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fr',
  )

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      toggleLang: () =>
        setLang((l) => {
          const next = l === 'fr' ? 'en' : 'fr'
          localStorage.setItem(LANG_KEY, next)
          return next
        }),
      t: (key) => translations[lang][key],
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
