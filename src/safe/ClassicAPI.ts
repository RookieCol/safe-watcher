import type { Address, Hash } from "viem";

import { BaseApi } from "./BaseApi.js";
import type { ISafeAPI, ListedSafeTx, SafeTx } from "./types.js";

// export interface SafeMultisigTransactionResponse {
interface SafeMultisigTransaction {
  // safe: string;
  to: Address;
  // value: string;
  // data: string;
  operation: number;
  // gasToken: string;
  // safeTxGas: number;
  // baseGas: number;
  // gasPrice: string;
  // refundReceiver: string;
  nonce: number;
  executionDate?: string;
  submissionDate: string;
  // modified: Date;
  // blockNumber?: number;
  transactionHash: Hash;
  safeTxHash: Hash;
  // executor: string;
  isExecuted: boolean;
  // isSuccessful?: boolean;
  // ethGasPrice: string;
  // maxFeePerGas: string;
  // maxPriorityFeePerGas: string;
  // gasUsed?: number;
  // fee: string;
  // origin: string;
  // dataDecoded: DataDecoded;
  proposer: Address;
  confirmationsRequired: number;
  confirmations: SafeMultisigConfirmationResponse[];
  // trusted: boolean;
  // signatures: string;
}

// Rootstock API specific interfaces
interface RootstockTransactionResponse {
  next: string | null;
  previous: string | null;
  results: {
    type: string;
    transaction: RootstockTransaction;
    conflictType: string;
  }[];
}

interface RootstockTransaction {
  id: string; // Format: multisig_ADDRESS_SAFETXHASH
  txStatus: string; // "AWAITING_CONFIRMATIONS" | "SUCCESS" | etc.
  executionInfo: {
    type: string;
    nonce: number;
    confirmationsRequired: number;
    confirmationsSubmitted: number;
    missingSigners:
      | { value: Address; name: string | null; logoUri: string | null }[]
      | null;
  };
  txInfo: {
    to: { value: Address };
    type: string;
    transferInfo?: any;
    sender?: { value: Address; name: string | null; logoUri: string | null };
    recipient?: { value: Address; name: string | null; logoUri: string | null };
  };
  timestamp: number;
  txHash: string | null;
}

interface SafeMultisigConfirmationResponse {
  owner: Address;
  submissionDate: string;
  transactionHash?: Hash;
  signature: Hash;
  signatureType: string;
}

interface SafeMultisigTransactionData {
  /**
   * Total number of transactions
   */
  count: number;
  /**
   * URL to fetch next page
   */
  next?: string | null;
  /**
   * URL to fetch previos page
   */
  previous?: string | null;
  /**
   * Array of results, max 100 results
   */
  results?: SafeMultisigTransaction[];
  countUniqueNonce: number;
}

function normalizeListed(tx: SafeMultisigTransaction): ListedSafeTx {
  return {
    safeTxHash: tx.safeTxHash,
    nonce: tx.nonce,
    confirmations: tx.confirmations?.length ?? 0,
    confirmationsRequired: tx.confirmationsRequired,
    isExecuted: tx.isExecuted,
  };
}

// Extract safeTxHash from Rootstock transaction ID
function getSafeTxHashFromId(id: string): Hash {
  const parts = id.split("_");
  return parts[2] as Hash;
}

// Convert Rootstock transaction to our common format
function convertRootstockTransaction(tx: RootstockTransaction): ListedSafeTx {
  const safeTxHash = getSafeTxHashFromId(tx.id);

  return {
    safeTxHash,
    nonce: tx.executionInfo.nonce,
    confirmations: tx.executionInfo.confirmationsSubmitted,
    confirmationsRequired: tx.executionInfo.confirmationsRequired,
    isExecuted: tx.txStatus === "SUCCESS",
  };
}

