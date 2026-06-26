import server from '../dist/server/index.js';

function getRequestUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  return new URL(req.url ?? '/', `${protocol}://${host}`);
}

function getRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  return req;
}

function getRequestHeaders(req) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, value);
    }
  }

  return headers;
}

function writeResponse(res, response) {
  res.statusCode = response.status;
  const getSetCookie = response.headers.getSetCookie?.() ?? [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    res.setHeader(key, value);
  });

  if (getSetCookie.length > 0) {
    res.setHeader('set-cookie', getSetCookie);
  }

  if (!response.body) {
    res.end();
    return;
  }

  return response.body.pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
      abort(error) {
        res.destroy(error);
      },
    }),
  );
}

export default async function handler(req, res) {
  const request = new Request(getRequestUrl(req), {
    method: req.method,
    headers: getRequestHeaders(req),
    body: getRequestBody(req),
    duplex: 'half',
  });

  const response = await server.fetch(request);
  await writeResponse(res, response);
}
