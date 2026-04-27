require("module-alias/register");

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const reportPath = path.join(projectRoot, "validation-report.json");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function syntaxCheck(filePath) {
  const check = spawnSync(process.execPath, ["--check", filePath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  return {
    ok: check.status === 0,
    message: (check.stderr || check.stdout || "").trim(),
  };
}

function resolveLocalModule(filePath, request) {
  const basePath = path.resolve(path.dirname(filePath), request);
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.json`,
    path.join(basePath, "index.js"),
    path.join(basePath, "index.json"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function dependencyCheck(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const regex = /\brequire\((['"])(\.[^'"]+)\1\)/g;
  const missing = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const request = match[2];
    const resolved = resolveLocalModule(filePath, request);

    if (!resolved) {
      missing.push(request);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

if (!fs.existsSync(sourceRoot)) {
  console.error(`Diretorio nao encontrado: ${sourceRoot}`);
  process.exit(1);
}

const files = walk(sourceRoot);
const results = [];
let hasErrors = false;

for (const filePath of files) {
  const syntax = syntaxCheck(filePath);
  const dependencies = dependencyCheck(filePath);
  const relativePath = path
    .relative(projectRoot, filePath)
    .replaceAll("\\", "/");
  const ok = syntax.ok && dependencies.ok;

  if (!ok) {
    hasErrors = true;
  }

  results.push({
    file: relativePath,
    ok,
    syntax,
    dependencies,
  });

  if (ok) {
    console.log(`[OK] ${relativePath}`);
  } else {
    console.log(`[FAIL] ${relativePath}`);

    if (!syntax.ok && syntax.message) {
      console.log(syntax.message);
    }

    if (!dependencies.ok) {
      console.log(`Missing local imports: ${dependencies.missing.join(", ")}`);
    }
  }
}

fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalFiles: files.length,
      failedFiles: results.filter((result) => !result.ok).length,
      results,
    },
    null,
    2,
  ),
);

if (hasErrors) {
  process.exit(1);
}

console.log(`Validated ${files.length} file(s) successfully.`);
