import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const FlagIcon = ({ code }: { code: string }) => (
  <img
    src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
    className="h-3.5 w-5 rounded-sm border border-black/10 object-cover"
    alt={code}
  />
)

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="default"
          className="gap-2 rounded-full px-3 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <span className="text-sm font-medium">
            {i18n.language === 'pl' ? <FlagIcon code="pl" /> : <FlagIcon code="us" />}
          </span>
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[120px] border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-primary)]"
      >
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className="cursor-pointer py-2.5 transition-colors hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
        >
          <span className="mr-2">
            <FlagIcon code="us" />
          </span>{' '}
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('pl')}
          className="cursor-pointer py-2.5 transition-colors hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
        >
          <span className="mr-2">
            <FlagIcon code="pl" />
          </span>{' '}
          Polski
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
