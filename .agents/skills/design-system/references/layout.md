# Layout & Global Styles Reference

Detailed HTML patterns for layout components and global styles in the Architectural Minimalist design system.

**Key principle:** The visual identity comes from warm neutral backgrounds, border-based structure, sharp geometry, and restrained use of color — not from any specific layout. When adapting, keep the warm neutral background dominant across 85%+ of the visible area.

## Sidebar Application Layout

The primary application layout: a collapsible sidebar on the left with accordion sections and controls, main content area on the right with floating action buttons.

```html
<!-- App Shell: full-screen flex container -->
<div class="flex h-screen w-screen overflow-hidden bg-background text-text-main font-sans selection:bg-accent/20 transition-colors duration-300">

  <!-- ===== SIDEBAR ===== -->
  <!-- Open: w-[400px] translate-x-0 -->
  <!-- Closed: w-0 -translate-x-full opacity-0 -->
  <aside class="w-[400px] translate-x-0 bg-background border-r border-border
    transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden
    shadow-2xl z-20 relative">

    <!-- Sidebar Header: App name + icon buttons -->
    <!-- items-start keeps title and buttons top-aligned (not vertically centered) -->
    <!-- CRITICAL: Every icon below MUST have class="w-5 h-5" — Lucide defaults to 24px which breaks alignment -->
    <div class="flex-col items-stretch gap-4 p-8 border-none pb-0">
      <div class="flex justify-between items-start">
        <h1 class="text-[26px] font-header font-medium text-text-main leading-tight mb-2">
          App Name
        </h1>
        <div class="flex gap-1">
          <!-- Icon buttons: actions, reset, collapse — all w-5 h-5 icons -->
          <!-- Every icon-only button MUST have a title attribute for tooltip -->
          <button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent transition-all duration-200"
            title="Auto-adjust settings">
            <Wand2 class="w-5 h-5" />
          </button>
          <button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent transition-all duration-200"
            title="Reset to defaults">
            <RotateCcw class="w-5 h-5" />
          </button>
          <!-- Collapse sidebar: Minimize2 icon -->
          <button class="p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent transition-all duration-200"
            title="Collapse sidebar">
            <Minimize2 class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable body with accordion sections -->
    <div class="flex-1 overflow-y-auto p-8 pt-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <!-- Accordion sections go here (see Collapsible Sections below) -->
    </div>
  </aside>

  <!-- ===== MAIN CONTENT ===== -->
  <div class="flex-1 flex flex-col h-full relative">

    <!-- Expand sidebar button (only shown when sidebar is collapsed) -->
    <!-- Uses Maximize2 icon — counterpart to Minimize2 in the sidebar header -->
    <button class="absolute top-4 left-4 z-10
      inline-flex items-center justify-center
      bg-surface border border-border text-text-main hover:bg-secondaryHover
      shadow-lg !p-3 rounded-full transition-all duration-200"
      title="Expand sidebar">
      <Maximize2 class="w-5 h-5" />
    </button>

    <!-- Floating action buttons: top-right corner -->
    <div class="absolute top-4 right-4 z-10 flex gap-2">
      <!-- Feature toggle (e.g., lights on/off) — title is mandatory -->
      <button class="inline-flex items-center justify-center
        bg-surface border border-border text-text-main hover:bg-secondaryHover
        shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform"
        title="Turn on lamp">
        <svg class="w-5 h-5 text-text-muted"><!-- feature icon --></svg>
      </button>
      <!-- Day/Night (dark mode) toggle — title is mandatory -->
      <button class="inline-flex items-center justify-center
        bg-surface border border-border text-text-main hover:bg-secondaryHover
        shadow-lg w-12 h-12 !p-0 rounded-full hover:scale-105 transition-transform"
        title="Switch to Night">
        <svg class="w-5 h-5 text-amber-500 fill-current"><!-- Sun icon (day) --></svg>
        <!-- or: <svg class="w-5 h-5 text-indigo-400 fill-current">Moon icon (night)</svg> -->
      </button>
    </div>

    <!-- Content area: takes ALL available space (full width/height) -->
    <!-- Uses bg-secondary, NOT bg-background — provides contrast with sidebar -->
    <div class="flex-1 bg-secondary relative overflow-hidden transition-colors duration-300">
      <!-- Main application content fills this entire region -->
      <!-- Canvas, simulator, map, or other primary content goes here -->
    </div>

    <!-- Floating bottom bar (optional) -->
    <div class="bg-surface/95 backdrop-blur border-t border-border p-6 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] z-10">
      <div class="max-w-2xl mx-auto">
        <!-- Bottom controls, sliders, etc. -->
      </div>
    </div>
  </div>
</div>
```

