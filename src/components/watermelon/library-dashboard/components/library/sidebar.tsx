'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Ellipsis, X, Phone, PhoneCall, ExternalLink, LogOut } from 'lucide-react';

import { Logo } from './logo';
import { useTheme } from './theme-provider';
import { useAuth } from '@/app/context/AuthContext';

import {
  ArrowDown01Icon,
  BackwardIcon,
  BuildingIcon,
  HelpIcon,
  SettingsIcon,
  ThemeIcon,
} from './icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  type NavigationItem,
  organizations,
  primaryNavigation,
} from '../../data';

const menuButtonBaseClassName =
  'h-11 gap-3 rounded-lg border border-transparent px-3.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground data-active:border-border data-active:bg-card data-active:text-primary data-active:shadow-[1.35px_2.7px_32.45px_rgba(158,158,158,0.08)] data-active:hover:bg-card data-active:hover:text-primary data-active:active:bg-card data-active:active:text-primary [&_svg]:size-5 [&_svg]:text-foreground data-active:[&_svg]:text-primary';

const sidebarMenuButtonClassName = cn(
  menuButtonBaseClassName,
  'group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!',
);

const sidebarMenuSubButtonClassName = cn(
  menuButtonBaseClassName,
  '[&_svg]:text-foreground! data-active:[&_svg]:text-primary!',
);

const subItemsMenuContentClassName = 'z-100 w-48 p-1.5 shadow-lg';

const bottomNavItemClassName = cn(
  buttonVariants({ variant: 'ghost' }),
  'text-foreground hover:text-primary h-full flex-1 px-0 hover:bg-transparent rounded-none',
);

const moreNavItemClassName = cn(
  menuButtonBaseClassName,
  'flex items-center text-sm',
);

