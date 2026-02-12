"use client";

import React from "react";
import { useState, useMemo } from "react";
import {
  Building2,
  ShieldCheck,
  ClipboardList,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  Tag,
  Users,
  Truck,
  DollarSign,
  Settings,
  ChevronDown,
  Store,
  Search,
  Bell,
  ChevronRight,
  LayoutDashboard,
  Boxes,
  Receipt,
  PiggyBank,
  LogOut,
  Lock,
  UserCog,
  Monitor,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/hooks/use-store";
import {
  logout,
  getModulosLicenciados,
  podeAcessarModulo,
  addAuditLog,
  getBrandingEfetivo,
  podeModoFullscreenPDV,
  type ModuloId,
  type SessaoUsuario,
} from "@/lib/store";

import { LoginScreen } from "@/components/login-screen";
import { ClientOnly } from "@/components/client-only";
import { BrandingStyles } from "@/components/branding-styles";

// Module pages
import { AdminEmpresas } from "@/components/modules/admin-empresas";
import { AdminLicencas } from "@/components/modules/admin-licencas";
import { AdminAuditoria } from "@/components/modules/admin-auditoria";
import { CadastrosProdutos } from "@/components/modules/cadastros-produtos";
import { CadastrosSKUs } from "@/components/modules/cadastros-skus";
import { CadastrosClientes } from "@/components/modules/cadastros-clientes";
import { CadastrosFornecedores } from "@/components/modules/cadastros-fornecedores";
import { CadastrosLojas } from "@/components/modules/cadastros-lojas";
import { EstoqueConsulta } from "@/components/modules/estoque-consulta";
import { CustosTela } from "@/components/modules/custos-tela";
import { PrecificacaoTela } from "@/components/modules/precificacao-tela";
import { PDVTela } from "@/components/modules/pdv-tela";
import { CaixaTela } from "@/components/modules/caixa-tela";
import { FinanceiroTela } from "@/components/modules/financeiro-tela";
import { RelatoriosTela } from "@/components/modules/relatorios-tela";
import { DashboardHome } from "@/components/modules/dashboard-home";
import { UsuariosAcessos } from "@/components/modules/usuarios-acessos";
import { IdentidadeVisual } from "@/components/modules/identidade-visual";
import { PDVFullscreen } from "@/components/modules/pdv-fullscreen";

type Page =
  | "dashboard"
  | "admin-empresas"
  | "admin-licencas"
  | "admin-auditoria"
  | "cad-produtos"
  | "cad-skus"
  | "cad-clientes"
  | "cad-fornecedores"
  | "cad-lojas"
  | "estoque"
  | "custos"
  | "precificacao"
  | "pdv"
  | "caixa"
  | "financeiro"
  | "relatorios"
  | "usuarios-acessos"
  | "identidade-visual";

interface MenuItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduloId?: ModuloId;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visivel: "admin_global" | "empresa" | "todos";
  items: MenuItem[];
}

