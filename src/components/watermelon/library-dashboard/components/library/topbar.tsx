'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X, ChevronRight } from 'lucide-react';

import {
  BellIcon,
} from './icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { topNavNotifications } from '../../data';
import { cn } from '@/lib/utils';

const searchPlaceholder = 'Search patients, appointments, phone...';

export function DashboardTopbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  // Determine page title based on path
  const getPageTitle = () => {
    if (pathname.includes('/patients')) return 'Patients Directory';
    if (pathname.includes('/patient-form')) return 'Patient Registration';
    if (pathname.includes('/schedule')) return 'Appointment Schedule';
    if (pathname.includes('/store')) return 'Clinic Store';
    if (pathname.includes('/reports')) return 'Reports & Analytics';
    return 'Overview';
  };

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 md:h-21 md:pl-6 md:pr-8">
      {/* Breadcrumb & Section Name */}
      <div
        className={cn(
          'mr-auto flex items-center gap-2 md:gap-3 text-sm md:text-base font-medium',
          mobileSearchOpen && 'hidden md:flex',
        )}
      >
        <SidebarTrigger size="icon-lg" className="size-11 md:hidden" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">Neom Clinic</span>
          <ChevronRight className="size-4 text-muted-foreground/60" />
          <span className="text-primary font-medium">{getPageTitle()}</span>
        </div>
      </div>

      {/* Search Input */}
      <InputGroup
        className={cn(
          'bg-input h-11 gap-1.75 border-none pl-3 md:flex md:w-78 md:flex-none',
          mobileSearchOpen ? 'flex-1' : 'hidden',
        )}
      >
        <InputGroupAddon className="pl-0">
          <Search className="size-5 text-secondary-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search patients"
          className="h-full p-0 pl-0!"
          placeholder={searchPlaceholder}
        />
      </InputGroup>

      {/* Mobile search toggle */}
      <Button
        aria-label={mobileSearchOpen ? 'Close search' : 'Search patients'}
        aria-pressed={mobileSearchOpen}
        variant="secondary"
        size="icon-lg"
        className="size-11 md:hidden"
        onClick={() => setMobileSearchOpen((open) => !open)}
      >
        {mobileSearchOpen ? (
          <X className="size-5" />
        ) : (
          <Search className="size-5" />
        )}
      </Button>

      {/* Notifications */}
      <div className={cn(mobileSearchOpen && 'hidden md:block')}>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Notifications"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'icon-lg' }),
              'relative size-11',
            )}
          >
            <BellIcon className="size-5" />
            <span className="absolute top-3.25 left-6 size-1.5 rounded-full bg-[#008294]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[calc(100vw-2rem)] max-w-80"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 font-semibold tracking-wider uppercase text-xs">
                <span>Notifications</span>
                <span className="font-normal normal-case text-muted-foreground">Clinic Active</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-2 px-3 text-xs text-muted-foreground">
                All patient scheduling and clinic alerts are up to date.
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
