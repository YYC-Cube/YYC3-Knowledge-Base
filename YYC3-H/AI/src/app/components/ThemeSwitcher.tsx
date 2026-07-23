/**
 * YYC3 Theme Switcher — Toggle between Cyberpunk and Clean Modern themes
 * @version 4.8.0
 */
import { Sun, Moon } from 'lucide-react'
import { useThemeStore, THEMES, type ThemeId } from '../store/theme-store'
import { useI18n } from '../i18n/context'
import { CyberTooltip } from './CyberTooltip'

export function ThemeSwitcher() {
  const { themeId, setTheme, tokens } = useThemeStore()
  const { locale } = useI18n()

  const nextTheme: ThemeId = themeId === 'cyberpunk' ? 'clean' : 'cyberpunk'
  const nextName = THEMES[nextTheme].name[locale]
  const label = locale === 'zh' ? `切换至 ${nextName}` : `Switch to ${nextName}`

  return (
    <CyberTooltip label={label}>
      <button
        onClick={() => setTheme(nextTheme)}
        className="p-1.5 rounded transition-all hover:opacity-80"
        style={{
          color: tokens.primary,
          border: `1px solid ${tokens.border}`,
          background: themeId === 'clean' ? tokens.primaryGlow : 'transparent',
        }}
      >
        {themeId === 'cyberpunk' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </CyberTooltip>
  )
}
