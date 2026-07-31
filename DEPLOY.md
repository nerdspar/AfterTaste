# Deploying AfterTaste

Self-hosted on TrueNAS (or any Docker host). The whole stack — the app and its
Postgres database — is defined in [`docker-compose.yml`](docker-compose.yml).
All data lives in one folder on your NAS, so backups are trivial.

There is **no `.env` file** — you paste two secrets straight into
`docker-compose.yml`.

---

## 1. Get the code on the NAS

```bash
git clone <your-repo-url> aftertaste
cd aftertaste
```

(Or copy the project folder over however you like. You need Docker + the
`docker compose` plugin available on the host.)

## 2. Generate the two secrets

```bash
# Database password — hex only, so it's safe inside the connection URL:
openssl rand -hex 24

# Auth secret — signs login sessions:
openssl rand -base64 48
```

Keep both handy for the next step.

## 3. Paste them into docker-compose.yml

Open `docker-compose.yml` and replace the placeholders:

- `PASTE_DB_PASSWORD_HERE` — appears **twice** (marked `⬅ DB_PASSWORD`). Use the
  hex password in **both**; they must match.
- `PASTE_AUTH_SECRET_HERE` — the base64 auth secret (marked `⬅ AUTH_SECRET`).

> Don't commit the file with real secrets in it. If you deploy from a git
> clone, keep the edited copy on the NAS only (e.g. `git update-index
> --assume-unchanged docker-compose.yml` after editing).

## 4. Create the storage folder

The compose file bind-mounts everything under `/mnt/NAS/Data/aftertaste`.
Create the two subfolders empty, and make the uploads folder writable by the
app's container user (uid **1001**):

```bash
mkdir -p /mnt/NAS/Data/aftertaste/db /mnt/NAS/Data/aftertaste/uploads
chown -R 1001:1001 /mnt/NAS/Data/aftertaste/uploads
```

- `db/` — the Postgres database (Postgres sets its own ownership on first boot).
- `uploads/` — recipe & avatar images.

> On TrueNAS you can also create the `aftertaste` dataset in the UI; just make
> sure `uploads` ends up writable by uid 1001 (adjust the dataset's ACL/owner
> if the `chown` above is blocked).

## 5. Launch

```bash
docker compose up -d --build
```

The first boot builds the image, starts Postgres, waits for it to be healthy,
**runs the database migrations automatically**, then starts the app on port
**3000**.

Open `http://<nas-ip>:3000`. The **first account you create owns the
household** — sign up, then invite others from **Settings → Household**
(they join when they sign up with the invited email).

---

## HTTPS / custom domain

Point a reverse proxy (TrueNAS built-in, Nginx Proxy Manager, Traefik, Caddy,
etc.) at `http://<nas-ip>:3000`. The app trusts the proxy's forwarded host, so
no extra config is needed — just make sure the proxy forwards
`X-Forwarded-Proto: https` so login cookies are marked secure.

## Updating to a new version

```bash
git pull
docker compose up -d --build
```

Migrations run again on boot (only new ones apply). If you used
`--assume-unchanged` on the compose file, your pasted secrets stay put across
pulls.

## Backups

Everything is in one place:

```
/mnt/NAS/Data/aftertaste/
├── db/        # Postgres data  (recipes, households, users, meal plans …)
└── uploads/   # recipe & avatar image files
```

Snapshot that dataset (ZFS snapshots are ideal) or copy the folder while the
stack is stopped (`docker compose stop`) for a consistent copy. For a
logical DB dump instead:

```bash
docker compose exec db pg_dump -U aftertaste aftertaste > aftertaste-$(date +%F).sql
```

Restore = restore the folder (or `psql < dump.sql` into a fresh DB).

## Troubleshooting

| Symptom | Fix |
|---|---|
| App restarts / can't reach DB | `docker compose logs app` and `… logs db`. Usually the two DB passwords don't match, or the `db/` folder isn't empty from a previous run with a different password. |
| Image uploads fail / images 404 | `uploads/` isn't writable by uid 1001 — re-run the `chown`, or fix the dataset ACL. |
| "AUTH_SECRET" error on boot | The `PASTE_AUTH_SECRET_HERE` placeholder wasn't replaced. |
| Login works but drops on refresh behind HTTPS | Reverse proxy must forward `X-Forwarded-Proto: https`. |

## Local development (no Docker)

Create a `.env` (gitignored) with a dev database URL + any secret — see the
commented dev block in [`.env.example`](.env.example):

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aftertaste?schema=public"
AUTH_SECRET="any-long-random-string-for-dev"
```

Then:

```bash
node scripts/dev-db.mjs   # embedded Postgres on :5432 (data in ~/.aftertaste/pgdata)
npx prisma migrate deploy # first time only
npm run dev
```
