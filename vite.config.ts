import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { catalogCacheOptions } from './lib/cache/catalog-policy';

export default defineConfig({
  plugins: [
    patchCssModules({ exportMode: "default" }),
    vinext({ cache: { data: kvDataAdapter(catalogCacheOptions) } }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path.relative(import.meta.dirname, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
      },
    },
  },
});
