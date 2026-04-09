# Magic Note

Magic Note is an AI-inspired personal knowledge operating system with a magical academy UI.

## Stack
- Next.js 14 + React + TypeScript
- Tailwind CSS
- Static export for Cloudflare Pages
- localStorage persistence for MVP
- PWA manifest + service worker

## Features
- Mock OAuth sign-in (Google / GitHub)
- Capture inbox for text, links, screenshots
- AI-style title/summary/tags/concepts/domain generation
- Library with search, domain filter, tag filter, related cards
- Review queue with spaced repetition scheduling
- Quiz mode with recall prompts
- Knowledge map and progress dashboard

## Deploy
Cloudflare Pages config:
- Framework preset: Next.js
- Build command: `npx @cloudflare/next-on-pages@1`
- Output dir: `.vercel/output/static`
