import type { Hash } from "viem";

import type { PrefixedAddress } from "../config/index.js";
import { AltAPI } from "./AltAPI.js";
import { BaseApi } from "./BaseApi.js";
import { ClassicAPI } from "./ClassicAPI.js";
import type { SafeAPIMode } from "./schema.js";
import type { ISafeAPI, ListedSafeTx, SafeTx } from "./types.js";

// Chains that don't support AltAPI (Safe Client Gateway)
const CLASSIC_API_ONLY_CHAINS = ["trsk", "rsk_testnet"];

export class SafeApiWrapper extends BaseApi implements ISafeAPI {
  readonly #classic: ISafeAPI;
  readonly #alt: ISafeAPI;
  readonly #mode: SafeAPIMode;
  readonly #useClassicOnly: boolean;

  constructor(safe: PrefixedAddress, mode: SafeAPIMode = "fallback") {
    super(safe);
    this.#classic = new ClassicAPI(safe);
    this.#alt = new AltAPI(safe);
    this.#mode = mode;
    // Force classic API mode for chains that don't support the Client Gateway
    this.#useClassicOnly = CLASSIC_API_ONLY_CHAINS.includes(this.prefix);
  }

  public async fetchAll(): Promise<ListedSafeTx[]> {
    // Force classic mode for unsupported chains
    if (this.#useClassicOnly) {
      return this.#classic.fetchAll();
    }

    if (this.#mode === "classic") {
      return this.#classic.fetchAll();
    } else if (this.#mode === "alt") {
      return this.#alt.fetchAll();
    } else {
      try {
        return await this.#classic.fetchAll();
      } catch (e) {
        this.logger.error(e);
        this.logger.warn("falling back to alternative api");
        return this.#alt.fetchAll();
      }
    }
  }

  public async fetchLatest(): Promise<ListedSafeTx[]> {
    // Force classic mode for unsupported chains
    if (this.#useClassicOnly) {
      return this.#classic.fetchLatest();
    }

    if (this.#mode === "classic") {
      return this.#classic.fetchLatest();
    } else if (this.#mode === "alt") {
      return this.#alt.fetchLatest();
    } else {
      try {
        return await this.#classic.fetchLatest();
      } catch (e) {
        this.logger.error(e);
        this.logger.warn("falling back to alternative api");
        return this.#alt.fetchLatest();
      }
    }
  }

  public async fetchDetailed(safeTxHash: Hash): Promise<SafeTx<Hash>> {
    // Force classic mode for unsupported chains
    if (this.#useClassicOnly) {
      return this.#classic.fetchDetailed(safeTxHash);
    }

    if (this.#mode === "classic") {
      return this.#classic.fetchDetailed(safeTxHash);
    } else if (this.#mode === "alt") {
      return this.#alt.fetchDetailed(safeTxHash);
    } else {
      try {
        return await this.#classic.fetchDetailed(safeTxHash);
      } catch (e) {
        this.logger.error(e);
        this.logger.warn("falling back to alternative api");
        return this.#alt.fetchDetailed(safeTxHash);
      }
    }
  }
}
