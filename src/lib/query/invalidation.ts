import type { QueryClient } from '@tanstack/react-query';

export function clearPrivateQueries(client: QueryClient): void {
    // cancelQueries detaches the retryer synchronously; a late transport result
    // cannot apply to the removed query even when it ignores AbortSignal.
    void client.cancelQueries({ queryKey: ['private'] });
    client.removeQueries({ queryKey: ['private'] });
}
