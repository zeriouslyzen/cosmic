export const MAX_BODY_BYTES = 1024 * 1024;

export function isProduction(env = process.env) {
    return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

export function getAllowedOrigin(env = process.env) {
    return env.ALLOWED_ORIGIN || env.VITE_SITE_URL || null;
}

export function setCorsHeaders(req, res, env = process.env) {
    const allowed = getAllowedOrigin(env);
    const origin = req.headers?.origin;

    if (!isProduction(env) || !allowed) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin === allowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
}

export function sanitizeApiError(error, env = process.env) {
    console.error(error);
    if (isProduction(env)) {
        return { error: 'Request failed' };
    }
    return { error: 'Request failed', message: error.message };
}

export function resolveTrustedOrigin(origin, env = process.env) {
    const allowed = getAllowedOrigin(env);
    const normalized = origin?.replace(/\/$/, '') || '';

    if (allowed) {
        const allowedNormalized = allowed.replace(/\/$/, '');
        if (normalized && normalized !== allowedNormalized) {
            return allowedNormalized;
        }
        return allowedNormalized;
    }

    if (isProduction(env)) {
        throw new Error('ALLOWED_ORIGIN is not configured');
    }

    return normalized || 'http://localhost:5173';
}

export function isValidStripeSessionId(sessionId) {
    return typeof sessionId === 'string' && /^cs_[a-zA-Z0-9_]+$/.test(sessionId);
}

export function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
    return new Promise((resolve, reject) => {
        let data = '';
        let size = 0;

        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            data += chunk;
        });

        req.on('end', () => {
            if (!data) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', reject);
    });
}
