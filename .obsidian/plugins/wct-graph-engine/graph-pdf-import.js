"use strict";

const path = require("path");
const { spawn } = require("child_process");
const obsidianApi = globalThis.__WCT_OBSIDIAN_API__;
if (!obsidianApi?.Notice) {
  throw new Error("WCT PDF importer did not receive the Obsidian API.");
}
const { Notice } = obsidianApi;

function pluginFile(plugin, filename) {
  const adapter = plugin.app.vault.adapter;
  const dir = plugin.manifest.dir ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
  const relative = `${dir}/${filename}`.replace(/\\/g, "/");
  if (typeof adapter.getFullPath === "function") return adapter.getFullPath(relative);
  if (typeof adapter.getBasePath === "function") return path.join(adapter.getBasePath(), ...relative.split("/"));
  throw new Error("WCT PDF importer could not resolve its plugin directory.");
}

function vaultRoot(plugin) {
  const adapter = plugin.app.vault.adapter;
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  if (typeof adapter.getFullPath === "function") return adapter.getFullPath("");
  throw new Error("WCT PDF importer requires a local desktop vault.");
}

function execute(command, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONUTF8: "1" },
    });
    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const consume = (chunk, isError) => {
      const text = chunk.toString("utf8");
      if (isError) {
        stderr += text;
        stderrBuffer += text;
      } else {
        stdout += text;
        stdoutBuffer += text;
      }
      let buffer = isError ? stderrBuffer : stdoutBuffer;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      if (isError) stderrBuffer = buffer;
      else stdoutBuffer = buffer;
      for (const line of lines) if (line.trim()) onLine?.(line.trim(), isError);
    };

    child.stdout?.on("data", (chunk) => consume(chunk, false));
    child.stderr?.on("data", (chunk) => consume(chunk, true));
    child.on("error", reject);
    child.on("close", (code) => {
      if (stdoutBuffer.trim()) onLine?.(stdoutBuffer.trim(), false);
      if (stderrBuffer.trim()) onLine?.(stderrBuffer.trim(), true);
      resolve({ code: Number(code ?? -1), stdout, stderr });
    });
  });
}

async function findPython(script, args, cwd, onLine) {
  const candidates = process.platform === "win32"
    ? [
      { command: "py", prefix: ["-3"] },
      { command: "python", prefix: [] },
      { command: "python3", prefix: [] },
    ]
    : [
      { command: "python3", prefix: [] },
      { command: "python", prefix: [] },
      { command: "py", prefix: ["-3"] },
    ];

  const errors = [];
  for (const candidate of candidates) {
    try {
      return await execute(candidate.command, [...candidate.prefix, script, ...args], cwd, onLine);
    } catch (error) {
      if (error?.code === "ENOENT") {
        errors.push(`${candidate.command}: not found`);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Python was not found. Tried ${errors.join(", ")}. Install Python 3 or add it to PATH.`);
}

function importArgs(plugin, options = {}) {
  const settings = plugin.settings ?? {};
  const args = [
    "--vault", vaultRoot(plugin),
    "--output", settings.pdfDerivationOutputFolder ?? "Research/08 Derivations/PDF",
    "--max-sections", String(settings.pdfDerivationMaxSections ?? 10),
    "--max-pages-per-section", String(settings.pdfDerivationMaxPages ?? 5),
  ];
  if (options.refresh) args.push("--refresh");
  if (options.paper) args.push("--paper", options.paper);
  return args;
}

function conciseFailure(result) {
  const combined = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim();
  const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(-5).join(" · ") || `Importer exited with code ${result.code}`;
}

async function openReport(plugin) {
  const folder = plugin.settings?.pdfDerivationOutputFolder ?? "Research/08 Derivations/PDF";
  const report = `${folder}/_PDF Derivation Import Report`;
  await plugin.app.workspace.openLinkText(report, "", true);
}

async function runPdfImporter(plugin, options = {}) {
  if (plugin.pdfImportRunning) {
    new Notice("WCT PDF derivation import is already running.");
    return;
  }
  plugin.pdfImportRunning = true;
  const script = pluginFile(plugin, "wct_pdf_derivations.py");
  const cwd = vaultRoot(plugin);
  const notice = new Notice("Starting PDF derivation import…", 0);
  try {
    const result = await findPython(script, importArgs(plugin, options), cwd, (line, isError) => {
      console[isError ? "warn" : "log"](`[WCT PDF] ${line}`);
      notice.setMessage?.(`PDF derivations: ${line.slice(0, 170)}`);
    });

    plugin.rebuildViews?.();

    if (result.code === 0) {
      notice.setMessage?.("PDF derivations imported. Opening the current-state report…");
      setTimeout(() => notice.hide?.(), 4500);
      await openReport(plugin);
      return;
    }

    if (result.code === 1 && result.stdout.includes("Completed:")) {
      notice.setMessage?.("PDF import completed with some failed papers. Opening the report…");
      setTimeout(() => notice.hide?.(), 6500);
      await openReport(plugin);
      return;
    }

    const failure = conciseFailure(result);
    notice.hide?.();
    new Notice(`PDF derivation import failed: ${failure}`, 12000);
    throw new Error(failure);
  } catch (error) {
    notice.hide?.();
    console.error("WCT PDF derivation import failed", error);
    const message = String(error?.message ?? error);
    const dependencyHint = /pymupdf|extractor|fitz|pypdf|pdftotext/i.test(message)
      ? " Install the extractor with: py -m pip install pymupdf"
      : "";
    new Notice(`WCT PDF derivation import failed: ${message}.${dependencyHint}`, 15000);
  } finally {
    plugin.pdfImportRunning = false;
  }
}

module.exports = {
  runPdfImporter,
  openReport,
};