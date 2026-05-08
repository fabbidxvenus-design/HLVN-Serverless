# Multi-API-Key Fallback (Backend-Managed)

## Rule

Backend API MUST manage multiple API keys for external services (OpenRouter) and implement automatic fallback when one key fails. Frontend calls backend proxy endpoints, NOT direct external APIs.

## Architecture

```
Mobile App / Dashboard (Frontend)
    ↓
Backend API (Vercel Functions / Lambda)
    ↓
API Key Manager
    ↓ (try key 1)
External Service (OpenRouter)
    ↓ (if fails, try key 2)
External Service (OpenRouter)
```

## Backend Implementation

```typescript
// Backend: API Key Manager
const API_KEYS = [
  process.env.OPENROUTER_KEY_1,
  process.env.OPENROUTER_KEY_2,
  process.env.OPENROUTER_KEY_3,
].filter(Boolean);

async function callWithFallback<T>(
  apiCall: (apiKey: string, keyIndex: number) => Promise<T>
): Promise<{ result: T; keyIndex: number }> {
  let lastError: Error | null = null;

  for (let i = 0; i < API_KEYS.length; i++) {
    const keyIndex = i + 1;
    const apiKey = API_KEYS[i];

    try {
      console.log(`[API] Trying key ${keyIndex}...`);
      const result = await apiCall(apiKey, keyIndex);
      console.log(`[API] Success with key ${keyIndex}`);
      return { result, keyIndex };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[API] Key ${keyIndex} failed: ${lastError.message}`);

      // Don't try next key if it's a non-retryable error
      if (lastError.message.includes('INVALID_API_KEY') || 
          lastError.message.includes('401')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('All API keys failed');
}
```

## Frontend Implementation

```typescript
// Frontend: Call backend proxy (NOT direct external API)
async function processOCR(imageBlob: Blob) {
  const formData = new FormData();
  formData.append('image', imageBlob);

  const response = await fetch('/api/ocr/process', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR failed: ${response.status}`);
  }

  return response.json();
}
```

## Why

**Problem**: Mobile app exposes API keys in client-side bundle (security risk). Single key can hit rate limits or fail.

**Solution**: Backend manages keys securely, tries multiple keys automatically. Frontend only needs user auth token.

**Benefits**:
- Keys never exposed to client
- Automatic failover increases reliability
- Centralized key rotation
- Usage tracking per key
- Rate limit distribution across keys

## How to Apply

### Backend Setup
1. Store API keys in environment variables (Vercel/AWS Secrets Manager)
2. Implement `callWithFallback()` wrapper for external API calls
3. Log which key was used for billing/debugging
4. Return key index in response metadata (optional)

### Frontend Setup
1. Call backend proxy endpoints (`/api/ocr/process`, `/api/scans/list`, etc.)
2. Include user auth token in `Authorization` header
3. Handle backend errors (don't retry on 401/403)
4. Show user-friendly error messages

### Key Rotation
1. Add new key to environment variables
2. Deploy backend with new key in array
3. Monitor usage distribution
4. Remove old key after migration

## Exceptions

- **Development**: Allow direct API calls with dev key for local testing
- **Emergency**: Provide admin override to force specific key (for debugging)

---

**Source**: Adapted from `ocr-mobile-web/src/lib/gemini.ts::processOCR()` multi-key pattern  
**Architecture change**: Moved from client-side to backend for security  
**Last updated**: 2026-05-08
