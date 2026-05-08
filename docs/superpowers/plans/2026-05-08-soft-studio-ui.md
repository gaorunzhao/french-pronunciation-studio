# Soft Studio UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the pronunciation studio into a polished, warm, collapsible-sidebar practice interface.

**Architecture:** Keep the existing React component structure and app state. Add sidebar collapsed state in `src/App.tsx`, update visual tokens in `src/styles/tokens.css`, polish layout in `src/styles/app.css`, and add icons to shell/transport controls.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, lucide-react.

---

### Task 1: Collapsible App Shell

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Write the failing test**

Add a test that renders the app, clicks the sidebar collapse button, checks icon-only collapsed state, expands again, and verifies navigation remains accessible.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: fail because there is no collapse button yet.

- [ ] **Step 3: Implement minimal shell behavior**

Add `isSidebarCollapsed` state, a toggle button with accessible names, collapse-specific class names, and icon-enhanced nav buttons.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/App.test.tsx`

Expected: pass.

### Task 2: Soft Studio Visual Polish

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/app.css`
- Modify: `src/components/TransportBar.tsx`
- Modify: `src/components/PracticeWorkspace.tsx`

- [ ] **Step 1: Update the palette and base control tokens**

Replace the current plain warm theme with parchment surfaces, ink text, sage/teal primary color, amber learning accent, and softer button states.

- [ ] **Step 2: Polish the workspace and transport**

Use a focused practice header, calmer sentence cards, icon-led transport buttons, and stable responsive layout.

- [ ] **Step 3: Verify all tests**

Run: `npm test`

Expected: all tests pass.

### Task 3: Build Verification

**Files:**
- No source changes unless verification reveals a specific issue.

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.
