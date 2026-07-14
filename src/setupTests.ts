import '@testing-library/jest-dom';
import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';

global.fetch = vi.fn((url: string | URL | Request) => {
  const urlStr = url.toString();
  if (urlStr.startsWith('/campaigns/')) {
    const filePath = path.join(process.cwd(), 'public', urlStr);
    if (!fs.existsSync(filePath)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/html' }),
        json: () => { throw new SyntaxError(`Unexpected token '<', "<!doctype "... is not valid JSON`); },
        text: () => Promise.resolve('<!doctype html>')
      } as any);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(JSON.parse(content))
    } as any);
  }
  return Promise.reject(new Error(`Unhandled fetch: ${urlStr}`));
});
