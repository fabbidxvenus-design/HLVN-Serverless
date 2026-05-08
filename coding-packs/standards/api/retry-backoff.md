# API Retry with Exponential Backoff

## Rule

All API calls to external services (OpenRouter, Supabase) MUST implement retry logic with exponential backoff for transient errors (503, 429, network timeouts).

## Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  retryableErrors: ['503', '429', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE', 'ETIMEDOUT']
};
```

## Implementation

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error instanceof Error && 
        RETRY_CONFIG.retryableErrors.some(code => 
          error.message.includes(code)
        );
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * RETRY_CONFIG.baseDelay;
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return fn(); // Final attempt
}
```

## Usage

```typescript
// Example: API call with retry
const result = await retryWithBackoff(async () => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`API_ERROR_${response.status}`);
  }
  
  return response.json();
});
```

## Why

**Problem**: External APIs (OpenRouter, Supabase) can experience transient failures (503 service unavailable, 429 rate limit). Failing immediately wastes user time and creates poor UX.

**Solution**: Exponential backoff gives the service time to recover while avoiding thundering herd. 3 retries with 1s, 2s, 4s delays = 7s total wait, acceptable for serverless backend.

## How to Apply

- Use `retryWithBackoff()` wrapper for all external API calls
- Log retry attempts for debugging
- Only retry transient errors (503, 429, timeouts)
- Do NOT retry client errors (400, 401, 404)
- Do NOT retry on final attempt (throw immediately)

## Exceptions

- **Auth endpoints**: Do NOT retry 401 (invalid credentials) - fail fast
- **Idempotent operations only**: Only retry GET/PUT/DELETE, not POST (unless idempotency key used)
- **Lambda timeout**: Ensure total retry time < Lambda timeout (default 30s)

---

**Source**: Adapted from `ocr-mobile-web/src/lib/gemini.ts::retryWithBackoff()`  
**Last updated**: 2026-05-08
