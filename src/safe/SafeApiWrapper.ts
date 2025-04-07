import type { PrefixedAddress } from "../config/index.js";
import { AltAPI } from "./AltAPI.js";
import { BaseApi } from "./BaseApi.js";
import { ClassicAPI } from "./ClassicAPI.js";
import type { SafeAPIMode } from "./schema.js";
import type { ISafeAPI } from "./types.js";

const methods = ["fetchAll", "fetchLatest", "fetchDetailed"] as Array<
  keyof ISafeAPI
>;

export class SafeApiWrapper extends BaseApi implements ISafeAPI {
  readonly #classic: ISafeAPI;
  readonly #alt: ISafeAPI;

  constructor(safe: PrefixedAddress, mode: SafeAPIMode = "fallback") {
    super(safe);
    this.#classic = new ClassicAPI(safe);
    this.#alt = new AltAPI(safe);
    for (const m of methods) {
      this[m] = async (...args: Parameters<ISafeAPI[typeof m]>) => {
        if (mode === "classic") {
          return this.#classic[m](...args);
        } else if (mode === "alt") {
          return this.#alt[m](...args);
        } else {
          try {
            const classic = await Promise.resolve(this.#classic[m](...args));
            return classic;
          } catch (e) {
            this.logger.error(e);
            this.logger.warn("falling back to alternative api");
            const alt = await Promise.resolve(this.#alt[m](...args));
            return alt;
          }
        }
      };
    }
  }
}
