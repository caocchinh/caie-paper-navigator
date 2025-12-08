import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");

// Files to copy to dist
const filesToCopy = ["manifest.json", "popup.css"];

// Copy files to dist
filesToCopy.forEach((file) => {
  const src = resolve(rootDir, file);
  const dest = resolve(distDir, file);
  copyFileSync(src, dest);
  console.log(`✓ Copied ${file} to dist/`);
});

// Inject popup.css link into index.html
const indexPath = resolve(distDir, "index.html");
let indexHtml = readFileSync(indexPath, "utf-8");

const popupCssLink = '<link rel="stylesheet" href="/popup.css">';

// Check if the link already exists to avoid duplicates
if (!indexHtml.includes("popup.css")) {
  // Insert before </head>
  indexHtml = indexHtml.replace("</head>", `    ${popupCssLink}\n  </head>`);
  writeFileSync(indexPath, indexHtml);
  console.log("✓ Injected popup.css link into dist/index.html");
} else {
  console.log("ℹ popup.css link already exists in dist/index.html");
}

console.log("\n✅ Post-build complete!");
