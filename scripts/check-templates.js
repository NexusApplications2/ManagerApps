"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const templatesRoot = path.join(projectRoot, "templates");

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return entry.isFile() && fullPath.endsWith(".js") ? [fullPath] : [];
  });
}

const files = walk(templatesRoot).sort((a, b) => a.localeCompare(b));
let failed = false;

for (const filePath of files) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  const relativePath = path.relative(projectRoot, filePath).replaceAll("\\", "/");

  if (result.status === 0) {
    console.log(`[OK] ${relativePath}`);
    continue;
  }

  failed = true;
  console.log(`[FAIL] ${relativePath}`);
  console.log((result.stderr || result.stdout || "").trim());
}

if (failed) {
  process.exit(1);
}

console.log(`Validated ${files.length} template file(s) successfully.`);
