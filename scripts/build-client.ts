import fs from "fs";
import path from "path";
import { transformSync } from "esbuild";

const rootDir = path.resolve(__dirname, "..");
const clientDir = path.join(rootDir, "src", "client");
const publicScriptsDir = path.join(rootDir, "public", "client-scripts");

const DOM_READY_SHIM = `// Auto-compiled from TypeScript (src/client/*.ts)
(function() {
  const w = window as any;
  if (!w.__domReadyShimInstalled) {
    w.__domReadyShimInstalled = true;
    w.__domReadyQueue = w.__domReadyQueue || [];
    const origAdd = document.addEventListener.bind(document);
    document.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === "DOMContentLoaded") {
        if (w.__scriptsLoading) {
          w.__domReadyQueue.push(listener);
          return;
        }
        if (document.readyState !== "loading") {
          setTimeout(() => {
            if (typeof listener === "function") {
              listener(new Event("DOMContentLoaded"));
            } else if (listener && typeof listener.handleEvent === "function") {
              listener.handleEvent(new Event("DOMContentLoaded"));
            }
          }, 0);
          return;
        }
      }
      return origAdd(type, listener, options);
    };
  }
})();
`;

function compileDir(subDir: string) {
  const srcSubDir = path.join(clientDir, subDir);
  const outSubDir = path.join(publicScriptsDir, subDir);
  if (!fs.existsSync(srcSubDir)) return;

  fs.mkdirSync(outSubDir, { recursive: true });

  for (const file of fs.readdirSync(srcSubDir)) {
    if (!file.endsWith(".ts")) continue;
    const srcPath = path.join(srcSubDir, file);
    const outFile = file.replace(/\.ts$/, ".js");
    const outPath = path.join(outSubDir, outFile);

    const sourceCode = DOM_READY_SHIM + "\n" + fs.readFileSync(srcPath, "utf8");
    const result = transformSync(sourceCode, {
      loader: "ts",
      target: "es2020",
      charset: "utf8",
    });

    fs.writeFileSync(outPath, result.code, "utf8");
    console.log(`Compiled src/client/${subDir}/${file} -> public/client-scripts/${subDir}/${outFile}`);
  }
}

compileDir("api");
compileDir("components");
