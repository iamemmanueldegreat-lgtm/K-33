---
name: React 19 + Vite fastRefresh compatibility bug
description: fastRefresh: false must be set in @vitejs/plugin-react to prevent Invalid hook call errors with React 19
---

# React 19 + @vitejs/plugin-react fastRefresh Bug

**Rule:** Always set `fastRefresh: false` in the `react()` plugin config when using React 19 with Vite.

**Why:** React 19 (v19.2.6) has an incompatibility with @vitejs/plugin-react v5.x fast refresh transforms. The `$RefreshSig$` transform causes "Invalid hook call. Cannot read properties of null (reading 'useState')" errors at render time — specifically the `ReactSharedInternals.H` is null error.

**How to apply:** In vite.config.ts:
```ts
plugins: [react({ fastRefresh: false }), ...]
```

Other things tried that did NOT fix it: resolve.dedupe, optimizeDeps.include, clearing node_modules/.vite, checking for duplicate React instances (none found), circular dependency fixes.