**Critical details:**
- The main content column uses `flex-1 flex flex-col h-full relative`. Inside it, the content/canvas region uses `flex-1` to take **all remaining space** (full width and height minus any floating bar). This ensures the primary content (canvas, simulator, map, etc.) fills the viewport without fixed heights or overflow issues.
- The content area uses `bg-secondary` — this provides visual contrast with the sidebar's `bg-background`. Do NOT use `bg-background` for both.
- Floating action buttons use `shadow-lg` and `rounded-full` — these are overlaying elements, so shadows are appropriate.
- The sidebar has `shadow-2xl` because it overlays the main content when open.
- The expand button only appears when the sidebar is collapsed, positioned `absolute top-4 left-4`.
- The sidebar header uses `items-start` (not `items-center`) so the title text and icon buttons are **top-aligned**. This prevents the smaller icon buttons from floating to the vertical center of the taller title.
- **Icon sizing is mandatory:** Every Lucide icon in the sidebar header must have `class="w-5 h-5"` (or `className="w-5 h-5"` in React). Lucide defaults to 24px — without the explicit size, icons are oversized and misalign with the title. The button wrapper uses `p-2.5` for the touch target.

## Top Navigation (Header-Based Layout)

For apps that use a top navigation bar instead of a sidebar:

```html
<div class="min-h-screen bg-background">
  <!-- Header: always neutral background, border-based separation -->
  <header class="bg-background border-b border-border px-8 py-4">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <h1 class="text-[26px] font-header font-medium text-text-main leading-tight">
        App Title
      </h1>
      <nav class="flex items-center gap-2">
        <!-- Ghost buttons for nav -->
        <button class="bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 text-sm rounded-none font-medium transition-all duration-200">
          Section
        </button>
      </nav>
    </div>
  </header>

  <!-- Main content area -->
  <main class="max-w-7xl mx-auto p-8">
    <!-- Content sections use micro-label headings -->
    <div class="mb-8">
      <h2 class="font-header text-[15px] uppercase tracking-[0.1em] text-text-main mb-4">Section Title</h2>
      <!-- Cards in a grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-surface border border-border rounded-none p-4">
          <!-- Card content -->
        </div>
      </div>
    </div>
  </main>
</div>
```

**Anti-pattern — never do this:**
```html
<!-- WRONG: colored header backgrounds -->
<header class="bg-primary text-white ...">
<header class="bg-accent text-white ...">
<header class="bg-green-600 text-white p-6 ...">
<!-- WRONG: hero sections with colored fills -->
<section class="bg-primary/20 py-16 ...">
```

## Sidebar Collapse/Expand Interaction

The sidebar transitions between open and closed states with a smooth slide animation.

**Animation:** The sidebar uses `transition-all duration-300 ease-in-out` on its container. This single transition handles the width change, slide, and fade simultaneously:

**Open state:**
```
w-[400px] translate-x-0 opacity-100
```

**Closed state:**
```
w-0 -translate-x-full opacity-0
```

**Preventing scrollbar flash:** The outermost app shell (`flex h-screen w-screen`) must use `overflow-hidden`. Without this, the sidebar's intermediate width during animation creates momentary content overflow that produces a transient horizontal scrollbar. The `overflow-hidden` is already specified in the app shell pattern — never remove it.

**Canvas re-zoom:** When the sidebar opens or closes, the main content area's available width changes. Any size-dependent content (canvas, SVG viewport, simulation, map) must recalculate to fill the new space. Two approaches:

```tsx
// Approach 1: ResizeObserver (recommended — fires during and after transition)
useEffect(() => {
  const observer = new ResizeObserver(() => recalculateScale());
  if (containerRef.current) observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);

// Approach 2: window resize event (simpler but only fires after transition)
useEffect(() => {
  const handler = () => recalculateScale();
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

The key insight: `flex-1` on the main content div automatically adjusts its width as the sidebar opens/closes — but internal content that uses fixed pixel dimensions (SVG `viewBox`, canvas scale factors, etc.) must be told to re-measure.

**Icons:** The collapse button (in the sidebar header) uses `Minimize2`. The expand button (floating in main content) uses `Maximize2`. These form a natural pair — minimize to close, maximize to open.

When collapsed, a circular expand button appears in the main content area:
```html
<button class="absolute top-4 left-4 z-10 shadow-lg !p-3 rounded-full
  bg-surface border border-border text-text-main hover:bg-secondaryHover"
  title="Expand sidebar">
  <Maximize2 class="w-5 h-5" />
