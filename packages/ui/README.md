# @repo/ui

Shared UI component library built with shadcn/ui and Tailwind CSS.

## Setup

This package uses shadcn/ui components built on top of Radix UI and Tailwind CSS.

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

## Structure

```
src/
├── components/
│   └── ui/              # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── index.ts
├── lib/
│   ├── utils.ts         # cn() utility function
│   └── index.ts
├── styles/
│   └── globals.css      # Tailwind CSS with shadcn/ui variables
└── index.ts             # Main exports
```

## Usage

### In Next.js Apps

1. Import the global styles in your app:

```tsx
// app/layout.tsx or app/globals.css
import "@repo/ui/src/styles/globals.css";
```

2. Use components:

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello World</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding New Components

To add new shadcn/ui components:

1. Use the shadcn CLI (if configured):
```bash
npx shadcn@latest add [component-name]
```

2. Or manually copy from [shadcn/ui](https://ui.shadcn.com/docs/components) and place in `src/components/ui/`

3. Export from `src/components/ui/index.ts`

## Configuration

- **Tailwind Config**: `tailwind.config.ts`
- **PostCSS Config**: `postcss.config.js`
- **shadcn Config**: `components.json`
- **TypeScript Paths**: Configured with `@/*` alias pointing to `src/*`

## Components

### Button

```tsx
import { Button } from "@repo/ui";

<Button variant="default" size="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

## Utilities

### cn() - Class Name Utility

```tsx
import { cn } from "@repo/ui/lib/utils";

<div className={cn("base-class", condition && "conditional-class")} />
```

## Theming

The package uses CSS variables for theming. Dark mode is supported via the `dark` class.

Customize colors in `src/styles/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}
```

## Dependencies

- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx & tailwind-merge**: Class name utilities
- **lucide-react**: Icon library

