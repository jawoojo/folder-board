// [ID 6.0] Obsidian 플러그인 esbuild 번들 설정
// -> TypeScript 소스를 옵시디언 런타임이 직접 로드할 수 있는 단일 CommonJS main.js로 빌드함.
import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr"
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js"
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
