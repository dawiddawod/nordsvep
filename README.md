# NordSvep

Tinder-style job search over every ad on Platsbanken. Swipe right to save, left to skip (or use ← →).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How it works

- `src/lib/jobtech.ts` talks to Arbetsförmedlingen's open [JobTech](https://jobtechdev.se) APIs. No API key is needed.
  - **JobSearch**: the live ads in the deck, cached for 5 minutes.
  - **JobAd Links**: extra ads JobTech collects from other Swedish job sites (studentjob.se, offentligajobb.se, …), mixed into each page. Its copies of Platsbanken ads are excluded.
  - **Taxonomy**: the field and county filter lists, cached for a day.
- `src/app/api/jobs/route.ts` is the app's own endpoint. The browser never calls JobTech directly.
- `src/components/SwipeApp.tsx` holds the deck, filters and saved list. `JobCard.tsx` is the draggable card.
- Swipe history and saved jobs live in `localStorage` for now. They move to a database when accounts are added.