</button>
```

The sidebar collapse button is an icon button in the sidebar header's button row (see Sidebar Header in [components.md](components.md)).

## Collapsible Sections (Accordions)

**Behavior:** Only one section can be open at a time. Expanding a section automatically collapses all others. This keeps the sidebar focused and prevents excessive scrolling. Track the active section name in state and toggle on click.

**Section heading font:** Each section title uses `font-header` (Tenor Sans) — the same display font used for the page title, but at the smaller `text-[15px]` size with `uppercase tracking-[0.1em]`. This creates a clear typographic hierarchy: Tenor Sans for structural headings, DM Sans for body content.

**Horizontal dividers:** Sections are separated by `border-b border-border` on each section container, with `last:border-0` to remove the divider after the final section. These thin 1px borders provide subtle visual separation without heavy styling.

**Hover behavior:** The section header button uses `group` so child elements can react to hover. On hover:
- The section title transitions from `text-text-main` to `text-primary` via `group-hover:text-primary transition-colors`
- The chevron icon does the same: `group-hover:text-primary` (this is separate from the open-state `text-primary` / `rotate-180`)
- The transition is smooth: `transition-colors` on both elements

When the section is **open**, the title and chevron are already `text-primary` — hover has no visible additional effect, which is correct (the active state subsumes the hover state).

**Content animation:** The section body uses a CSS Grid trick for smooth height animation. The content wrapper uses `grid` with `transition-all duration-300 ease-in-out`:
- **Open:** `grid-rows-[1fr] opacity-100 pb-6` — content is fully visible with bottom padding
- **Closed:** `grid-rows-[0fr] opacity-0` — content collapses to zero height with a simultaneous fade

The inner div uses `overflow-hidden min-h-0` to allow the grid row to shrink to zero without content spilling.

```html
<!-- Each section is a border-separated block. Only one should have isOpen=true at a time. -->
<div class="border-b border-border last:border-0">
  <!-- group enables group-hover on children -->
  <button class="w-full flex items-center justify-between py-5 px-1 group focus:outline-none select-none">
    <!-- Title: transitions to text-primary on hover AND when open -->
    <span class="font-header text-[15px] uppercase tracking-[0.1em] text-text-main transition-colors
      group-hover:text-primary"
    >
      Section Title
    </span>
    <!-- Chevron: transitions to text-primary on hover; rotates 180deg + text-primary when open -->
    <ChevronDown class="w-5 h-5 text-text-muted transition-all duration-200
      group-hover:text-primary" />
    <!-- When open, add: rotate-180 text-primary -->
  </button>

  <!-- Content: grid-row animation for smooth expand/collapse -->
  <!-- Open: grid-rows-[1fr] opacity-100 pb-6 -->
  <!-- Closed: grid-rows-[0fr] opacity-0 -->
  <div class="grid transition-all duration-300 ease-in-out grid-rows-[1fr] opacity-100 pb-6">
    <div class="overflow-hidden min-h-0">
      <!-- Section content: all controls are full width -->
    </div>
  </div>
</div>
```

**Implementation pattern (React):**
```tsx
const [activeSection, setActiveSection] = useState<string>('Room');

<Section
  title="Room"
  isOpen={activeSection === 'Room'}
  onToggle={() => setActiveSection(activeSection === 'Room' ? '' : 'Room')}
>
  {/* controls */}
</Section>
<Section
  title="Settings"
  isOpen={activeSection === 'Settings'}
  onToggle={() => setActiveSection(activeSection === 'Settings' ? '' : 'Settings')}
>
  {/* controls */}
</Section>
```

## Floating Controls (Bottom Bar)

For sticky bottom controls or toolbars:

```html
<div class="bg-surface/95 backdrop-blur border-t border-border p-6 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] z-10">
  <div class="max-w-2xl mx-auto">
    <!-- Controls, sliders, etc. -->
  </div>
</div>
```

## Global Styles

### Selection Color

Apply a warm accent tint to text selection on the outermost container:

```html
<div class="selection:bg-accent/20">
  <!-- All content -->
</div>
```

### Custom Scrollbars

Use thin scrollbars that blend with the border color:

```
scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
```

Requires `tailwind-scrollbar` plugin or equivalent CSS.

### Theme Transition

All color transitions should use `transition-colors duration-300` to ensure smooth light/dark mode switching.

### Dark Mode Toggle

Toggle the `dark` class on the root container (or `<html>`). All colors update automatically through CSS custom properties.

**Toggle UI:** Use a circular floating action button in the main content area's top-right corner (see Floating Action Buttons in [components.md](components.md)):
- Light mode: sun icon (`text-amber-500 fill-current`)
- Dark mode: moon icon (`text-indigo-400 fill-current`)

```js
// Toggle dark mode on the app's root container
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

## Adapting Existing Projects

When applying this design system to a project that already has styling:

1. **Replace the header** — if it has a colored background (`bg-blue-*`, `bg-green-*`, `bg-primary`, gradient), change to `bg-background border-b border-border`.
2. **Strip all rounded corners** — search for `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` and replace with `rounded-none`.
3. **Replace shadows with borders** — on cards, panels, and containers, remove `shadow-*` and add `border border-border`.
4. **Replace cool colors** — find all `blue-*`, `indigo-*`, `gray-*`, `slate-*` references and map them to the warm design system tokens.
5. **Check color distribution** — after all changes, the page should be overwhelmingly warm neutral (off-white/white). Sage and terracotta should only appear on small interactive elements.
