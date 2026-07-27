import { Settings } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button.js';
import { LanguageToggle } from './language-toggle.js';
import { ThemeToggle } from './theme-toggle.js';

export function SettingsMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('settings.button')}
        onClick={() => setIsOpen((current) => !current)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Settings aria-hidden size={18} />
      </Button>
      {isOpen ? (
        <div
          aria-label={t('settings.title')}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 grid min-w-56 gap-2 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl"
          id={menuId}
          role="menu"
        >
          <p className="px-1 text-xs font-black text-muted-foreground">
            {t('settings.title')}
          </p>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      ) : null}
    </div>
  );
}
