import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="rounded-full text-gray-400 hover:text-white hover:bg-gray-800 gap-2 px-3">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#12121a] border-gray-800 text-white">
                <DropdownMenuItem onClick={() => changeLanguage('en')} className="focus:bg-gray-800 focus:text-white cursor-pointer hover:bg-gray-800">
                    🇺🇸 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('pl')} className="focus:bg-gray-800 focus:text-white cursor-pointer hover:bg-gray-800">
                    🇵🇱 Polski
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
