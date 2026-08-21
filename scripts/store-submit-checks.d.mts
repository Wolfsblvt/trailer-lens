interface Verdict {
  verdict: 'proceed' | 'refuse' | 'succeeded' | 'in-progress' | 'ok' | 'fail';
  reason?: string;
  state?: string;
  warnings?: unknown[];
}
export function assessPreflight(status: unknown, publisherId: string, itemId: string): Verdict;
export function assessUpload(response: unknown, publisherId: string, itemId: string, version: string): Verdict;
export function assessAsyncUpload(status: unknown, publisherId: string, itemId: string): Verdict;
export function assessPublish(response: unknown, publisherId: string, itemId: string): Verdict;
export function assessSubmission(status: unknown, publisherId: string, itemId: string, version: string): Verdict;
