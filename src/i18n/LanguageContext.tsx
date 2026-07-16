import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

interface LanguageContextValue {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      toggleLang: () => setLang((l) => (l === 'fr' ? 'en' : 'fr')),
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
