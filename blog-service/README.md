# Blog Service (REST) — Go Skeleton

Ovaj servis je namerno samo **skeleton** (bez implementacije poslovne logike). Cilj je da imaš strukturu fajlova + dockerizaciju, a posle popunjavaš kod.

## Struktura

- `cmd/blog-service/main.go` — startuje HTTP server
- `internal/config` — učitavanje env var-ova (`PORT`, `DB_*`)
- `internal/httpapi` — ruter i handler-i (trenutno vraćaju `501 Not Implemented`)
- `internal/domain` — entiteti (Blog, Comment)
- `internal/service` — servisni sloj (stub metode)
- `internal/storage` — repository interfejsi
- `internal/storage/postgres` — Postgres repository stubovi

## Domen (za tvoje zahteve)

### Blog

- `Title` (naslov/tema)
- `DescriptionMD` (opis u markdown formatu)
- `CreatedAt`
- `ImageURLs` (opciono)

### Comment

- informacije o autoru (npr. `AuthorUserID` / `AuthorUsername` / `AuthorDisplayName`)
- `CreatedAt`, `UpdatedAt`
- `Text`

## Docker

- `Dockerfile` je multi-stage (Go build + runtime)
- Port: `8082` (`PORT` env)
- DB: Postgres preko `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (setuje `docker-compose.yml`)
