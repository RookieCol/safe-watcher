import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  outExtension: {
    ".js": ".mjs",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  banner: {
    js: `
      import { createRequire } from 'module';
      import { fileURLToPath } from 'url';
      import path from 'path';
      const require = createRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
    `,
  },
});
