# Testing - Best Practices

## Apa Itu Testing?

Testing adalah proses memastikan kode berjalan sesuai harapan. Ada beberapa level testing:

- **Unit Test**: Test fungsi/komponen individual
- **Integration Test**: Test interaksi antar komponen
- **E2E Test**: Test alur lengkap dari perspektif user

## Kapan Digunakan?

Dalam project SedekahMap:
- Unit test untuk utility functions dan hooks
- Integration test untuk API routes
- E2E test untuk alur kritis (login, request akses, dll)

---

## Rules Utama

### DO's (Lakukan)

1. **Test behavior, bukan implementation**
2. **Gunakan nama test yang deskriptif**
3. **Satu test = satu assertion utama**
4. **Mock external dependencies**

### DON'T's (Hindari)

1. **Jangan test library pihak ketiga**
2. **Jangan test implementation details**
3. **Jangan buat test yang flaky (kadang pass kadang fail)**

---

## Setup Testing

### Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test  # untuk E2E
```

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Unit Testing

### Test Utility Function

```typescript
// lib/utils/formatCurrency.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
```

```typescript
// lib/utils/formatCurrency.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from './formatCurrency'

describe('formatCurrency', () => {
  it('formats number to IDR currency', () => {
    expect(formatCurrency(1000000)).toBe('Rp 1.000.000')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('Rp 0')
  })

  it('handles decimal numbers', () => {
    expect(formatCurrency(1500.5)).toContain('1.500')
  })
})
```

### Test dengan Mocking

```typescript
// lib/utils/distance.ts
import distance from '@turf/distance'
import { point } from '@turf/helpers'

export function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const fromPoint = point([from.lng, from.lat])
  const toPoint = point([to.lng, to.lat])
  return distance(fromPoint, toPoint)
}
```

```typescript
// lib/utils/distance.test.ts
import { describe, it, expect } from 'vitest'
import { calculateDistance } from './distance'

describe('calculateDistance', () => {
  it('calculates distance between two points', () => {
    const jakarta = { lat: -6.2088, lng: 106.8456 }
    const bandung = { lat: -6.9175, lng: 107.6191 }
    
    const dist = calculateDistance(jakarta, bandung)
    
    // Jakarta - Bandung sekitar 120-130 km
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(150)
  })

  it('returns 0 for same location', () => {
    const loc = { lat: -6.2088, lng: 106.8456 }
    
    const dist = calculateDistance(loc, loc)
    
    expect(dist).toBe(0)
  })
})
```

---

## Component Testing

### Test React Component

```typescript
// components/Button.tsx
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
```

```typescript
// components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button label="Click me" onClick={handleClick} />)
    
    fireEvent.click(screen.getByText('Click me'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button label="Click me" onClick={handleClick} disabled />)
    
    fireEvent.click(screen.getByText('Click me'))
    
    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

### Test Component dengan State

```typescript
// components/Counter.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from './Counter'

describe('Counter', () => {
  it('increments count when button clicked', () => {
    render(<Counter />)
    
    const button = screen.getByRole('button', { name: /tambah/i })
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    
    fireEvent.click(button)
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })
})
```

### Test Async Component

```typescript
// components/UserList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { UserList } from './UserList'

// Mock fetch
global.fetch = vi.fn()

describe('UserList', () => {
  it('shows loading state initially', () => {
    render(<UserList />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays users after fetch', async () => {
    const mockUsers = [
      { id: '1', nama: 'John' },
      { id: '2', nama: 'Jane' },
    ]
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    } as Response)
    
    render(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    
    render(<UserList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

## Integration Testing (API Routes)

```typescript
// app/api/warga/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}))

describe('GET /api/warga', () => {
  it('returns list of warga', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(db.select().from).mockResolvedValueOnce([
      { id: '1', nama: 'Test Warga' },
    ])
    
    const request = new NextRequest('http://localhost:3000/api/warga')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].nama).toBe('Test Warga')
  })
})

describe('POST /api/warga', () => {
  it('creates new warga', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(db.insert().values().returning).mockResolvedValueOnce([
      { id: '1', nama: 'New Warga' },
    ])
    
    const request = new NextRequest('http://localhost:3000/api/warga', {
      method: 'POST',
      body: JSON.stringify({ nama: 'New Warga', alamat: 'Test' }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(201)
    expect(data.nama).toBe('New Warga')
  })
})
```

---

## E2E Testing dengan Playwright

### Setup Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Selamat datang')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Email atau password salah')).toBeVisible()
  })
})
```

```typescript
// e2e/peta.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Peta Page', () => {
  test('displays map', async ({ page }) => {
    await page.goto('/peta')
    
    // Wait for map to load
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('shows heatmap data', async ({ page }) => {
    await page.goto('/peta')
    
    // Check heatmap layer exists
    await expect(page.locator('.leaflet-heatmap-layer')).toBeVisible()
  })
})
```

---

## Test Patterns

### Arrange-Act-Assert (AAA)

```typescript
it('calculates total correctly', () => {
  // Arrange - setup data
  const items = [
    { price: 100, qty: 2 },
    { price: 50, qty: 3 },
  ]
  
  // Act - execute
  const total = calculateTotal(items)
  
  // Assert - verify
  expect(total).toBe(350)
})
```

### Given-When-Then (BDD Style)

```typescript
describe('Cart', () => {
  describe('given items in cart', () => {
    describe('when checkout is clicked', () => {
      it('then shows payment form', () => {
        // test implementation
      })
    })
  })
})
```

---

## Kesalahan Umum

### 1. Test Implementation Details
```typescript
// SALAH - test implementation
it('sets state correctly', () => {
  const { result } = renderHook(() => useState(0))
  expect(result.current[0]).toBe(0)  // Testing internal state
})

// BENAR - test behavior
it('increments counter when clicked', () => {
  render(<Counter />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('1')).toBeInTheDocument()
})
```

### 2. Tidak Cleanup Mocks
```typescript
// Tambahkan di beforeEach atau afterEach
beforeEach(() => {
  vi.clearAllMocks()
})
```

### 3. Test yang Terlalu Besar
```typescript
// SALAH - satu test terlalu banyak assertion
it('does everything', () => {
  // 20 assertions...
})

// BENAR - split menjadi test yang fokus
it('validates email format', () => { /* ... */ })
it('validates password length', () => { /* ... */ })
it('shows success message on valid form', () => { /* ... */ })
```

---

## Referensi

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Kent C. Dodds Testing Blog](https://kentcdodds.com/blog?q=testing)
