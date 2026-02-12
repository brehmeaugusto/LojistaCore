"use client";

import { useState, useEffect } from "react";
import { getBrandingEfetivo } from "@/lib/store";
import {
  loginUnificado,
  carregarUsuariosEmpresaFromSupabase,
} from "@/lib/login-unificado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, AlertCircle, Loader2 } from "lucide-react";

export function LoginScreen() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const branding = getBrandingEfetivo(undefined);

  useEffect(() => {
    carregarUsuariosEmpresaFromSupabase();
  }, []);

  async function handleEntrar() {
    setError("");
    if (!login.trim()) {
      setError("Informe o usuário");
      return;
    }
    if (!senha) {
      setError("Informe a senha");
      return;
    }
    setLoading(true);
    const { ok, error: msg } = await loginUnificado(login.trim(), senha);
    setLoading(false);
    if (!ok) setError(msg ?? "Falha no login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 px-4 py-6">
      <div className="w-full max-w-5xl bg-background rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Coluna esquerda: ilustração / destaque visual */}
        <div className="relative hidden md:flex items-center justify-center bg-sky-500/90">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.9),transparent_55%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.7),transparent_55%),radial-gradient(circle_at_0_100%,rgba(255,255,255,0.6),transparent_55%)]" />
          <div className="relative z-10 flex flex-col items-center gap-6 px-8">
            <div className="flex items-center justify-center h-40 w-40 rounded-3xl bg-background/95 shadow-xl">
              <div className="h-24 w-20 rounded-3xl bg-sky-400 flex items-center justify-center relative overflow-hidden">
                <div className="h-full w-2/5 bg-white/90" />
                <div className="absolute -bottom-4 right-4 h-16 w-16 rounded-full bg-sky-200 border-4 border-sky-500" />
              </div>
            </div>
            <div className="text-center text-background">
              <p className="text-sm uppercase tracking-[0.25em] font-semibold text-sky-100/90">
                Bem-vindo
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">
                A porta de entrada <br />
                do seu painel de gestão
              </h2>
              <p className="mt-4 text-sm text-sky-50/90 max-w-xs mx-auto">
                Acesse todos os módulos da sua loja em um só lugar, com segurança e praticidade.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna direita: formulário de login */}
        <div className="flex flex-col justify-center px-6 py-10 md:px-10 bg-background">
          {/* Logo / branding */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-3">
              {branding.logoPrincipal ? (
                <img
                  src={branding.logoPrincipal || "/placeholder.svg"}
                  alt={branding.nomeExibicao}
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : branding.logoIcone ? (
                <img
                  src={branding.logoIcone || "/placeholder.svg"}
                  alt={branding.nomeExibicao}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                  <Store className="h-5 w-5 text-background" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
                  Login
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {branding.nomeExibicao}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para gerenciar produtos, vendas e equipes da sua loja.
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">
                Dados de acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Usuario
                </Label>
                <Input
                  type="text"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    setError("");
                  }}
                  placeholder="exemplo@empresa.com ou usuário"
                  autoComplete="username"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Senha
                </Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setError("");
                  }}
                  placeholder="Digite sua senha"
                  onKeyDown={(e) => e.key === "Enter" && handleEntrar()}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-[hsl(var(--destructive))] shrink-0" />
                  <span className="text-sm text-[hsl(var(--destructive))]">
                    {error}
                  </span>
                </div>
              )}

              <Button
                onClick={handleEntrar}
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Entre com suas credenciais para acessar o sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
