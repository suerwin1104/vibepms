---
name: vercel-react-best-practices
description: Performance and patterns for React applications (Rendering, Data Fetching, etc.). Use this skill when writing React components, optimizing performance, or reviewing frontend code.
---

# Vercel React Best Practices

## Quick Reference

### 1. Eliminating Waterfalls (CRITICAL)

- **async-defer-await**: Move `await` into branches where actually used.
- **async-parallel**: Use `Promise.all()` for independent operations.
- **async-dependencies**: Use `better-all` for partial dependencies.
- **async-api-routes**: Start promises early, await late in API routes.
- **async-suspense-boundaries**: Use Suspense to stream content.

### 2. Bundle Size Optimization (CRITICAL)

- **bundle-barrel-imports**: Import directly, avoid barrel files (e.g., `import { Button } from 'lib/button'` instead of `from 'lib'`).
- **bundle-dynamic-imports**: Use `next/dynamic` or `React.lazy` for heavy components (charts, maps).
- **bundle-defer-third-party**: Load analytics/logging after hydration.

### 3. Server-Side Performance (HIGH)

- **server-cache-react**: Use `React.cache()` for per-request deduplication.
- **server-serialization**: Minimize data passed to client components (pass IDs, fetch detailed data on client if needed).

### 4. Client-Side Data Fetching (MEDIUM-HIGH)

- **client-swr-dedup**: Use libraries like SWR or TanStack Query for automatic request deduplication and caching.
- **client-event-listeners**: Deduplicate global event listeners.

### 5. Re-render Optimization (MEDIUM)

- **rerender-memo**: Extract expensive work into memoized components (`React.memo`).
- **rerender-dependencies**: Use primitive dependencies in `useEffect` and `useMemo`.
- **rerender-derived-state**: Calculate derived values during render, don't sync state with effects.
- **rerender-transitions**: Use `startTransition` for non-urgent updates.

### 6. Rendering Performance (MEDIUM)

- **rendering-content-visibility**: Use CSS `content-visibility: auto` for long lists off-screen.
- **rendering-conditional-render**: Use ternaries (`condition ? <A/> : <B/>`) instead of logical AND (`condition && <A/>`) to avoid rendering `0` or artifacts.

### 7. JavaScript Performance (LOW-MEDIUM)

- **js-index-maps**: Use `Map` or `Set` for O(1) lookups instead of finding in arrays O(n).
- **js-early-exit**: Return early from functions to avoid deep nesting.
- **js-hoist-regexp**: Hoist `RegExp` creation outside loops or component bodies.

## How to Apply

When writing or reviewing React code:

1. Check for "waterfalls" (sequential awaits that could be parallel).
2. Look for large imports that could be lazy loaded.
3. Verify `useEffect` dependencies are stable.
4. Ensure state is minimal and derived where possible.
