# Layout & Global Styles Reference

Detailed HTML patterns for layout components and global styles in the Architectural Minimalist design system.

**Key principle:** This design system works with any app structure — sidebar, top-nav, card grid, dashboard, single-page. The visual identity comes from warm neutral backgrounds, border-based structure, sharp geometry, and restrained use of color — not from any specific layout pattern. When adapting, keep the warm neutral background dominant across 85%+ of the visible area.

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

## Sidebar

Collapsible sidebar with slide animation:

```html
<!-- Open state: w-[400px] translate-x-0 -->
<!-- Closed state: w-0 -translate-x-full opacity-0 -->
<aside class="w-[400px] translate-x-0 bg-background border-r border-border
  transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden
  shadow-2xl z-20 relative">

  <!-- Header -->
  <div class="flex-col items-stretch gap-4 p-8 border-none">
    <div class="flex justify-between items-start">
      <h1 class="text-[26px] font-header font-medium text-text-main leading-tight mb-2">
        Page Title
      </h1>
      <div class="flex gap-1">
        <!-- Icon buttons go here -->
      </div>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto p-8 pt-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
    <!-- Sections go here -->
  </div>
</aside>
```

## Collapsible Sections (Accordions)

Use Tenor Sans headers with chevron rotation and smooth grid-row animation:

```html
<div class="border-b border-border last:border-0">
  <button class="w-full flex items-center justify-between py-5 px-1 group focus:outline-none select-none">
    <!-- Title changes to text-primary when open -->
    <span class="font-header text-[15px] uppercase tracking-[0.1em] text-text-main transition-colors group-hover:text-primary">
      Section Title
    </span>
    <!-- Chevron rotates 180deg when open -->
    <svg class="w-5 h-5 text-text-muted transition-transform duration-200 rotate-180 text-primary">
      <!-- ChevronDown icon -->
    </svg>
  </button>

  <!-- Animate open/closed with grid rows -->
  <!-- Open: grid-rows-[1fr] opacity-100 pb-6 -->
  <!-- Closed: grid-rows-[0fr] opacity-0 -->
  <div class="grid transition-all duration-300 ease-in-out grid-rows-[1fr] opacity-100 pb-6">
    <div class="overflow-hidden min-h-0">
      <!-- Section content -->
    </div>
  </div>
</div>
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

Toggle a `dark` class on the `<html>` or `<body>` element. All colors automatically update through CSS custom properties.

```js
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
