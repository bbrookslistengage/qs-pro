## Frontend Error Handling

All HTTP error handling is centralized in the Axios interceptors (`apps/web/src/services/api.ts`). **Do not add custom error handling unless absolutely necessary.**

### Centralized Error Handling

The API client handles these scenarios automatically:

| Scenario | Behavior | Location |
|----------|----------|----------|
| **401 Unauthorized** | Attempts token refresh, retries request once | Response interceptor |
| **401 after refresh** | Clears auth state, shows toast, redirects to login | Response interceptor |
| **SEAT_LIMIT_EXCEEDED** | Shows specific toast message | Response interceptor |
| **CSRF Token** | Auto-attached to POST/PUT/PATCH/DELETE | Request interceptor |

### Using the API Client

```typescript
import api from '@/services/api';

// ✅ Just make the call - errors are handled
const response = await api.get('/metadata');

// ✅ In TanStack Query - errors bubble to error boundaries
const { data, error } = useQuery({
  queryKey: ['metadata'],
  queryFn: () => api.get('/metadata').then(res => res.data),
});

// ✅ Handle specific error codes in UI if needed
const { mutate } = useMutation({
  mutationFn: (data) => api.post('/queries', data),
  onError: (error) => {
    if (error.response?.data?.type === 'urn:qpp:error:rate-limit-exceeded') {
      // Show rate limit specific UI
    }
    // Other errors already show toast via interceptor
  },
});
```

### What NOT to Do

```typescript
// ❌ BAD: Custom 401 handling
api.get('/data').catch(error => {
  if (error.response?.status === 401) {
    logout(); // Interceptor already handles this!
  }
});

// ❌ BAD: Ad-hoc fetch calls
const response = await fetch('/api/metadata'); // Bypasses interceptors!

// ❌ BAD: Manual CSRF token
api.post('/data', payload, {
  headers: { 'X-CSRF-Token': token }, // Interceptor does this!
});

// ❌ BAD: Generic error toast everywhere
try {
  await api.post('/queries', data);
} catch (error) {
  toast.error('Something went wrong'); // May duplicate interceptor toast
}
```

### When Custom Handling IS Needed

Only add custom error handling for **business-specific UI responses**:

```typescript
// ✅ OK: Show inline validation errors from RFC 9457 violations
const { mutate } = useMutation({
  mutationFn: executeQuery,
  onError: (error: AxiosError<ProblemDetails>) => {
    if (error.response?.data?.violations) {
      // Show violations in editor gutter, not just toast
      setEditorErrors(error.response.data.violations);
    }
  },
});

// ✅ OK: Conditional UI based on error type
if (error.response?.data?.type === 'urn:qpp:error:mce-auth-expired') {
  // Show "reconnect MCE" button instead of generic error
}
```

### Error Response Format

Backend returns RFC 9457 Problem Details:

```typescript
interface ProblemDetails {
  type: string;         // "urn:qpp:error:mce-validation-failed"
  title: string;        // "Query Validation Failed"
  status: number;       // 400
  detail: string;       // User-facing message
  instance: string;     // Request path
  violations?: string[];// For validation errors
  field?: string;       // Specific field
  retryAfter?: number;  // Rate limit cooldown
}
```

### Toast Notifications

Use `sonner` for toast notifications:

```typescript
import { toast } from 'sonner';

// ✅ For custom business messages
toast.error('Query execution failed');
toast.success('Query saved successfully');

// ❌ Don't duplicate what interceptors already show
// 401 → "Session expired. Please log in again."
// SEAT_LIMIT_EXCEEDED → "Your organization has reached its seat limit"
```

### Auth State

Auth state is managed by `useAuthStore`. The API interceptor updates it automatically on 401:

```typescript
// Don't manually call logout() on 401 - interceptor handles it
// Only use for explicit user-initiated logout
const { logout } = useAuthStore();
```
