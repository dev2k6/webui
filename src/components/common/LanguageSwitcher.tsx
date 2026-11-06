/*
 * SPDX-FileCopyrightText: 2020 Stalwart Labs LLC <hello@stalw.art>
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-SEL
 */

import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, SUPPORTED_LANGUAGES } from '@/i18n';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'ghost' | 'outline';
}

export function LanguageSwitcher({ className, variant = 'ghost' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" className={className} aria-label={t('language.toggle', 'Language')}>
          <Languages aria-hidden="true" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={currentLang} onValueChange={changeLanguage}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
