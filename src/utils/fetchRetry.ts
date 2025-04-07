import { sleep } from "./sleep.js";

const DEFAULT_RETRIES = 5;
const DEFAULT_RETRY_INTERVAL = 1000;

interface RetrySettings {
  retries?: number;
  retryInterval?: number;
  validateResponse?: (response: Response) => void;
}

export async function fetchRetry(
  input: string | URL,
  init: RequestInit & RetrySettings = {},
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    retryInterval = DEFAULT_RETRY_INTERVAL,
    validateResponse,
    ...options
  } = init;
  try {
    const response = await fetch(input, options);
    validateResponse?.(response);
    return response;
  } catch (e: any) {
    if (retries > 0) {
      await sleep(retryInterval);
      return fetchRetry(input, {
        ...options,
        retries: retries - 1,
        retryInterval,
        validateResponse,
      });
    } else {
      throw e;
    }
  }
}
