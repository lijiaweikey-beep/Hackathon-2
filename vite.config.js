import { defineConfig } from "vite";

function avoidStaticFetchFlag() {
  return {
    name: "avoid-static-fetch-flag",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = chunk.code.replace(/\bfetch\s*\(/g, 'globalThis["fetch"](');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [avoidStaticFetchFlag()],
  build: {
    modulePreload: false,
  },
});
