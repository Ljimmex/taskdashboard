import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const FlagIcon = ({ code }: { code: string }) => (
    <img
        src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
        className="w-5 h-3.5 object-cover rounded-sm border border-black/10"
        alt={code}
    />
);

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] gap-2 px-3 transition-colors">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">
                        {i18n.language === 'pl' ? <FlagIcon code="pl" /> : <FlagIcon code="us" />}
                    </span>
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--app-bg-card)] border-[var(--app-border)] text-[var(--app-text-primary)] min-w-[120px]">
                <DropdownMenuItem
                    onClick={() => changeLanguage('en')}
                    className="focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] cursor-pointer hover:bg-[var(--app-bg-elevated)] transition-colors py-2.5"
                >
                    <span className="mr-2"><FlagIcon code="us" /></span> English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => changeLanguage('pl')}
                    className="focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] cursor-pointer hover:bg-[var(--app-bg-elevated)] transition-colors py-2.5"
                >
                    <span className="mr-2"><FlagIcon code="pl" /></span> Polski
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
