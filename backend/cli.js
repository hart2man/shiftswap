#!/usr/bin/env node
"use strict";

/**
 * ShiftSwap CLI (Week 1 Day 1)
 * Commands:
 *   node cli.js request --from 2026-01-12T07:00 --to 2026-01-12T15:00 --with "Jane Doe" --reason "Kid pickup"
 *   node cli.js list
 *   node cli.js approve --id <id>
 *   node cli.js deny --id <id>
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "requests.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ requests: [] }, null, 2));
}

function loadData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function usage() {
  console.log(`
ShiftSwap CLI

Commands:
  request --from <ISO> --to <ISO> --with "<name>" --reason "<text>"
  list
  approve --id <id>
  deny --id <id>

Examples:
  node cli.js request --from 2026-01-12T07:00 --to 2026-01-12T15:00 --with "Jane Doe" --reason "Kid pickup"
  node cli.js list
  node cli.js approve --id abc123
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

function isIsoLike(s) {
  // Simple guard; we’ll do better later
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
}

function requireField(args, key) {
  if (!args[key]) {
    console.error(`Missing required flag: --${key}`);
    process.exit(1);
  }
}

const [, , cmd, ...rest] = process.argv;

if (!cmd) {
  usage();
  process.exit(0);
}

if (cmd === "request") {
  const args = parseArgs(rest);

  requireField(args, "from");
  requireField(args, "to");
  requireField(args, "with");
  requireField(args, "reason");

  if (!isIsoLike(args.from) || !isIsoLike(args.to)) {
    console.error("Dates must look like ISO datetime, e.g. 2026-01-12T07:00");
    process.exit(1);
  }

  const id = crypto.randomBytes(3).toString("hex");
  const now = new Date().toISOString();

  const record = {
    id,
    from: args.from,
    to: args.to,
    with: args.with,
    reason: args.reason,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  const data = loadData();
  data.requests.unshift(record);
  saveData(data);

  console.log("✅ Request created");
  console.log(record);
  process.exit(0);
}

if (cmd === "list") {
  const data = loadData();
  if (data.requests.length === 0) {
    console.log("No requests yet.");
    process.exit(0);
  }

  console.table(
    data.requests.map((r) => ({
      id: r.id,
      status: r.status,
      from: r.from,
      to: r.to,
      with: r.with,
      reason: r.reason,
      updatedAt: r.updatedAt,
    }))
  );
  process.exit(0);
}

if (cmd === "approve" || cmd === "deny") {
  const args = parseArgs(rest);
  requireField(args, "id");

  const data = loadData();
  const idx = data.requests.findIndex((r) => r.id === args.id);

  if (idx === -1) {
    console.error(`No request found with id: ${args.id}`);
    process.exit(1);
  }

  data.requests[idx].status = cmd === "approve" ? "APPROVED" : "DENIED";
  data.requests[idx].updatedAt = new Date().toISOString();
  saveData(data);

  console.log(`✅ Request ${args.id} ${data.requests[idx].status}`);
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
usage();
process.exit(1);
