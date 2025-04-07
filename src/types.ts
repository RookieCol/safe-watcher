import type { Address } from "viem";

import type { ListedSafeTx, SafeTx, Signer } from "./safe/index.js";

export type EventType = "created" | "updated" | "executed" | "malicious";

export interface Event {
  chainPrefix: string;
  safe: Address;
  type: EventType;
  tx: SafeTx<Signer>;
  pending: ListedSafeTx[];
}

export interface INotificationSender {
  notify: (event: Event) => Promise<void>;
}

export interface INotifier {
  send: (event: Event) => void | Promise<void>;
}
