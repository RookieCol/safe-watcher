import type { Address } from "viem";

/**
 * See multi_send_call_only.sol here
 * https://docs.safe.global/advanced/smart-account-supported-networks?service=Transaction+Service&page=2&expand=1
 */
export const MULTISEND_CALL_ONLY = new Set<Address>([
  "0x9641d764fc13c8b624c04430c7356c1c7c8102e2",
  "0x40a2accbd92bca938b02010e17a5b8929b49130d",
]);
