# PPS8 — Distribuição de Operadores

Interface web para distribuição de operadores. O projeto original está disponível em [Figma](https://www.figma.com/design/2Ca0djh2hDeb6M0LZSEGqy/Interface).

> **Palavra-passe de acesso:** `IMPETUS2026`

---

## Desenvolvimento local

```bash
npm i          # instalar dependências
npm run dev    # iniciar servidor de desenvolvimento
```

---

## Deploy com Docker

### Servidor com Traefik (ex: dev.citeve.pt)

Expõe a app em `http://dev.citeve.pt/digitalforge/` via Traefik.

```bash
docker compose up -d --build
```

### Servidor sem Traefik (Nginx)

Expõe a app em `http://IP/digitalforge/` via Nginx.

```bash
docker compose -f docker-compose.nginx.yml up -d --build
```

### Atualizar após novo commit

```bash
git pull origin main
docker compose down && docker compose up -d --build
# ou, para Nginx:
docker compose -f docker-compose.nginx.yml down && docker compose -f docker-compose.nginx.yml up -d --build
```