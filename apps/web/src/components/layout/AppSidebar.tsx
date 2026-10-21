import { 
  Shield, 
  Lock, 
  Server, 
  Mountain, 
  Activity, 
  ClipboardCheck,
  LayoutDashboard,
  Building2,
  Plus,
  ChevronDown,
  BookOpen,
  Search,
  Zap,
  Bot,
  TrendingUp,
  Sparkles,
  Archive,
  FileText,
  Users,
  LogOut,
  TestTube2,
  Briefcase,
  Layers
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import trafikverketLogo from '@/assets/trafikverket-logo.png';
import trafikverketSymbol from '@/assets/trafikverket-symbol.png';
import { useDomains } from '@/hooks/useDomains';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { domainIcon } from '@/lib/domainIcons';


export function AppSidebar() {
  const { data: domains = [] } = useDomains();
  const { user, isAdmin, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                Compliance Manager
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Informations- och cybersäkerhet
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/" 
                    end 
                    className="flex items-center gap-3"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Krav & tester — huvudflödena lyfta ur Verktyg */}
        <SidebarGroup>
          <SidebarGroupLabel>Krav &amp; tester</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/requirements"
                    className="flex items-center gap-3"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <FileText className="h-4 w-4" />
                    {!collapsed && <span className="font-medium">Kravdatabas</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/test-model"
                    className="flex items-center gap-3"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <TestTube2 className="h-4 w-4" />
                    {!collapsed && <span className="font-medium">Testmodell</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/profiles"
                    className="flex items-center gap-3"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <Layers className="h-4 w-4" />
                    {!collapsed && <span className="font-medium">Kravprofiler</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Översikt */}
        <SidebarGroup>
          <SidebarGroupLabel>Översikt</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/executive" 
                    className="flex items-center gap-3"
                    activeClassName="bg-accent text-accent-foreground"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    {!collapsed && <span>Executive Summary</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Domäner */}
        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md flex items-center justify-between w-full pr-2">
                Domäner
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {domains.map((domain) => {
                    const IconComponent = domainIcon(domain.icon);
                    return (
                      <SidebarMenuItem key={domain.id}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={`/domain/${domain.slug}`}
                            className="flex items-center gap-3"
                            activeClassName="bg-accent text-accent-foreground"
                          >
                            <IconComponent 
                              className="h-4 w-4" 
                            />
                            {!collapsed && (
                              <span className="truncate">{domain.name}</span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Anläggningar (Level 1 - Fysiska) */}
        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md flex items-center justify-between w-full pr-2">
                Anläggningar
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/facilities"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Building2 className="h-4 w-4" />
                        {!collapsed && <span>Alla anläggningar</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/create"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        {!collapsed && <span>Ny anläggning</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Informationssystem (Level 2 - IT) */}
        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md flex items-center justify-between w-full pr-2">
                Informationssystem
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/systems"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Server className="h-4 w-4" />
                        {!collapsed && <span>Alla system</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/systems/new"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        {!collapsed && <span>Nytt system</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
        {/* Projekt (upphandling och leverans) */}
        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md flex items-center justify-between w-full pr-2">
                Projekt
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/projects"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Briefcase className="h-4 w-4" />
                        {!collapsed && <span>Alla projekt</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/projects/new"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        {!collapsed && <span>Nytt projekt</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Verktyg */}
        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md flex items-center justify-between w-full pr-2">
                Verktyg
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/analytics-assistant"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Sparkles className="h-4 w-4" />
                        {!collapsed && <span>AI Analysassistent</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/search"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Search className="h-4 w-4" />
                        {!collapsed && <span>Avancerad sökning</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/impact-analysis"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Zap className="h-4 w-4" />
                        {!collapsed && <span>Impact Analysis</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to="/ai-assistant"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Bot className="h-4 w-4" />
                        {!collapsed && <span>AI-Assistent</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/manual"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <BookOpen className="h-4 w-4" />
                        {!collapsed && <span>Manual</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/export"
                        className="flex items-center gap-3"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <Archive className="h-4 w-4" />
                        {!collapsed && <span>Export</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>Användarhantering</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/activity"
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>Aktivitet</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-4 py-2.5 space-y-1.5">
        {!collapsed && (
          <img
            src={trafikverketLogo}
            alt="Trafikverket"
            className="h-auto w-24 shrink-0 object-contain opacity-70 invert dark:invert-0"
          />
        )}
        {collapsed && (
          <img
            src={trafikverketSymbol}
            alt="Trafikverket"
            className="mx-auto h-4 w-4 shrink-0 object-contain opacity-70 invert dark:invert-0"
          />
        )}
        {!collapsed && user && (
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] text-muted-foreground max-w-[170px]">
              {user.email}
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={signOut} title="Logga ut">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {collapsed && user && (
          <Button variant="ghost" size="icon" className="h-6 w-6 mx-auto shrink-0" onClick={signOut} title="Logga ut">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
