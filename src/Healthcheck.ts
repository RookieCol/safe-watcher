import { createServer } from "node:http";

import { formatDuration, intervalToDuration } from "date-fns";
import { customAlphabet } from "nanoid";

import logger from "./logger.js";

const nanoid = customAlphabet("1234567890abcdef", 8);

class Healthcheck {
  #id = nanoid();
  #version?: string;
  #start = Math.round(new Date().valueOf() / 1000);

  public async run(): Promise<void> {
    this.#version = process.env.PACKAGE_VERSION || "dev";
    const server = createServer(async (req, res) => {
      // Routing
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            uptime: formatDuration(
              intervalToDuration({ start: this.#start, end: new Date() }),
            ),
          }),
        );
      } else if (req.url === "/metrics") {
        try {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(this.#metrics());
        } catch (ex) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("error");
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
      }
    });

    server.listen(4000, () => {
      logger.info("started healthcheck");
    });
  }

  /**
   * Returns metrics in prometheus format
   * https://prometheus.io/docs/concepts/data_model/
   */
  #metrics(): string {
    const labels = Object.entries({
      instance_id: this.#id,
      version: this.#version,
    })
      .map(([k, v]) => `${k}="${v}"`)
      .join(", ");
    return `# HELP service_up Simple binary flag to indicate being alive
# TYPE service_up gauge
service_up{${labels}} 1

# HELP start_time Start time, in unixtime
# TYPE start_time gauge
start_time{${labels}} ${this.#start}
`;
  }
}
export default Healthcheck;
