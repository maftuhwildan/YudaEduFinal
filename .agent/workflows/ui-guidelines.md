---
description: UI development guidelines - ALWAYS use ShadcnUI components
---

# UI Development Guidelines

## ⚠️ MANDATORY: Use ShadcnUI Components

When creating or modifying UI in this project, you MUST:

1. **Always use ShadcnUI components** from `@/components/ui/`
2. **Never use raw HTML elements** for interactive components
3. **Never use other UI libraries** (Material UI, Chakra, Ant Design, etc.)

## Available ShadcnUI Components

Check `components/ui/` folder for installed components. Common ones:
- `Button` - All buttons
- `Card` - Container cards
- `Dialog` - Modals and popups
- `Input` - Text inputs
- `Select` - Dropdowns
- `Tabs` - Tab navigation
- `Table` - Data tables
- `ScrollArea` - Scrollable containers
- `Label` - Form labels
- `Switch` - Toggle switches
- `Progress` - Progress bars
- `Separator` - Dividers

## Adding New Components

If a component doesn't exist, add it:
```bash
npx shadcn add <component-name>
```

## Import Pattern

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
```

## Styling

- Use Tailwind CSS classes
- Use `cn()` from `@/lib/utils` for conditional classes
- Follow existing color scheme (CSS variables in globals.css)
- Use Framer Motion (`motion`) for animations

## Example: Creating a New Feature

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function MyFeature() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Title</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter name" />
          </div>
          <Button>Submit</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## ❌ DON'T DO THIS

```tsx
// ❌ Wrong - raw HTML button
<button className="bg-blue-500 px-4 py-2">Click</button>

// ❌ Wrong - other UI library
import { Button } from "@mui/material"

// ❌ Wrong - inline styles
<div style={{ padding: '20px' }}>
```

## ✅ DO THIS

```tsx
// ✅ Correct - ShadcnUI Button
import { Button } from "@/components/ui/button"
<Button variant="default">Click</Button>

// ✅ Correct - Tailwind classes
<div className="p-5">
```
