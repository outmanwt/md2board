#!/usr/bin/env node

/**
 * md2board Generator Script
 * Transforms any structured Markdown specification into a standalone,
 * interactive, 4-level drilldown md2board HTML dashboard.
 *
 * Usage:
 *   node generate_deck.js <markdown-path> [--output <output-html>]
 *   node generate_deck.js progress.md --output dashboard.html
 */

const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log(`
md2board Generator (CLI)
=========================
Usage:
  node generate_deck.js <markdown-file> [options]

Options:
  --output, -o    Output HTML file path (default: index.html)
  --template, -t  Custom HTML template path (optional)
  --help, -h      Show this help message

Examples:
  node generate_deck.js progress.md
  node generate_deck.js spec.md --output ./dist/dashboard.html
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let markdownPath = null;
  let outputPath = 'index.html';
  let templatePath = path.resolve(__dirname, '../assets/template.html');

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i];
    } else if (arg === '--template' || arg === '-t') {
      templatePath = args[++i];
    } else if (!arg.startsWith('-') && !markdownPath) {
      markdownPath = arg;
    }
  }

  if (!markdownPath) {
    console.error('Error: Missing input Markdown file path.');
    printUsage();
    process.exit(1);
  }

  return { markdownPath, outputPath, templatePath };
}

function main() {
  const { markdownPath, outputPath, templatePath } = parseArgs();

  const absMarkdownPath = path.resolve(process.cwd(), markdownPath);
  if (!fs.existsSync(absMarkdownPath)) {
    console.error(`Error: Markdown file not found at: ${absMarkdownPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.error(`Error: md2board template file not found at: ${templatePath}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(absMarkdownPath, 'utf8');
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Safely escape the markdown for embedding inside a JS template literal in
  // an inline <script> block: backticks / ${} / backslashes break the literal,
  // and a literal "</script>" inside the markdown would terminate the host
  // script tag early — escape "<" as \u003c so the runtime string is unchanged.
  const safeMarkdown = markdownContent
    .replace(/\\/g, '\\\\')
    .replace(/</g, '\\u003c')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  const renderedHtml = templateContent.replace('__INITIAL_MARKDOWN__', safeMarkdown);

  const absOutputPath = path.resolve(process.cwd(), outputPath);
  const outputDir = path.dirname(absOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(absOutputPath, renderedHtml, 'utf8');

  console.log(`
[md2board] Generated successfully!
  Source: ${absMarkdownPath}
  Output: ${absOutputPath}
  File Size: ${(Buffer.byteLength(renderedHtml, 'utf8') / 1024).toFixed(1)} KB

You can open ${absOutputPath} directly in any modern browser.
`);
}

main();
