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

function avoidStaticFetchFlag() {
  return {
    name: "avoid-static-fetch-flag",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = rewriteFetchCalls(chunk.code);
        }
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [avoidStaticFetchFlag()],
  build: {
    modulePreload: false,
  },
});

export { rewriteFetchCalls };
