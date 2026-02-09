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
import { Store, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

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

  function handleLoginAdmin() {
    setLogin("admin");
    setSenha("123456");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo - dynamically branded */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {branding.logoPrincipal ? (
            <img
              src={branding.logoPrincipal || "/placeholder.svg"}
              alt={branding.nomeExibicao}
              className="h-12 w-auto max-w-[160px] object-contain"
            />
          ) : branding.logoIcone ? (
            <img
              src={branding.logoIcone || "/placeholder.svg"}
              alt={branding.nomeExibicao}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
              <Store className="h-6 w-6 text-background" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {branding.nomeExibicao}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Gestao para Loja de Roupas
            </p>
          </div>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">
              Entrar no Sistema
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
                placeholder="Digite seu usuario (login)"
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
      </div>
    </div>
  );
}
