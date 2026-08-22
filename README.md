# Vedic numerology calculator

Calculates a **Driver Number (Mulank)** and **Conductor Number (Bhagyank)**
from a date of birth, generates a **Lo Shu Grid**, and surfaces matching
YouTube videos — all calculated server-side and saved to MongoDB.

## What's inside

```
server/
  server.js           Express app entry point
  routes/readings.js  API: create + fetch readings
  routes/videos.js    API: categorized YouTube video search + caching
  models/Reading.js   MongoDB schema for readings
  models/VideoCache.js MongoDB schema for cached video results
  utils/numerology.js Calculation engine + number interpretation data (single source of truth)
public/
  index.html          Frontend — hero, DOB input, results, Lo Shu grid, videos
```

### Terminology used throughout

| Vedic / Indian term | Common Western term | Alternative Western term | Calculated from |
|---|---|---|---|
| Driver Number (Mulank) | Psychic Number | Birth Number / Ruling Number | Day of birth only |
| Conductor Number (Bhagyank) | Life Path Number | Destiny Number | Entire date of birth |

Both numbers always fully reduce to a single digit 1–9 (e.g. day 29 →
2+9=11 → 1+1=2) — this app does not stop at master numbers for these two
figures, matching standard Mulank/Bhagyank practice.

### API

- `POST /api/readings` — body `{ day, month, year }`. Validates the date
  (rejects invalid calendar dates and future dates), calculates the full
  reading server-side, saves it, returns `{ id, result }`.
- `GET /api/readings/:id` — fetches a saved reading.
- `GET /api/videos/:driver/:conductor/:day/:month/:year` — returns four
  categories of cached/fetched YouTube videos: `driver`, `conductor`,
  `loshu`, `combined`. If the YouTube API key is missing or errors, returns
  a `warning` field instead of failing — the numerology results are never
  blocked by video failures.
- `GET /api/health` — uptime/DB check.

The frontend never calculates a number itself — it sends the raw date and
displays whatever the server returns. This keeps every saved reading
trustworthy and reproducible.

## 1. Get a database (MongoDB Atlas — free tier)

1. https://www.mongodb.com/cloud/atlas/register — free account.
2. Create a free M0 cluster.
3. **Database Access** → create a database user + password.
4. **Network Access** → allow `0.0.0.0/0` to start.
5. **Connect → Drivers** → copy the connection string, add a database name
   to the path (e.g. `.../numerology?retryWrites=true...`).

## 2. Get a YouTube Data API key (free)

1. https://console.cloud.google.com — create/select a project.
2. **APIs & Services → Library** → search "YouTube Data API v3" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → API key**.
4. Optionally restrict the key to just the YouTube Data API.

Video results are cached in MongoDB per (category, driver, conductor, DOB)
for 30 days, so the same combination doesn't re-query YouTube on every
visit — keeping well within the free daily quota (10,000 units; each
category costs up to 300 units on a cold cache, ~4 categories × 300 = up to
1,200 units per *new* combination).

## 3. Run it locally

```bash
npm install
cp .env.example .env
# paste MONGODB_URI and YOUTUBE_API_KEY into .env
npm start
```

Visit `http://localhost:3000`.

## 4. Deploy it

**Render (free tier):**
1. Push this folder to a GitHub repo.
2. render.com → New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add `MONGODB_URI` and `YOUTUBE_API_KEY` as environment variables.
5. Deploy.

**Hostinger (Business/Cloud plans with the Node.js app feature):**
1. hPanel → Add website → Deploy Web App → connect your GitHub repo.
2. Entry point: `server/server.js`. Start command: `npm start`.
3. Add `MONGODB_URI` and `YOUTUBE_API_KEY` as environment variables.
4. Enable auto-redeploy on push, if offered.

Either way, MongoDB Atlas and the YouTube API key work identically — only
where the Node process itself runs changes.

## Notes on scope

- **No login system.** Readings are anonymous; there's no email/account
  lookup in this version. Add one if you want returning visitors to find
  past readings.
