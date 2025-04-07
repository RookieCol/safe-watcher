import type { Address, Hash } from "viem";

export interface ISafeAPI {
  fetchAll: () => Promise<ListedSafeTx[]>;
  fetchLatest: () => Promise<ListedSafeTx[]>;
  fetchDetailed: (safeTxHash: Hash) => Promise<SafeTx<Address>>;
}

export interface Signer {
  address: Address;
  name?: string;
}

/**
 * Common response from different listing APIs
 */
export interface ListedSafeTx {
  safeTxHash: Hash;
  nonce: number;
  confirmations: number;
  confirmationsRequired: number;
  isExecuted: boolean;
}

/**
 * Common safe TX details that are used in notifications and can be obtained from any API
 */
export interface SafeTx<TSigner> {
  safeTxHash: Hash;
  nonce: number;
  to: Address;
  operation: number;
  proposer: TSigner;
  confirmations: TSigner[];
  confirmationsRequired: number;
  isExecuted: boolean;
}
