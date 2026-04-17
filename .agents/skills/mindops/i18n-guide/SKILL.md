---
name: mindops-i18n-guide
description: Internationalization conventions for MindOps. Use when adding translation keys, creating new UI text, modifying locale detection, or working with next-intl. Triggers on tasks involving translations, language switching, or bilingual content.
---

# MindOps i18n Guide

MindOps is bilingual (English + Spanish) using `next-intl` with **no URL prefix** — locale is resolved server-side via middleware.

## Adding New Translation Keys

When adding ANY user-facing text, you MUST:

1. Add the key to BOTH files:
   - `messages/en.json`
   - `messages/es.json`
2. Use the namespaced key pattern: `"Namespace.keyName"`
3. Never hardcode user-facing strings in components

```json
// messages/en.json
{
  "Dashboard": {
    "newWidget": "My new widget",
    "noData": "No data available"
  }
}

// messages/es.json
{
  "Dashboard": {
    "newWidget": "Mi nuevo widget",
    "noData": "No hay datos disponibles"
  }
}
```

## Usage in Components

### Server Components (preferred)

```typescript
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('newWidget')}</h1>;
}
```

### Client Components

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyWidget() {
  const t = useTranslations('Dashboard');
  return <p>{t('noData')}</p>;
}
```

## Locale Detection Cascade (middleware.ts)

Priority order — first match wins:

1. **URL param** `?lang=es` or `?locale=es` (from Telegram links)
2. **Profile DB** `profiles.language` (if user is logged in)
3. **Telegram session** `telegram_sessions.language` (if has `session_id`)
4. **Cookie** `NEXT_LOCALE`
5. **Browser** `Accept-Language` header
6. **Fallback** `'en'`

The resolved locale is injected into `x-next-intl-locale` header by middleware, which `src/i18n/request.ts` reads.

## Architecture

```
middleware.ts          → Resolves locale, sets x-next-intl-locale header + NEXT_LOCALE cookie
src/i18n/request.ts   → getRequestConfig reads header → loads messages/{locale}.json + DB translations
src/app/layout.tsx     → NextIntlClientProvider wraps the app
src/app/actions/i18n.ts → setUserLanguage server action (cookie + DB + telegram_sessions)
```

## Translation Sources

Messages come from TWO sources merged together:

1. **Static files:** `messages/en.json`, `messages/es.json`
2. **Database:** via `getDbTranslations(locale)` from `src/lib/i18n/loader.ts`

DB translations override static ones (spread order: `{ ...localMessages, ...dbMessages }`).

## Gotchas

- **Always update BOTH language files.** Missing keys cause runtime errors, not build errors.
- **Never use `useTranslations` in Server Components** — use `getTranslations` instead.
- **The `setUserLanguage` server action** updates 3 places: cookie, profiles table, and telegram_sessions table. Don't update just one.
- **Rich text in translations** — use `<b>text</b>` tags in JSON and render with `t.rich()`, not `t()`.
- **Supported locales** are defined in `middleware.ts` as `const SUPPORTED_LOCALES = ['en', 'es']`. If adding a new language, update this array, create the messages file, AND add the option to the `LanguageSwitcher` component.
