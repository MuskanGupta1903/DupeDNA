# DupeDNA — Technical Spec

AI makeup dupe finder that matches products by semantic ingredient
similarity, not keyword search. College portfolio project — code should be
clean and explainable, not clever for its own sake.

## Tech stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB (Atlas) via Mongoose
- Embeddings: `@xenova/transformers`, model `Xenova/all-MiniLM-L6-v2`, run
  in-process in the Express backend. No external embedding API, no Python.
- LLM explanation layer: OpenAI `gpt-4o-mini`, called only for the
  top-ranked match when the user clicks "Why this match" — never
  automatically, never for all results.
- Image color extraction: `colorthief` npm package (shade-matcher feature)
- No hosted brand product photos — store a `productUrl` linking out to the
  brand/retailer page instead.

## Data model (MongoDB / Mongoose)

**Product**
- `name`, `brand`, `category`, `price` (INR)
- `ingredients`: [string]
- `ingredientEmbedding`: [float] (384-dim, generated at seed time)
- `attributes`: { `finish`, `shadeFamily`, `skinType`: [] }
- `productUrl`
- `dominantColorLAB` (optional, shade-matcher only)

## Core features / API

1. **Seed script** — reads products from JSON/CSV, generates embeddings
   from ingredient lists, inserts into MongoDB.
2. **POST /api/dupes/:productId** — returns top 5 matches in the same
   category, ranked by:
   `0.7 * cosine_similarity(ingredient embeddings) + 0.3 * attribute_similarity(finish, shadeFamily, skinType overlap)`
   Response must include the raw shared-ingredient list and count so the
   frontend can render the overlap strip accurately (no frontend
   recomputation).
3. **GET /api/dupes/:productId/explain/:dupeId** — on-demand LLM
   explanation, 2 sentences, called only when requested.
4. **POST /api/shade-match** — accepts image upload, extracts dominant
   color via colorthief, converts to LAB, returns closest products by
   Delta E.

## Non-goals
- No default Tailwind colors anywhere (see design-system rule)
- No LLM call per result — on-demand, one match at a time only
- No Python microservice — everything stays in Node/JS
- No rounded-corner soft-shadow "card" styling — see design-system rule

## Repo structure
Monorepo: `/client` (Vite React), `/server` (Express), seed script, README
with setup instructions and required env vars (`MONGODB_URI`,
`OPENAI_API_KEY`).