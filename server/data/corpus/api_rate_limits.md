# API Rate Limits

| Plan | Requests per minute | Burst |
|------|---------------------|-------|
| Starter | 60 | 100 |
| Growth | 300 | 500 |
| Enterprise | 2000 | 3000 |

Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) are returned
on every API response. When exceeded, the API returns HTTP 429 with a
`Retry-After` header expressed in seconds.
