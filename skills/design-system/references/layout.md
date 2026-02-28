# Layout & Global Styles Reference

Detailed HTML patterns for layout components and global styles in the Architectural Minimalist design system.

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
