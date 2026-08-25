import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const isWatch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  external: [
    "better-sqlite3",
    "electron",
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  sourcemap: false,
  minify: false,
  logLevel: "info",
} as const;

const mainConfig = {
  ...commonOptions,
  entryPoints: [path.join(root, "electron/main.ts")],
  outfile: path.join(root, "dist-electron/main.js"),
};

const preloadConfig = {
  ...commonOptions,
  entryPoints: [path.join(root, "electron/preload.ts")],
  outfile: path.join(root, "dist-electron/preload.js"),
};

async function main() {
  if (isWatch) {
    await Promise.all([
      build({ ...mainConfig, watch: true }),
      build({ ...preloadConfig, watch: true }),
    ]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([
      build(mainConfig),
      build(preloadConfig),
    ]);
    console.log("Main + preload bundled successfully");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
