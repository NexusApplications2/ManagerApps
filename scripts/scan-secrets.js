"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const ignoredSegments = new Set([
  ".git",
  "node_modules",
  "releases",
  "coverage",
  "dist",
  "build",
  ".cache",
]);
const ignoredFiles = new Set(["package-lock.json", "validation-report.json"]);

const patterns = [
  {
    name: "Discord bot token",
    regex:
      /["'][A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,}["']/g,
  },
  {
    name: "MongoDB URI with credentials",
    regex: /mongodb(?:\+srv)?:\/\/[^:\s/@]+:[^@\s]+@/gi,
  },
  {
    name: "Private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: "Non-empty token env assignment",
    regex:
      /(?:^|\s)(?:BOT_TOKEN|DISCORD_TOKEN|SHARED_BOT_TOKEN|ACCESS_TOKEN|CLIENT_SECRET|SECRET|PASSWORD)\s*=\s*["']?([^"'\s#][^"'\r\n#]*)["']?/gim,
  },
];

const allowList = [
  "APP_USR-token",
  "Bearer token-123",
  "bot-token",
  "new-token",
  "DISCORD_TOKEN=",
  "BOT_TOKEN=",
  "SHARED_BOT_TOKEN=",
  "ACCESS_TOKEN=",
  "PASSWORD=",
  "SECRET=",
];

function shouldSkip(filePath) {
  const relativeParts = path.relative(projectRoot, filePath).split(path.sep);
  return (
    relativeParts.some((part) => ignoredSegments.has(part)) ||
    ignoredFiles.has(path.basename(filePath))
  );
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (shouldSkip(fullPath)) {
      return [];
    }

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return entry.isFile() ? [fullPath] : [];
  });
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function isAllowed(matchText) {
  return allowList.some((allowed) => matchText.includes(allowed));
}

const findings = [];

for (const filePath of walk(projectRoot)) {
  const buffer = fs.readFileSync(filePath);

  if (isBinary(buffer)) {
    continue;
  }

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);
  const relativePath = path.relative(projectRoot, filePath).replaceAll("\\", "/");

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;

    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const matchText = match[0];

      if (isAllowed(matchText)) {
        continue;
      }

      const lineNumber =
        content.slice(0, match.index).split(/\r?\n/).length;
      const line = lines[lineNumber - 1].trim();

      findings.push({
        file: relativePath,
        line: lineNumber,
        pattern: pattern.name,
        sample: line.slice(0, 160),
      });
    }
  }
}

if (findings.length) {
  console.error("Potential secrets found:");

  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.pattern}] ${finding.sample}`,
    );
  }

  process.exit(1);
}

console.log("No obvious secrets found.");