const allMenuGroups: MenuGroup[] = [
  {
    label: "Admin Global",
    icon: ShieldCheck,
    visivel: "admin_global",
    items: [
      { id: "admin-empresas", label: "Empresas", icon: Building2 },
      { id: "admin-licencas", label: "Licencas / Planos", icon: ClipboardList },
      { id: "admin-auditoria", label: "Auditoria Global", icon: Settings },
    ],
  },
  {
    label: "Configuracoes",
    icon: Settings,
    visivel: "empresa",
    items: [
      {
        id: "usuarios-acessos",
        label: "Usuarios e Acessos",
        icon: UserCog,
        moduloId: "configuracoes",
      },
      {
        id: "identidade-visual",
        label: "Identidade Visual",
        icon: Store,
        moduloId: "configuracoes",
      },
    ],
  },
  {
    label: "Cadastros",
    icon: Boxes,
    visivel: "empresa",
    items: [
      { id: "cad-produtos", label: "Produtos", icon: Tag },
      { id: "cad-skus", label: "SKUs / Grade", icon: Package },
      { id: "cad-clientes", label: "Clientes", icon: Users },
      { id: "cad-fornecedores", label: "Fornecedores", icon: Truck },
      { id: "cad-lojas", label: "Lojas", icon: Store },
    ],
  },
  {
    label: "Estoque",
    icon: Package,
    visivel: "empresa",
    items: [
      {
        id: "estoque",
        label: "Consulta / Movimentacoes",
        icon: Package,
        moduloId: "estoque",
      },
    ],
  },
  {
    label: "Custos e Precos",
    icon: PiggyBank,
    visivel: "empresa",
    items: [
      { id: "custos", label: "Custos", icon: DollarSign, moduloId: "basice" },
      {
        id: "precificacao",
        label: "Precificacao",
        icon: Tag,
        moduloId: "basice",
      },
    ],
  },
  {
    label: "Vendas",
    icon: Receipt,
    visivel: "empresa",
    items: [
      { id: "pdv", label: "PDV", icon: ShoppingCart, moduloId: "pdv" },
      { id: "caixa", label: "Caixa", icon: Wallet, moduloId: "pdv" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    visivel: "empresa",
    items: [
      {
        id: "financeiro",
        label: "Contas a Receber",
        icon: Wallet,
        moduloId: "financeiro",
      },
      {
        id: "relatorios",
        label: "Relatorios",
        icon: BarChart3,
        moduloId: "relatorios",
      },
    ],
  },
];

const pageComponents: Record<Page, React.ComponentType> = {
  dashboard: DashboardHome,
  "admin-empresas": AdminEmpresas,
  "admin-licencas": AdminLicencas,
  "admin-auditoria": AdminAuditoria,
  "cad-produtos": CadastrosProdutos,
  "cad-skus": CadastrosSKUs,
  "cad-clientes": CadastrosClientes,
  "cad-fornecedores": CadastrosFornecedores,
  "cad-lojas": CadastrosLojas,
  estoque: EstoqueConsulta,
  custos: CustosTela,
  precificacao: PrecificacaoTela,
  pdv: PDVTela,
  caixa: CaixaTela,
  financeiro: FinanceiroTela,
  relatorios: RelatoriosTela,
  "usuarios-acessos": UsuariosAcessos,
  "identidade-visual": () => null, // Rendered with sessao prop below
};

function getPageLabel(page: Page): string {
  if (page === "dashboard") return "Painel Principal";
  return (
    allMenuGroups.flatMap((g) => g.items).find((i) => i.id === page)?.label ??
    ""
  );
}

function getGroupLabel(page: Page): string | null {
  if (page === "dashboard") return null;
  return (
    allMenuGroups.find((g) => g.items.some((i) => i.id === page))?.label ?? null
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPapelLabel(sessao: SessaoUsuario): string {
  if (sessao.papel === "admin_global") return "Administrador Global";
  if (sessao.papel === "admin_empresa") return "Admin da Empresa";
  return "Funcionario";
}

export function AppShell() {
  const store = useAppStore();
  const sessao = store.sessao;

  // Aplica cores e tema da identidade visual da empresa (quando logado em empresa com white label)
  if (!sessao) {
    return (
      <ClientOnly>
        <BrandingStyles />
        <LoginScreen />
      </ClientOnly>
    );
  }

  return (
    <>
      <BrandingStyles />
      <AppShellInner sessao={sessao} />
    </>
  );
}

function AppShellInner({ sessao }: { sessao: SessaoUsuario }) {
  const store = useAppStore();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // PDV Fullscreen mode
  const [pdvFullscreen, setPdvFullscreen] = useState(false);
  // Funcionário com módulo PDV pode entrar no PDV; permissão PDV_VENDER é exigida ao finalizar venda
  const canAccessPDVFullscreen = useMemo(
    () =>
      sessao.tipo === "usuario_empresa" && sessao.usuarioEmpresaId
        ? podeModoFullscreenPDV(sessao.usuarioEmpresaId)
        : false,
    [sessao.usuarioEmpresaId, sessao.tipo, store.usuariosEmpresa, store.licencas, store.planos],
  );

  // Branding efetivo
  const branding = useMemo(
    () => getBrandingEfetivo(sessao.empresaId),
    [sessao.empresaId, store.branding, store.empresas],
  );

  // Empresa e loja do funcionário (para exibição no rodapé)
  const empresaLojaFuncionario = useMemo(() => {
    if (
      sessao.tipo !== "usuario_empresa" ||
      sessao.papel !== "funcionario" ||
      !sessao.empresaId
    )
      return null;
    const empresa = store.empresas.find((e) => e.id === sessao.empresaId);
    const loja = sessao.lojaId
      ? store.lojas.find((l) => l.id === sessao.lojaId)
      : null;
    return { empresa: empresa?.nomeFantasia ?? "", loja: loja?.nome ?? "" };
  }, [sessao, store.empresas, store.lojas]);

  // Compute visible menu based on role and permissions
  const filteredGroups = useMemo(() => {
    if (sessao.tipo === "admin_global") {
      // Admin global only sees admin groups
      return allMenuGroups.filter((g) => g.visivel === "admin_global");
    }

    // For empresa users
    const usuario = store.usuariosEmpresa.find(
      (u) => u.id === sessao.usuarioEmpresaId,
    );
    if (!usuario) return [];

    const modulosLicenciados = getModulosLicenciados(usuario.empresaId);

    return allMenuGroups
      .filter((g) => g.visivel === "empresa")
      .map((group) => {
        // Regra de negocio: funcionarios nao enxergam o grupo de Cadastros
        if (group.label === "Cadastros" && usuario.papel === "funcionario") {
          return { ...group, items: [] };
        }

        const visibleItems = group.items.filter((item) => {
          // Configuracoes is only for admin_empresa
          if (item.moduloId === "configuracoes") {
            return usuario.papel === "admin_empresa";
          }
          // Items without moduloId (ex.: alguns cadastros) seguem a regra do grupo
          if (!item.moduloId) return true;
          // Check Regra de Ouro: license + user authorization
          if (!modulosLicenciados.includes(item.moduloId)) return false;
          if (usuario.papel === "admin_empresa") return true;
          return usuario.modulosLiberados.includes(item.moduloId);
        });
        return { ...group, items: visibleItems };
      })
      .filter((g) => g.items.length > 0);
  }, [sessao, store.usuariosEmpresa, store.licencas, store.planos]);

  // Access guard - if the user navigated to a page they can no longer access, redirect
  const allowedPages = useMemo(() => {
    const pages: Page[] = ["dashboard"];
    for (const g of filteredGroups) {
      for (const item of g.items) {
        pages.push(item.id);
      }
    }
    return pages;
  }, [filteredGroups]);

  const safePage = allowedPages.includes(currentPage)
    ? currentPage
    : "dashboard";
  const PageComponent = pageComponents[safePage];
  const groupLabel = getGroupLabel(safePage);
  const pageLabel = getPageLabel(safePage);

  function handleNavigate(page: Page) {
    if (!allowedPages.includes(page)) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "Pagina",
        entidadeId: page,
        antes: "",
        depois: "Acesso bloqueado",
        motivo: "Tentativa de acesso a modulo nao autorizado",
      });
      return;
    }
    setCurrentPage(page);
  }

  function enterPDVFullscreen() {
    if (!canAccessPDVFullscreen) return;
    addAuditLog({
      usuario: sessao.nome,
      acao: "entrar_pdv_fullscreen",
      entidade: "PDV",
      entidadeId: sessao.empresaId ?? "-",
      antes: "",
      depois: JSON.stringify({
        usuario: sessao.nome,
        empresa: sessao.empresaId,
      }),
      motivo: "Entrada no modo PDV fullscreen",
    });
    setPdvFullscreen(true);
  }

  function handleLogout() {
    addAuditLog({
      usuario: sessao.nome,
      acao: "logout",
      entidade: "Sessao",
      entidadeId: sessao.usuarioEmpresaId ?? "-",
      antes: "",
      depois: "Sessao encerrada",
      motivo: "Logout voluntario",
    });
    logout();
  }

  // PDV Fullscreen overlay
  if (pdvFullscreen && canAccessPDVFullscreen) {
    return (
      <PDVFullscreen sessao={sessao} onExit={() => setPdvFullscreen(false)} />
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="px-2 py-2 md:px-3 md:py-2">
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            className="flex flex-col items-center gap-2 group-data-[collapsible=icon]:justify-center"
          >
            {branding.logoIcone ? (
              <img
                src={branding.logoIcone}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-contain"
              />
            ) : branding.logoPrincipal ? (
              <img
                src={branding.logoPrincipal}
                alt=""
                className="h-10 w-auto max-w-[140px] shrink-0 object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
                <Store className="h-5 w-5 text-sidebar-primary" />
              </div>
            )}
            <div className="flex flex-col items-center group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground text-center">
                {sessao.tipo === "admin_global"
                  ? "LojistaCore"
                  : branding.nomeExibicao}
              </span>
            </div>
          </button>
        </SidebarHeader>

        <SidebarSeparator />

        <div className="px-2 py-1 md:px-2 md:py-1 group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton
              size="sm"
              isActive={safePage === "dashboard"}
              onClick={() => handleNavigate("dashboard")}
              tooltip="Painel Principal"
              className="gap-2 text-[12px]"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="font-medium">Painel Principal</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>

        <SidebarContent className="px-1">
          {filteredGroups.map((group) => (
            <Collapsible
              key={group.label}
              defaultOpen
              className="group/collapsible"
            >
              <SidebarGroup className="py-0">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            size="sm"
                            isActive={safePage === item.id}
                            onClick={() => handleNavigate(item.id)}
                            tooltip={item.label}
                            className="gap-2 text-[12px]"
                          >
                            <item.icon className="h-4 w-4 opacity-70" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-2 py-2 md:px-2 md:py-2">
          <SidebarSeparator className="mb-2" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={sessao.nome} className="gap-2 h-8">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
                    {getInitials(sessao.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
                  <span className="text-xs font-medium text-sidebar-foreground truncate">
                    {sessao.nome}
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/50">
                    {empresaLojaFuncionario &&
                    (empresaLojaFuncionario.empresa ||
                      empresaLojaFuncionario.loja)
                      ? [
                          empresaLojaFuncionario.empresa,
                          empresaLojaFuncionario.loja,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      : getPapelLabel(sessao)}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sair"
                className="gap-2 h-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden text-xs">
                  Sair
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/95 backdrop-blur-sm px-6">
          <SidebarTrigger className="-ml-1.5" />
          <Separator orientation="vertical" className="h-5" />
          <nav className="flex items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Inicio
            </button>
            {groupLabel && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-muted-foreground">{groupLabel}</span>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground">{pageLabel}</span>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {canAccessPDVFullscreen && (
              <button
                type="button"
                onClick={enterPDVFullscreen}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 transition-colors"
              >
                <Monitor className="h-3.5 w-3.5" />
                Entrar no PDV
              </button>
            )}
            <Badge variant="secondary" className="text-[11px] font-medium">
              {getPapelLabel(sessao)}
            </Badge>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-foreground/80" />
              <Input
                placeholder="Buscar..."
                className="h-8 w-56 pl-9 text-xs bg-secondary border-0 focus-visible:ring-1 text-secondary-foreground placeholder:text-secondary-foreground/70"
              />
            </div>
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <div className="rounded-3xl bg-background shadow-xl border border-border/50 overflow-hidden">
              <div className="p-6 lg:p-8">
                {safePage === "identidade-visual" ? (
                  <IdentidadeVisual sessao={sessao} />
                ) : (
                  <PageComponent />
                )}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