// Special handling for Rootstock detailed transaction
function createRootstockDetailedTx(tx: RootstockTransaction): SafeTx<Address> {
  const safeTxHash = getSafeTxHashFromId(tx.id);
  const proposer =
    tx.txInfo.sender?.value ||
    ("0x0000000000000000000000000000000000000000" as Address);

  // Determine signers - proposer is a signer, and others would be derived from missing signers
  const allSignersRequired: Address[] = [];

  // Add proposer as a signer
  allSignersRequired.push(proposer);

  // Add missing signers if available
  if (tx.executionInfo.missingSigners) {
    tx.executionInfo.missingSigners.forEach(signer => {
      allSignersRequired.push(signer.value);
    });
  }

  // Calculate confirmed signers by removing missing signers from all required signers
  const confirmedSigners: Address[] = [];
  if (tx.executionInfo.confirmationsSubmitted > 0) {
    // At least the proposer has signed
    confirmedSigners.push(proposer);
  }

  return {
    safeTxHash,
    nonce: tx.executionInfo.nonce,
    to:
      tx.txInfo.recipient?.value ||
      ("0x0000000000000000000000000000000000000000" as Address),
    operation: 0, // Default to CALL operation
    proposer,
    confirmations: confirmedSigners,
    confirmationsRequired: tx.executionInfo.confirmationsRequired,
    isExecuted: tx.txStatus === "SUCCESS",
  };
}

function normalizeDetailed(tx: SafeMultisigTransaction): SafeTx<Address> {
  return {
    safeTxHash: tx.safeTxHash,
    nonce: tx.nonce,
    to: tx.to,
    operation: tx.operation,
    proposer: tx.proposer,
    confirmations: tx.confirmations.map(c => c.owner),
    confirmationsRequired: tx.confirmationsRequired,
    isExecuted: tx.isExecuted,
  };
}

// Special chains that use a different API format
const ROOTSTOCK_CHAINS = ["trsk", "rsk_testnet"];

const APIS: Record<string, string> = {
  arb1: "https://safe-transaction-arbitrum.safe.global",
  eth: "https://safe-transaction-mainnet.safe.global",
  gor: "https://safe-transaction-goerli.safe.global",
  oeth: "https://safe-transaction-optimism.safe.global",
  trsk: "https://gateway.safe.rootstock.io",
};

// Chain IDs for special chains
const CHAIN_IDS: Record<string, number> = {
  trsk: 31,
  rsk_testnet: 31,
};

export class ClassicAPI extends BaseApi implements ISafeAPI {
  readonly #txs = new Map<Hash, SafeMultisigTransaction>();

  public async fetchAll(): Promise<ListedSafeTx[]> {
    // Special case for Rootstock
    if (ROOTSTOCK_CHAINS.includes(this.prefix)) {
      return this.#fetchRootstockTransactions();
    }

    // Regular ClassicAPI flow
    let url: string | null | undefined;
    const results: SafeMultisigTransaction[] = [];
    do {
      const data = await this.#fetchMany(url);
      results.push(...(data.results ?? []));
      url = data.next;
    } while (url);
    for (const result of results) {
      this.#txs.set(result.safeTxHash, result);
    }
    return results.map(normalizeListed);
  }

  public async fetchLatest(): Promise<ListedSafeTx[]> {
    // Special case for Rootstock
    if (ROOTSTOCK_CHAINS.includes(this.prefix)) {
      return this.#fetchRootstockTransactions();
    }

    // Regular ClassicAPI flow
    const data = await this.#fetchMany();
    const txs = data.results ?? [];
    for (const tx of txs) {
      this.#txs.set(tx.safeTxHash, tx);
    }
    return txs.map(normalizeListed);
  }

  // Special method to fetch and parse Rootstock transactions
  async #fetchRootstockTransactions(): Promise<ListedSafeTx[]> {
    const chainId = CHAIN_IDS[this.prefix];
    const url = `${this.apiURL}/v1/chains/${chainId}/safes/${this.address}/multisig-transactions`;