export function DashboardSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { toggleTheme } = useTheme();
  const { logout, isStaffAuth, isReceptionAuth, isAdminAuth } = useAuth();
  const collapsed = state === 'collapsed';
  const [helpOpen, setHelpOpen] = useState(false);

  // Filter navigation items based on user role
  const filteredNavigation = primaryNavigation.filter((item) => {
    if (isStaffAuth) {
      return item.section === 'patient-form' || item.section === 'schedule';
    }
    if (isReceptionAuth) {
      return (
        item.section === 'dashboard' ||
        item.section === 'patient-form' ||
        item.section === 'schedule'
      );
    }
    return true;
  });

  const mobilePrimaryNavigation = filteredNavigation.slice(0, 4);
  const mobileMoreNavigation = filteredNavigation.slice(4);

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader
          className={cn(
            'h-21 flex-row items-center border-b p-0 transition-[padding] duration-200 library-dashboard bg-background',
            collapsed ? 'justify-start px-5' : 'justify-between px-4.5',
          )}
        >
          {!collapsed ? (
            <>
              <Link
                aria-label="Neom Clinic dashboard"
                className="flex h-8 items-center gap-2.5"
                href="/dashboard"
              >
                <Logo className="size-8" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                    Neom
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    Dental Clinic
                  </span>
                </div>
              </Link>
              <Button
                aria-label="Collapse sidebar"
                variant="secondary"
                size="icon-lg"
                onClick={toggleSidebar}
              >
                <BackwardIcon className="size-5" />
              </Button>
            </>
          ) : (
            <div className="relative size-10">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-75 group-hover:opacity-0">
                <Logo className="size-7" />
              </div>
              <div className="pointer-events-none absolute inset-0 flex scale-75 items-center justify-center opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                <Button
                  aria-label="Expand sidebar"
                  variant="secondary"
                  size="icon-lg"
                  onClick={toggleSidebar}
                >
                  <BackwardIcon className="size-5 rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-4.5 pt-6 pb-2 library-dashboard bg-background">
          <SidebarMenu className="gap-1.5">
            {filteredNavigation.map((item) => (
              <SidebarNavigationItem
                key={item.section}
                active={isItemActive(item.href)}
                item={item}
              />
            ))}
          </SidebarMenu>
        </SidebarContent>


        <SidebarFooter className="border-t px-4.5 pt-2 pb-6 library-dashboard bg-background">
          <SidebarMenu>
            {/* Help & Support Button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Help & Support"
                className={sidebarMenuButtonClassName}
                onClick={() => setHelpOpen(true)}
              >
                <HelpIcon />
                {!collapsed && <span>Help & Support</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* User Profile & Logout */}
            <SidebarMenuItem className="flex items-center gap-1">
              <SidebarMenuButton
                tooltip="Sign Out"
                className={cn(sidebarMenuButtonClassName, !collapsed && 'flex-1 text-red-500 hover:text-red-600')}
                onClick={logout}
              >
                <LogOut className="size-5 text-red-500" />
                {!collapsed && (
                  <span className="flex items-center justify-between w-full">
                    <span>Sign Out</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {isStaffAuth ? 'Staff' : isReceptionAuth ? 'Reception' : 'Admin'}
                    </span>
                  </span>
                )}
              </SidebarMenuButton>

              {!collapsed && (
                <Button
                  aria-label="Toggle theme"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  onClick={toggleTheme}
                >
                  <ThemeIcon className="size-5" />
                </Button>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <MobileBottomNavigation
        mobilePrimaryNavigation={mobilePrimaryNavigation}
        mobileMoreNavigation={mobileMoreNavigation}
        isItemActive={isItemActive}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {/* Help & Support Dialog / Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setHelpOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-xl bg-[#008294]/10 text-[#008294] border border-[#008294]/20 flex items-center justify-center shrink-0">
                <PhoneCall className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Help & Support
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پشتگیری و یارمەتی بۆ سیستەمی کلینیکی نیۆم
                </p>
              </div>
            </div>

            {/* Prompt text requested by user */}
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                If you have any question or problem in the system, please contact us:
              </p>

              {/* Contact Card: Phone */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-[#008294] text-white flex items-center justify-center shrink-0">
                    <Phone className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block font-medium">Direct Line / WhatsApp</span>
                    <a
                      href="tel:+9647510201840"
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#008294] transition-colors truncate block"
                    >
                      +964 751 020 1840
                    </a>
                  </div>
                </div>
                <a
                  href="https://wa.me/9647510201840"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  WhatsApp
                </a>
              </div>

              {/* Developer / Studio Card: Trx Studio */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#008294]/10 via-[#008294]/5 to-transparent border border-[#008294]/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0">
                    TRX
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Developed & Supported by
                    </span>
                    <a
                      href="https://www.trxstudio.xyz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-[#008294] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Trx Studio</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
                <a
                  href="https://www.trxstudio.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#008294] hover:underline shrink-0"
                >
                  Visit Website
                </a>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                Close / داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileBottomNavigation({
  mobilePrimaryNavigation,
  mobileMoreNavigation,
  isItemActive,
  onOpenHelp,
}: {
  mobilePrimaryNavigation: NavigationItem[];
  mobileMoreNavigation: NavigationItem[];
  isItemActive: (href: string) => boolean;
  onOpenHelp: () => void;
}) {
  const { toggleTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>(organizations[0]);
  const moreActive = mobileMoreNavigation.some((item) => isItemActive(item.href));

  return (
    <div className="bg-sidebar fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t px-2 md:hidden">
      {mobilePrimaryNavigation.map((item) => {
        const active = isItemActive(item.href);
        const Icon = item.icon;

        if (item.subItems?.length) {
          return (
            <DropdownMenu key={item.section}>
              <DropdownMenuTrigger
                aria-label={item.label}
                className={cn(
                  bottomNavItemClassName,
                  active && 'text-primary font-medium',
                )}
              >
                <Icon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="center"
                sideOffset={8}
                className={subItemsMenuContentClassName}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1 font-semibold tracking-wider uppercase">
                    {item.label}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <DropdownMenuItem
                        key={subItem.href}
                        onClick={() => router.push(subItem.href)}
                        className={cn(
                          sidebarMenuSubButtonClassName,
                          'h-10 gap-2.5 px-3 flex items-center cursor-pointer',
                        )}
                      >
                        <SubIcon />
                        <span>{subItem.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link
            key={item.section}
            href={item.href}
            aria-label={item.label}
            className={cn(
              bottomNavItemClassName,
              active && 'text-primary font-medium',
            )}
          >
            <Icon className="size-5" />
          </Link>
        );
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger
          aria-label="More navigation"
          className={cn(
            bottomNavItemClassName,
            moreActive && 'text-primary font-medium',
          )}
        >
          <Ellipsis className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85dvh] gap-1.5 rounded-t-3xl px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
        >
          <div className="bg-border mx-auto h-1 w-10 rounded-full" />
          <SheetHeader className="px-0 pt-2 pb-1">
            <SheetTitle className="text-lg font-semibold">More Menu</SheetTitle>
          </SheetHeader>

          <nav aria-label="More navigation" className="flex flex-col gap-1.5">
            {mobileMoreNavigation.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.section}
                  href={item.href}
                  data-active={active || undefined}
                  onClick={() => setMoreOpen(false)}
                  className={moreNavItemClassName}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenHelp();
              }}
              className={cn(moreNavItemClassName, 'text-left')}
            >
              <HelpIcon />
              <span>Help & Support</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                logout();
              }}
              className={cn(moreNavItemClassName, 'text-red-500 text-left')}
            >
              <LogOut className="size-5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-1 mt-2">
              <Button
                aria-label="Toggle theme"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={toggleTheme}
              >
                <ThemeIcon className="size-5" />
                <span>Toggle Dark/Light Mode</span>
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SidebarNavigationItem({
  active,
  item,
}: {
  active: boolean;
  item: NavigationItem;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [open, setOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subItems = item.subItems;
  const hasSubItems = Boolean(subItems?.length);
  const showSubItems = !collapsed && (open || active) && hasSubItems;

  const DisplayedIcon = item.icon;
  const displayedLabel = item.label;

  function toggleOpen() {
    setOpen((currentOpen) => !currentOpen);
  }

  function openFlyout() {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
    }
    setFlyoutOpen(true);
  }

  function scheduleFlyoutClose() {
    flyoutCloseTimer.current = setTimeout(() => {
      setFlyoutOpen(false);
    }, 120);
  }

  return (
    <SidebarMenuItem>
      {collapsed && hasSubItems ? (
        <DropdownMenu
          modal={false}
          open={flyoutOpen}
          onOpenChange={setFlyoutOpen}
        >
          <DropdownMenuTrigger
            aria-label={displayedLabel}
            data-active={active || undefined}
            onPointerEnter={openFlyout}
            onPointerLeave={scheduleFlyoutClose}
            className={cn(sidebarMenuButtonClassName, 'flex w-full items-center')}
          >
            <DisplayedIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={8}
            onPointerEnter={openFlyout}
            onPointerLeave={scheduleFlyoutClose}
            className={subItemsMenuContentClassName}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1 font-semibold tracking-wider uppercase">
                {item.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {item.subItems?.map((subItem) => {
                const SubIcon = subItem.icon;
                return (
                  <DropdownMenuItem
                    key={subItem.href}
                    onClick={() => router.push(subItem.href)}
                    className={cn(
                      sidebarMenuSubButtonClassName,
                      'h-10 gap-2.5 px-3 flex items-center cursor-pointer',
                      pathname === subItem.href && 'text-primary font-semibold',
                    )}
                  >
                    <SubIcon />
                    <span>{subItem.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : hasSubItems ? (
        <div>
          <SidebarMenuButton
            isActive={active}
            onClick={toggleOpen}
            className={sidebarMenuButtonClassName}
          >
            <DisplayedIcon />
            {!collapsed && (
              <>
                <Link href={item.href} className="flex-1 text-left">
                  {displayedLabel}
                </Link>
                <ArrowDown01Icon
                  className={cn(
                    'pointer-events-none ml-auto size-4.5 transition-transform',
                    (open || active) && 'rotate-180',
                  )}
                />
              </>
            )}
          </SidebarMenuButton>

          {showSubItems && (
            <SidebarMenuSub>
              {subItems?.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = pathname === subItem.href;
                return (
                  <SidebarMenuSubItem key={subItem.href}>
                    <SidebarMenuSubButton
                      isActive={isSubActive}
                      className={sidebarMenuSubButtonClassName}
                      render={<Link href={subItem.href} />}
                    >
                      <SubIcon />
                      <span>{subItem.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          )}
        </div>
      ) : (
        <SidebarMenuButton
          isActive={active}
          tooltip={displayedLabel}
          className={sidebarMenuButtonClassName}
          render={<Link href={item.href} />}
        >
          <DisplayedIcon />
          {!collapsed && <span>{displayedLabel}</span>}
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}
