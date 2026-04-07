# Tailwind CSS - Best Practices

## Apa Itu Tailwind CSS?

Tailwind CSS adalah framework CSS yang menggunakan pendekatan "utility-first". Alih-alih menulis CSS custom, kita menggunakan class-class kecil yang sudah disediakan langsung di HTML/JSX.

**Contoh:**
```html
<!-- Tanpa Tailwind (CSS biasa) -->
<div class="card">...</div>
<style>.card { padding: 16px; border-radius: 8px; }</style>

<!-- Dengan Tailwind -->
<div class="p-4 rounded-lg">...</div>
```

## Kapan Digunakan?

Dalam project SedekahMap:
- Semua styling komponen UI
- Responsive design
- Dark mode (jika ada)
- Animasi sederhana

---

## Rules Utama

### DO's (Lakukan)

1. **Gunakan design system yang konsisten** (spacing, colors)
2. **Ekstrak komponen untuk pattern yang berulang**
3. **Mobile-first approach** (styling mobile dulu)
4. **Gunakan `@apply` untuk class yang sangat berulang**

### DON'T's (Hindari)

1. **Jangan inline style jika bisa pakai Tailwind**
2. **Jangan buat class custom jika Tailwind sudah ada**
3. **Jangan overuse `!important`** (prefix `!` di Tailwind)

---

## Pattern & Contoh Kode

### Spacing (Padding & Margin)

```tsx
// Padding
<div className="p-4">    {/* padding: 16px (semua sisi) */}
<div className="px-4">   {/* padding-left & right: 16px */}
<div className="py-2">   {/* padding-top & bottom: 8px */}
<div className="pt-4">   {/* padding-top: 16px */}
<div className="pb-4">   {/* padding-bottom: 16px */}
<div className="pl-4">   {/* padding-left: 16px */}
<div className="pr-4">   {/* padding-right: 16px */}

// Margin (sama pattern-nya)
<div className="m-4">    {/* margin: 16px */}
<div className="mx-auto">{/* margin-left & right: auto (center) */}
<div className="mt-8">   {/* margin-top: 32px */}
<div className="-mt-4">  {/* margin-top: -16px (negative) */}

// Spacing scale:
// 0 = 0px, 1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px
// 5 = 20px, 6 = 24px, 8 = 32px, 10 = 40px, 12 = 48px
// 16 = 64px, 20 = 80px, 24 = 96px
```

### Sizing (Width & Height)

```tsx
// Fixed width
<div className="w-4">     {/* 16px */}
<div className="w-64">    {/* 256px */}
<div className="w-full">  {/* 100% */}
<div className="w-screen">{/* 100vw */}
<div className="w-1/2">   {/* 50% */}
<div className="w-1/3">   {/* 33.33% */}

// Height
<div className="h-screen"> {/* 100vh */}
<div className="h-full">   {/* 100% */}
<div className="min-h-screen"> {/* min-height: 100vh */}

// Max width (untuk container)
<div className="max-w-md">  {/* 448px */}
<div className="max-w-lg">  {/* 512px */}
<div className="max-w-xl">  {/* 576px */}
<div className="max-w-4xl"> {/* 896px */}
<div className="max-w-7xl"> {/* 1280px */}
```

### Colors

```tsx
// Background
<div className="bg-white">
<div className="bg-gray-100">
<div className="bg-blue-500">
<div className="bg-red-600">

// Text color
<p className="text-gray-900">   {/* Hitam */}
<p className="text-gray-600">   {/* Abu-abu */}
<p className="text-blue-500">   {/* Biru */}
<p className="text-white">

// Border color
<div className="border border-gray-300">
<div className="border-2 border-blue-500">

// Opacity
<div className="bg-black/50">   {/* 50% opacity */}
<div className="bg-blue-500/75">{/* 75% opacity */}

// Color scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
// 50 = paling terang, 950 = paling gelap
```

### Typography

```tsx
// Font size
<p className="text-xs">    {/* 12px */}
<p className="text-sm">    {/* 14px */}
<p className="text-base">  {/* 16px (default) */}
<p className="text-lg">    {/* 18px */}
<p className="text-xl">    {/* 20px */}
<p className="text-2xl">   {/* 24px */}
<p className="text-4xl">   {/* 36px */}

// Font weight
<p className="font-light">    {/* 300 */}
<p className="font-normal">   {/* 400 */}
<p className="font-medium">   {/* 500 */}
<p className="font-semibold"> {/* 600 */}
<p className="font-bold">     {/* 700 */}

// Text alignment
<p className="text-left">
<p className="text-center">
<p className="text-right">

// Line height
<p className="leading-tight">  {/* 1.25 */}
<p className="leading-normal"> {/* 1.5 */}
<p className="leading-loose">  {/* 2 */}

// Text decoration
<p className="underline">
<p className="line-through">
<p className="no-underline">
```

### Flexbox

