import { describe, it, expect } from 'vitest';

describe('MatchSuggestion type', () => {
    it('should represent a match between bid and ask', () => {
        const match: import('../types').MatchSuggestion = {
            id: 'abc-123',
            bid_order_id: 'bid-1',
            ask_order_id: 'ask-1',
            score: 85.5,
            match_reasons: ['fuel_type_match', 'region_match', 'price_overlap'],
            status: 'SUGGESTED',
            recipient_org_id: 'org-1',
            created_at: '2026-02-12T10:00:00Z',
        };
        expect(match.score).toBeGreaterThan(80);
        expect(match.match_reasons).toContain('fuel_type_match');
    });
});