    try {
      const data = (await this.fetch(url)) as RootstockTransactionResponse;
      return data.results.map(item =>
        convertRootstockTransaction(item.transaction),
      );
    } catch (e) {
      this.logger.error(e);
      return [];
    }
  }

  public async fetchDetailed(safeTxHash: Hash): Promise<SafeTx<Address>> {
    // For Rootstock, we can't easily fetch detailed transactions yet
    if (ROOTSTOCK_CHAINS.includes(this.prefix)) {
      return this.#fetchRootstockDetailed(safeTxHash);
    }

    // Regular ClassicAPI flow
    const cached = this.#txs.get(safeTxHash);
    if (cached) {
      return normalizeDetailed(cached);
    }
    const data = await this.#fetchOne(safeTxHash);
    this.#txs.set(data.safeTxHash, data);
    return normalizeDetailed(data);
  }

  // Fetch and process detailed transaction data for Rootstock
  async #fetchRootstockDetailed(safeTxHash: Hash): Promise<SafeTx<Address>> {
    try {
      // Try to find the transaction in the list
      const transactions = await this.#fetchRootstockTransactions();
      const matchingTx = transactions.find(tx => tx.safeTxHash === safeTxHash);

      if (matchingTx) {
        // We found it in the list, but we need to get the full details
        const chainId = CHAIN_IDS[this.prefix];
        const url = `${this.apiURL}/v1/chains/${chainId}/safes/${this.address}/multisig-transactions`;

        const data = (await this.fetch(url)) as RootstockTransactionResponse;
        const txData = data.results.find(
          item => getSafeTxHashFromId(item.transaction.id) === safeTxHash,
        )?.transaction;

        if (txData) {
          return createRootstockDetailedTx(txData);
        }
      }

      // Return minimal data if we couldn't find detailed info
      return {
        safeTxHash,
        nonce: 0,
        to: "0x0000000000000000000000000000000000000000" as Address,
        operation: 0,
        proposer: "0x0000000000000000000000000000000000000000" as Address,
        confirmations: [],
        confirmationsRequired: 0,
        isExecuted: false,
      };
    } catch (e) {
      this.logger.error(e);
      // Return minimal data on error
      return {
        safeTxHash,
        nonce: 0,
        to: "0x0000000000000000000000000000000000000000" as Address,
        operation: 0,
        proposer: "0x0000000000000000000000000000000000000000" as Address,
        confirmations: [],
        confirmationsRequired: 0,
        isExecuted: false,
      };
    }
  }

  async #fetchMany(url?: string | null): Promise<SafeMultisigTransactionData> {
    let u = url;
    if (!u) {
      // Special case for Rootstock chains
      if (ROOTSTOCK_CHAINS.includes(this.prefix)) {
        const chainId = CHAIN_IDS[this.prefix];
        u = `${this.apiURL}/v1/chains/${chainId}/safes/${this.address}/multisig-transactions`;
      } else {
        u = `${this.apiURL}/api/v1/safes/${this.address}/multisig-transactions/`;
      }
    }
    const data = await this.fetch(u);
    return data;
  }

  async #fetchOne(safeTxHash: Hash): Promise<SafeMultisigTransaction> {
    let url;
    // Special case for Rootstock chains
    if (ROOTSTOCK_CHAINS.includes(this.prefix)) {
      const chainId = CHAIN_IDS[this.prefix];
      url = `${this.apiURL}/v1/chains/${chainId}/transactions/${safeTxHash}`;
    } else {
      url = `${this.apiURL}/api/v1/safes/${this.address}/multisig-transactions/${safeTxHash}`;
    }
    const data = await this.fetch(url);
    return data;
  }

  private get apiURL(): string {
    const api = APIS[this.prefix];
    if (!api) {
      throw new Error(`no API URL for chain '${this.prefix}'`);
    }
    return api;
  }
}