- **Master numbers**: intentionally *not* preserved for Driver/Conductor
  numbers, per the Mulank/Bhagyank convention (see terminology table
  above). If you want Western-style master number preservation (11, 22,
  33) instead, that's a one-line change in
  `server/utils/numerology.js` (`reduceNumber(day, true)`).
- **Combination content is generated, not hardcoded** — `server/utils/numerology.js`
  builds the Driver+Conductor combination text from the two individual
  number profiles rather than storing all 81 pairs by hand, so adding
  fields to a number's profile automatically improves every combination
  that includes it.

## Book Intelligence (upload your own numerology books)

Book uploads live behind an admin login now, at **`/admin.html`** — not on
the public homepage. Set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`
(see `.env.example`), then visit `/admin.html` to log in and upload PDFs.
Regular visitors never see the upload form; they only see the results —
after calculating a reading, the "Book insights" section on the results
page automatically searches whatever books are in the library and shows
short, cited excerpts (book + page number) for each relevant topic —
Driver/Conductor numbers, Lo Shu Grid, missing/repeated numbers, name
correction, health, relationships, career, finance, and remedies. No login
needed for that part; it's read-only and automatic.

Login attempts are rate-limited (8 per 15 minutes) to resist password
guessing. Sessions are stateless signed cookies (7-day expiry) — no
separate session database needed.

**Important — read before uploading books publicly:**
This app does NOT merge or synthesize across books. If three books discuss
the same topic, all three excerpts are shown separately, each attributed
to its own source, so visitors can see where traditions agree or differ
themselves rather than being told a single "answer." No interpretation is
invented — only short (≤320 character) excerpts of what the books actually
contain are shown.

That said: **showing excerpts of a copyrighted book to every visitor of a
public website is a different thing, legally, than using your own book for
your own private reference.** Attribution and short excerpt length reduce
risk but don't eliminate it. Only upload books you have clear rights to
use this way — public-domain texts, books you wrote yourself, or books
whose license explicitly permits excerpting. If you want to use
commercially-published books, either keep this feature restricted to
yourself (don't expose the upload UI publicly, or add authentication to
it) or get legal advice first.

**Current limitations:**
- **PDF only.** EPUB isn't supported yet — would need a different parsing
  library and different page/chapter semantics (EPUBs don't have fixed
  page numbers the way PDFs do).
- **Scanned/image-only PDFs won't work** — the app extracts real text from
  the PDF, it doesn't run OCR. A PDF that's just photographed pages with no
  underlying text layer will be rejected on upload with a clear error.
- **Search is keyword-based**, not semantic (no embeddings/vector search).
  It's tuned to recognize common numerology terminology across different
  traditions (e.g. "Psychic Number" vs "Driver Number", "Magic Square" vs
  "Lo Shu Grid") but a book using very different vocabulary for a concept
  might not surface for that topic. Search terms live in
  `server/knowledge/bookSearch.js` and are easy to extend.
- **10 uploads per hour** rate limit (PDF parsing is heavier than other
  requests) — adjust in `server/server.js` if needed.

## Mobile Number Numerology

Two things: analyzing an existing number, and suggesting new ones.

**Analysis** — add a mobile number in the optional field on the main form.
Alongside the regular reading, you'll get: total/final digit, digit
frequency (present/missing/repeated, same pattern as the Lo Shu grid),
first/last digit, and a compatibility score (0-100) against your Driver,
Conductor, and Name numbers — with every point of that score itemized and
explained, never a bare number. If you've uploaded books, relevant
excerpts about mobile numbers show up too, kept separate from the
calculated score per the same "never merge sources" principle as the rest
of the app.

**Suggestion** — the "Suggest a mobile number" tool (below the main form)
generates and ranks candidate numbers. Give it a fixed prefix (e.g. your
carrier code) and how many digits to fill in; it samples up to 500
candidates, scores each one the same transparent way, and shows the top 5
ranked by compatibility. This uses random sampling rather than exhaustive
generation — 8 free digits alone is 100 million combinations, sampling
gets a strong candidate set without that cost.

Both endpoints (`/api/mobile/analyze`, `/api/mobile/suggest`) are public —
no admin login needed, since generating/scoring numbers doesn't touch your
book library directly (it only reads from it for citations).
