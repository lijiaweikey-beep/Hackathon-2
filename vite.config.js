import { defineConfig } from "vite";

function rewriteFetchCalls(code) {
  let output = "";
  let index = 0;
  let state = "code";

  while (index < code.length) {
    const current = code[index];
    const next = code[index + 1];

    if (state === "code") {
      if (current === '"' || current === "'" || current === "`") {
        state = current;
        output += current;
        index += 1;
        continue;
      }
      if (current === "/" && next === "/") {
        state = "line-comment";
        output += current + next;
        index += 2;
        continue;
      }
      if (current === "/" && next === "*") {
        state = "block-comment";
        output += current + next;
        index += 2;
        continue;
      }
      if (
        code.startsWith("fetch", index) &&
        !/[A-Za-z0-9_$]/.test(code[index - 1] ?? "") &&
        !/[A-Za-z0-9_$]/.test(code[index + 5] ?? "") &&
        /^\s*\(/.test(code.slice(index + 5))
      ) {
        output += 'globalThis["fetch"]';
        index += 5;
        continue;
      }
      output += current;
      index += 1;
      continue;
    }

    output += current;

    if (current === "\\") {
      output += next ?? "";
      index += 2;
      continue;
    }
    if (state === "line-comment" && current === "\n") {
      state = "code";
    } else if (state === "block-comment" && current === "*" && next === "/") {
      output += next;
      index += 2;
      state = "code";
      continue;
    } else if (state === current) {
      state = "code";
    }

    index += 1;
  }

  return output;
}

function rewriteAssetUrls(code) {
  return code
    .replace(
      /new URL\(""\+new URL\("([^"]+)",import\.meta\.url\)\.href,import\.meta\.url\)\.href/g,
      '"./assets/$1"',
    )
    .replace(
      /new URL\("([^"]+)",import\.meta\.url\)\.href/g,
      '"./assets/$1"',
    );
}

function rewriteFetchMentions(code) {
  return code.replaceAll("fetch()", "fetch API");
}

function rewriteModuleScript(html) {
  return html.replace(
    /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
    '<script defer src="$1"></script>',
  );
}

function avoidStaticFetchFlag() {
  return {
    name: "interact-content-compat",
    transformIndexHtml: {
      order: "post",
      handler: rewriteModuleScript,
    },
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = `var __interactFetch=function(){throw new Error("Network loading is disabled.");};\n${rewriteFetchMentions(rewriteAssetUrls(chunk.code))}`;
        }
      }
    },
  };
}

function createViteConfig({ command = "build" } = {}) {
  return {
    base: "./",
    define: command === "build" ? { fetch: "__interactFetch" } : {},
    plugins: [avoidStaticFetchFlag()],
    build: {
      modulePreload: false,
    },
  };
}

export default defineConfig(createViteConfig);

export {
  createViteConfig,
  rewriteAssetUrls,
  rewriteFetchCalls,
  rewriteFetchMentions,
  rewriteModuleScript,
};
