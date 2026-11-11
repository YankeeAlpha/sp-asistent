import serverHandler from '../../server.js';
import { Readable } from 'node:stream';

export default async function handler(request, context) {
  try {
    const url = new URL(request.url);
    let normalizedPath = url.pathname;
    if (normalizedPath.startsWith('/.netlify/functions/api')) {
      normalizedPath = normalizedPath.replace(/^\/\.netlify\/functions\/api/, '/api');
    }

    const method = request.method || 'GET';
    let bodyBuffer = Buffer.alloc(0);
    if (method !== 'GET' && method !== 'HEAD') {
      const ab = await request.arrayBuffer();
      bodyBuffer = Buffer.from(ab);
    }

    const reqHeaders = {};
    for (const [k, v] of request.headers.entries()) {
      reqHeaders[k.toLowerCase()] = v;
    }

    const req = new Readable();
    req._read = () => {};
    req.push(bodyBuffer);
    req.push(null);
    req.url = normalizedPath + url.search;
    req.method = method;
    req.headers = reqHeaders;
    if (bodyBuffer.length > 0) {
      req.body = bodyBuffer.toString('utf-8');
    }

    let statusCode = 200;
    const resHeaders = {};
    const chunks = [];

    const resPromise = new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
        getHeader(k) { return resHeaders[k.toLowerCase()]; },
        writeHead(code, headers) {
          statusCode = code;
          if (headers) {
            for (const [hk, hv] of Object.entries(headers)) {
              resHeaders[hk.toLowerCase()] = hv;
            }
          }
        },
        write(chunk) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        },
        end(chunk) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          resolve({
            statusCode: res.statusCode || statusCode,
            headers: resHeaders,
            body: Buffer.concat(chunks)
          });
        }
      };

      try {
        serverHandler(req, res).catch(reject);
      } catch (err) {
        reject(err);
      }
    });

    const result = await resPromise;
    const isNoContent = result.statusCode === 204 || result.statusCode === 304;

    return new Response(isNoContent ? null : result.body, {
      status: result.statusCode,
      headers: result.headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: ["/api/*", "/.netlify/functions/api/*"]
};
