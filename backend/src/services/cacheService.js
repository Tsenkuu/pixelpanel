import { LRUCache } from 'lru-cache';

// Extreme Performance: Global API Cache to guarantee < 20ms response times
// Maximum of 500 items, TTL of 5 minutes
const apiCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 5,
    // Size calculation for memory bounding (< 50MB RAM target)
    maxSize: 10 * 1024 * 1024, // Limit cache memory to ~10MB
    sizeCalculation: (value, key) => {
        return (typeof value === 'string' ? value.length : JSON.stringify(value).length) + key.length;
    }
});

export class CacheService {
    /**
     * Express Middleware for caching API responses
     */
    static cacheMiddleware(req, res, next) {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl || req.url;
        const cachedBody = apiCache.get(key);
        
        if (cachedBody) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedBody);
        }

        res.setHeader('X-Cache', 'MISS');
        
        // Intercept res.json to populate the cache
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Don't cache errors
            if (res.statusCode >= 200 && res.statusCode < 300) {
                apiCache.set(key, body);
            }
            originalJson(body);
        };
        
        next();
    }

    /**
     * Manually invalidate a cache key (e.g. after a POST/PUT/DELETE)
     */
    static invalidate(prefix) {
        // Iterate and delete keys starting with the prefix
        for (const key of apiCache.keys()) {
            if (key.startsWith(prefix)) {
                apiCache.delete(key);
            }
        }
    }
}