```tsx
// Container flex
<div className="flex">           {/* display: flex */}
<div className="flex flex-col">  {/* flex-direction: column */}
<div className="flex flex-row">  {/* flex-direction: row (default) */}

// Alignment
<div className="flex items-center">    {/* align-items: center */}
<div className="flex items-start">     {/* align-items: flex-start */}
<div className="flex items-end">       {/* align-items: flex-end */}

<div className="flex justify-center">  {/* justify-content: center */}
<div className="flex justify-between"> {/* justify-content: space-between */}
<div className="flex justify-end">     {/* justify-content: flex-end */}

// Gap (jarak antar item)
<div className="flex gap-4">     {/* gap: 16px */}
<div className="flex gap-x-4">   {/* column-gap: 16px */}
<div className="flex gap-y-2">   {/* row-gap: 8px */}

// Flex item properties
<div className="flex-1">     {/* flex: 1 1 0% (grow) */}
<div className="flex-none">  {/* flex: none (don't grow/shrink) */}
<div className="flex-shrink-0"> {/* flex-shrink: 0 */}

// Contoh: Header dengan logo kiri, menu kanan
<header className="flex items-center justify-between px-4 py-2">
  <div>Logo</div>
  <nav className="flex gap-4">
    <a href="#">Home</a>
    <a href="#">About</a>
  </nav>
</header>
```

### Grid

```tsx
// Grid container
<div className="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 kolom di mobile, 2 di tablet, 3 di desktop */}
</div>

// Column span
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2">Span 2 kolom</div>
  <div>Normal</div>
  <div>Normal</div>
</div>
```

### Responsive Design

```tsx
// Breakpoints:
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

// Mobile-first approach (tanpa prefix = mobile)
<div className="
  w-full          /* Mobile: full width */
  md:w-1/2        /* Tablet: half width */
  lg:w-1/3        /* Desktop: third width */
">

// Contoh: Card yang responsive
<div className="
  p-4 
  md:p-6 
  lg:p-8
  text-sm 
  md:text-base 
  lg:text-lg
">
  Content
</div>

// Hide/show berdasarkan screen
<div className="hidden md:block">  {/* Hidden di mobile, visible di md+ */}
<div className="block md:hidden">  {/* Visible di mobile, hidden di md+ */}
```

### Borders & Rounded

```tsx
// Border width
<div className="border">       {/* 1px */}
<div className="border-2">     {/* 2px */}
<div className="border-4">     {/* 4px */}
<div className="border-t">     {/* border-top only */}
<div className="border-b-2">   {/* border-bottom 2px */}

// Border radius
<div className="rounded">      {/* 4px */}
<div className="rounded-md">   {/* 6px */}
<div className="rounded-lg">   {/* 8px */}
<div className="rounded-xl">   {/* 12px */}
<div className="rounded-2xl">  {/* 16px */}
<div className="rounded-full"> {/* 9999px (circle) */}

// Per corner
<div className="rounded-t-lg"> {/* top corners */}
<div className="rounded-b-lg"> {/* bottom corners */}
<div className="rounded-tl-lg">{/* top-left only */}
```

### Shadow & Effects

```tsx
// Box shadow
<div className="shadow-sm">
<div className="shadow">
<div className="shadow-md">
<div className="shadow-lg">
<div className="shadow-xl">
<div className="shadow-2xl">
<div className="shadow-none">

// Opacity
<div className="opacity-50">  {/* 50% */}
<div className="opacity-75">  {/* 75% */}
<div className="opacity-100"> {/* 100% */}
```

### States (Hover, Focus, Active)

```tsx
// Hover
<button className="bg-blue-500 hover:bg-blue-600">
  Hover me
</button>

// Focus
<input className="border focus:border-blue-500 focus:ring-2 focus:ring-blue-200">

// Active
<button className="bg-blue-500 active:bg-blue-700">

// Disabled
<button className="bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed">

// Group hover (parent hover affects child)
<div className="group">
  <p className="group-hover:text-blue-500">
    Berubah warna saat parent di-hover
  </p>
</div>
```

### Transitions & Animations

```tsx
// Basic transition
<button className="
  bg-blue-500 
  hover:bg-blue-600 
  transition-colors 
  duration-200
">
  Smooth color change
</button>

// Transition all
<div className="transition-all duration-300 ease-in-out">

// Scale on hover
<div className="transform hover:scale-105 transition-transform">

// Built-in animations
<div className="animate-spin">    {/* Loading spinner */}
<div className="animate-pulse">   {/* Skeleton loading */}
<div className="animate-bounce">  {/* Bouncing */}
```

---

## Component Patterns

### Button Component

```tsx
// components/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

function Button({ 
  variant = 'primary', 
  size = 'md', 
  children,
  onClick,
  disabled 
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2'
  
  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

### Card Component

```tsx
// components/Card.tsx
function Card({ 
  title, 
  children 
}: { 
  title: string
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      <div className="text-gray-600">
        {children}
      </div>
    </div>
  )
}
```

---

## Kesalahan Umum

### 1. Class Order yang Tidak Konsisten
```tsx
// SALAH: acak
<div className="mt-4 flex text-white bg-blue-500 p-4 rounded items-center">

// BENAR: terurut (layout > spacing > sizing > typography > colors > effects)
<div className="flex items-center p-4 mt-4 text-white bg-blue-500 rounded">
```

### 2. Hardcode Breakpoint di JS
```tsx
// SALAH
if (window.innerWidth > 768) { ... }

// BENAR: gunakan Tailwind responsive classes
<div className="hidden md:block">
```

### 3. Inline Style untuk yang Ada di Tailwind
```tsx
// SALAH
<div style={{ padding: '16px', marginTop: '8px' }}>

// BENAR
<div className="p-4 mt-2">
```

---

## Referensi

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Headless UI](https://headlessui.com/) - Komponen accessible untuk Tailwind
