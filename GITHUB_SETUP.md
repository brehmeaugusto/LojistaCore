# Criar repositório LojistaCore no GitHub

Siga estes passos para publicar o projeto no GitHub com o nome **LojistaCore**.

## 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new).
2. Em **Repository name** digite: `LojistaCore`.
3. Escolha **Public** ou **Private**.
4. **Não** marque "Add a README file" (o projeto já tem arquivos).
5. Clique em **Create repository**.

## 2. Inicializar Git no projeto (se ainda não for um repositório)

Abra o terminal **na pasta do LojistaCore** e execute:

```powershell
cd "D:\Briefing - Inteligência de Negócios\Desenvolvimento Briefing - Documentos\Briefing\Sistemas\LojistaCore"

git init
git branch -M main
```

## 3. Adicionar o remote do GitHub

Substitua `SEU_USUARIO` pelo seu usuário do GitHub:

```powershell
git remote add origin https://github.com/SEU_USUARIO/LojistaCore.git
```

Exemplo: `https://github.com/brehmeaugusto/LojistaCore.git`

## 4. Primeiro commit e push

```powershell
git add .
git commit -m "Initial commit: LojistaCore - sistema gestão loja de roupas"
git push -u origin main
```

Se o GitHub pedir autenticação, use seu usuário e um **Personal Access Token** (em Settings → Developer settings → Personal access tokens) no lugar da senha.

---

**Resumo:** criar repo em github.com → `git init` na pasta LojistaCore → `git remote add origin` → `git add .` → `git commit` → `git push -u origin main`.
