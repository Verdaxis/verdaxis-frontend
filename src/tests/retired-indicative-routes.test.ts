import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { api } from '../services/api';

/**
 * The indicative request-for-quote, negotiation and supplier-offer routes are
 * retired: the backend answers 404 for each of them. No shipped source file may
 * request one, so no screen can reach a retired route.
 */
const RETIRED_OPERATIONS = [
    ['POST', '/rfq'],
    ['GET', '/rfq'],
    ['GET', '/rfq/{rfq_id}'],
    ['POST', '/rfq/{rfq_id}/quote'],
    ['PUT', '/rfq/{rfq_id}/quotes/{quote_id}'],
    ['POST', '/rfq/{rfq_id}/quotes/{quote_id}/withdraw'],
    ['POST', '/rfq/{rfq_id}/accept/{quote_id}'],
    ['POST', '/rfq/{rfq_id}/cancel'],
    ['POST', '/negotiations'],
    ['GET', '/negotiations'],
    ['GET', '/negotiations/{negotiation_id}'],
    ['POST', '/negotiations/{negotiation_id}/counter'],
    ['POST', '/negotiations/{negotiation_id}/accept'],
    ['POST', '/negotiations/{negotiation_id}/decline'],
    ['GET', '/supplier-offers'],
    ['GET', '/supplier-offers/my'],
    ['GET', '/supplier-offers/{offer_id}'],
    ['POST', '/supplier-offers'],
    ['PUT', '/supplier-offers/{offer_id}'],
    ['POST', '/supplier-offers/{offer_id}/withdraw'],
] as const;

const SOURCE_ROOT = join(process.cwd(), 'src');

// Tests and the generated OpenAPI types describe the backend contract; they do not call it.
const isShippedSource = (path: string) => /\.(ts|tsx)$/.test(path)
    && !/\.d\.ts$/.test(path)
    && !/\.test\.(ts|tsx)$/.test(path)
    && !path.includes('/__tests__/')
    && !path.startsWith('tests/')
    && !path.startsWith('api/generated/');

function shippedSourceFiles(directory: string): { path: string; text: string }[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) return shippedSourceFiles(absolute);
        const path = relative(SOURCE_ROOT, absolute);
        return isShippedSource(path) ? [{ path, text: readFileSync(absolute, 'utf8') }] : [];
    });
}

const PATH_PARAMETER = '(?:\\$\\{[^`]*?\\}|[^/\'"`\\s?$]+)';

/** Matches the path as the opening of a string or template literal, with or without the `/api` prefix. */
function literalPathPattern(template: string): RegExp {
    const body = template.split('/').filter(Boolean)
        .map(segment => (segment.startsWith('{') ? PATH_PARAMETER : segment))
        .join('/');
    return new RegExp(`['"\`](?:/api)?/${body}(?=['"\`?#])`);
}

describe('retired indicative routes', () => {
    const sources = shippedSourceFiles(SOURCE_ROOT);

    it('scans the shipped source', () => {
        expect(sources.length).toBeGreaterThan(100);
        expect(sources.some(source => source.path === 'services/api.ts')).toBe(true);
    });

    it.each(RETIRED_OPERATIONS)('no source file requests %s %s', (_method, path) => {
        const pattern = literalPathPattern(path);
        const callers = sources.filter(source => pattern.test(source.text)).map(source => source.path);
        expect(callers).toEqual([]);
    });

    it('no source file builds a path under a retired resource', () => {
        const retiredResource = /['"`](?:\/api)?\/(?:rfq|negotiations|supplier-offers)(?![\w-])/;
        const callers = sources.filter(source => retiredResource.test(source.text)).map(source => source.path);
        expect(callers).toEqual([]);
    });

    it('no source file uses a retired API client namespace', () => {
        const clientNamespace = /\bapi\s*\.\s*(?:rfq|negotiations|supplierOffers)\b/;
        const callers = sources.filter(source => clientNamespace.test(source.text)).map(source => source.path);
        expect(callers).toEqual([]);
        expect(Object.keys(api)).not.toEqual(expect.arrayContaining(['rfq']));
        expect(api).not.toHaveProperty('rfq');
        expect(api).not.toHaveProperty('negotiations');
        expect(api).not.toHaveProperty('supplierOffers');
    });

    it('no source file links to a retired screen', () => {
        const retiredScreen = /history_offers|history_my_offers|history_rfqs|view=requests|\/app\/rfqs/;
        const callers = sources.filter(source => retiredScreen.test(source.text)).map(source => source.path);
        expect(callers).toEqual([]);
    });
});
