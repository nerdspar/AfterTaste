# Deploying AfterTaste

The container image is built automatically by **GitHub Actions** and published
to **GitHub Container Registry (GHCR)**. TrueNAS just pulls that image and runs
it alongside Postgres via [`docker-compose.yml`](docker-compose.yml). All data
lives in one folder on your NAS, so backups are trivial.

There is **no `.env` file** — you paste two secrets straight into
`docker-compose.yml`.

---

## How the image is built (nothing to run — this is automatic)

[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
builds and pushes the image on every push to `main` (and on `v*` tags). It uses
the built-in `GITHUB_TOKEN`, so no secrets to configure. Published image:

```
ghcr.io/nerdspar/aftertaste:latest      # newest main build
ghcr.io/nerdspar/aftertaste:sha-abc1234 # per-commit
ghcr.io/nerdspar/aftertaste:v1.2.3      # per release tag
```

Because the repo is private, the GHCR package is private too — so TrueNAS needs
a token to pull it (next section). Check **GitHub → your repo → Packages** after
the first build to confirm it published.

> First time: the workflow lives on `main`, so merge this branch to `main` (or
> run it from the **Actions** tab via "Run workflow") to produce the first image.

---

## 1. Let TrueNAS pull the private image (one-time)

Create a token GitHub can use to read your packages, then log Docker in on the
NAS.

1. **Create a Personal Access Token (classic):** GitHub → *Settings →
   Developer settings → Personal access tokens → Tokens (classic) → Generate
   new token (classic)*. Give it the **`read:packages`** scope. Copy it.

2. **Log in on the TrueNAS host** (via the TrueNAS shell / SSH):

   ```bash
   docker login ghcr.io -u nerdspar
   # Password: paste the token (NOT your GitHub password)
   ```

   This writes `~/.docker/config.json`, and `docker compose pull` will now work.

   *TrueNAS SCALE 24.10+ (Docker-based):* the CLI `docker login` above is the
   simplest path. If you deploy through the Apps UI instead, add the same
   registry credentials under **Apps → (gear) → registry / image pull
   credentials** (`ghcr.io`, username `nerdspar`, password = the token).

> Prefer not to manage a token? You can instead make just the **package**
> public (repo stays private): GitHub → Packages → `aftertaste` → *Package
> settings → Change visibility → Public*. Then skip the login step.

## 2. Put docker-compose.yml on the NAS + generate secrets

You only need the `docker-compose.yml` file on the NAS (the image is prebuilt).
Copy it over, then generate two secrets:

```bash
openssl rand -hex 24     # database password (hex = URL-safe)
openssl rand -base64 48  # auth session secret
```

Open `docker-compose.yml` and replace the placeholders:

- `PASTE_DB_PASSWORD_HERE` — appears **twice** (marked `⬅ DB_PASSWORD`); use the
  hex password in **both**, they must match.
- `PASTE_AUTH_SECRET_HERE` — the base64 auth secret (marked `⬅ AUTH_SECRET`).

## 3. Create the storage folder

The compose file bind-mounts everything under `/mnt/NAS/Data/aftertaste`.
Create the two subfolders empty and make `uploads` writable by the app's
container user (uid **1001**):

```bash
mkdir -p /mnt/NAS/Data/aftertaste/db /mnt/NAS/Data/aftertaste/uploads
chown -R 1001:1001 /mnt/NAS/Data/aftertaste/uploads
```

- `db/` — the Postgres database (Postgres sets its own ownership on first boot).
- `uploads/` — recipe & avatar images.

> On TrueNAS you can create the `aftertaste` dataset in the UI instead; just make
> sure `uploads` ends up writable by uid 1001 (adjust the dataset ACL/owner if
> the `chown` is blocked).

## 4. Launch

```bash
docker compose up -d      # pulls ghcr.io/nerdspar/aftertaste + starts Postgres
```

Postgres starts, the app waits for it to be healthy, **runs the database
migrations automatically**, then serves on the host port from the compose file
(**8300** by default — change the left side of `8300:3000` if it's taken).

Open `http://<nas-ip>:8300`. The **first account you create owns the
household** — sign up, then invite others from **Settings → Household** (they
join when they sign up with the invited email).

---

## HTTPS / custom domain

Point a reverse proxy (TrueNAS built-in, Nginx Proxy Manager, Traefik, Caddy…)
at `http://<nas-ip>:8300`. The app trusts the proxy's forwarded host, so no
extra config is needed — just make sure the proxy forwards
`X-Forwarded-Proto: https` so login cookies are marked secure.

## Cloudflare Tunnel (public HTTPS, no port-forwarding)

A [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
gives AfterTaste a public HTTPS URL on your own subdomain over an
**outbound-only** connection from the NAS — no router ports opened, no static
IP. `cloudflared` runs as one more container in this compose stack (a
commented-out service is already in [`docker-compose.yml`](docker-compose.yml)).

**Prerequisite:** a domain on Cloudflare (the free plan is fine — point the
domain's nameservers at Cloudflare).

1. **Create the tunnel.** Cloudflare **Zero Trust** dashboard → *Networks →
   Tunnels → Create a tunnel → Cloudflared*, name it `aftertaste`. On the
   "Install connector" screen, copy the **tunnel token** (the long `eyJ...`
   string).

2. **Add a public hostname** to the tunnel (still in the dashboard):
   - Subdomain `recipes`, Domain `yourdomain.com`
   - **Service URL:** `http://app:3000`

   Use `http`, **not** `https` — TLS is terminated at Cloudflare's edge, and
   `app:3000` is the app container reached directly over this compose network.
   (If you run `cloudflared` outside this stack instead, use
   `http://<nas-ip>:8300`.)

3. **Enable the service.** In `docker-compose.yml`, uncomment the `cloudflared`
   block at the bottom and paste your token at `PASTE_TUNNEL_TOKEN_HERE`.

4. **Set the public URL.** Set `APP_URL` in the `app` service to
   `https://recipes.yourdomain.com` so password-reset emails link correctly.

5. **Launch:** `docker compose up -d`. The tunnel connects outbound and the app
   is live at `https://recipes.yourdomain.com` (the tunnel shows **Healthy** in
   the dashboard).

**Notes**

- **Logins work with no extra config** — `trustHost` is on and Cloudflare sends
  `X-Forwarded-Proto: https`, so session cookies are secure. No `AUTH_URL` /
  `AUTH_TRUST_HOST` needed.
- You can **delete the `ports: - '8300:3000'`** mapping if you only want tunnel
  access (nothing on your LAN); `cloudflared` still reaches `app:3000`
  internally. Keep it for direct `http://<nas-ip>:8300` on your home network.
- **Lock it down (recommended):** add **Cloudflare Access** (Zero Trust →
  *Access → Applications* → self-hosted) in front of the hostname with a policy
  allowing only your household's emails — so only approved people reach the
  login page at all.
- Free-plan requests are capped at 100 MB; AfterTaste caps images at 2 MB and
  PDF imports at 15 MB, so you're well under.

**Quick test without a domain:**

```bash
docker run --rm cloudflare/cloudflared:latest tunnel --url http://<nas-ip>:8300
```

prints a temporary `https://<random>.trycloudflare.com` URL — handy to verify
end-to-end, but ephemeral (not for permanent use).

## Password-reset emails (optional)

The "Forgot password?" flow emails a reset link via [Resend](https://resend.com).
It's optional — everything else works without it, and until it's configured the
reset link is written to the container logs (`docker compose logs app`) instead
of being emailed.

To turn it on, set these in the app `environment:` block of `docker-compose.yml`:

- `APP_URL` — the app's public URL (e.g. `https://aftertaste.example.com`), used
  to build the link in the email.
- `RESEND_API_KEY` — from your Resend dashboard.
- `EMAIL_FROM` — the sender, e.g. `AfterTaste <no-reply@yourdomain.com>`.

The default `EMAIL_FROM` (`onboarding@resend.dev`) is Resend's shared test
sender and **only delivers to the email that owns the Resend account**. To send
reset emails to other household members, verify a domain in Resend (free tier
allows one) and set `EMAIL_FROM` to an address on it. Reset links expire after
1 hour and are single-use.

## Updating to a new version

Push to `main` → Actions rebuilds `:latest`. Then on the NAS:

```bash
docker compose pull && docker compose up -d
```

New DB migrations (if any) run automatically on boot; your secrets and data are
untouched.

## Backups

Everything is in one place:

```
/mnt/NAS/Data/aftertaste/
├── db/        # Postgres data  (recipes, households, users, meal plans …)
└── uploads/   # recipe & avatar image files
```

Snapshot that dataset (ZFS snapshots are ideal), or `docker compose stop` and
copy the folder for a consistent copy. For a logical DB dump instead:

```bash
docker compose exec db pg_dump -U aftertaste aftertaste > aftertaste-$(date +%F).sql
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose pull` → denied / not found | Not logged in to GHCR, or the token lacks `read:packages`. Redo the `docker login` in step 1 (or make the package public). |
| App restarts / can't reach DB | `docker compose logs app` / `… logs db`. Usually the two DB passwords don't match, or `db/` isn't empty from a prior run with a different password. |
| Image uploads fail / images 404 | `uploads/` isn't writable by uid 1001 — re-run the `chown`, or fix the dataset ACL. |
| "AUTH_SECRET" error on boot | The `PASTE_AUTH_SECRET_HERE` placeholder wasn't replaced. |
| Login drops on refresh behind HTTPS | Reverse proxy must forward `X-Forwarded-Proto: https`. |
| Tunnel shows Healthy but the site 502s | Public-hostname Service URL must be `http://app:3000` (**http**, not https), and `cloudflared` must be in this compose stack so `app` resolves. |

## Building on the box instead of pulling (optional)

If you'd rather not use the registry, put the whole repo on the NAS, edit
`docker-compose.yml` to comment out `image:` and uncomment `build: .`, then
`docker compose up -d --build`.

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
