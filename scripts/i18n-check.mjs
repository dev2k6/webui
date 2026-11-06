#!/usr/bin/env node

/**
 * Stalwart WebUI i18n Parity & Verification Checker
 *
 * Verifies 100% symmetry between base reference locale (en.json) and target locale (vi.json):
 * 1. Key Parity: Identifies any missing keys in target or extra keys not in reference.
 * 2. Value Integrity: Asserts no empty string values in reference or target.
 * 3. Type Parity: Asserts matching data types (object vs string) across all paths.
 * 4. Template Interpolation: Asserts variable placeholders ({{var}} or {var}) match exactly.
 *
 * Exits with code 0 on complete parity, exits with code 1 if any discrepancy is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// ANSI colors for clean, readable CLI output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Recursively flatten a nested object into a list of leaf paths with values and types.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @returns {Array<{ path: string, value: unknown, type: string }>}
 */
export function flattenLeaves(obj, prefix = '') {
  let leaves = [];
  if (obj === null || typeof obj !== 'object') {
    return leaves;
  }

  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      leaves = leaves.concat(flattenLeaves(val, fullPath));
    } else {
      leaves.push({
        path: fullPath,
        value: val,
        type: Array.isArray(val) ? 'array' : typeof val,
      });
    }
  }

  return leaves;
}

/**
 * Extract interpolation variable names from a string (supporting {{var}} and {var}).
 *
 * @param {string} str
 * @returns {string[]}
 */
export function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const vars = [];
  // Matches {{var}} (group 1) or {var} (group 2)
  const regex = /\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^{}]+?)\s*\}/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const varName = (match[1] || match[2]).trim();
    vars.push(varName);
  }
  return vars;
}

/**
 * Performs full parity and integrity checks between reference and target dictionaries.
 *
 * @param {Record<string, unknown>} refObj Reference dictionary (e.g. en.json)
 * @param {Record<string, unknown>} targetObj Target dictionary (e.g. vi.json)
 * @param {string} refName Name of reference locale
 * @param {string} targetName Name of target locale
 * @returns {{
 *   valid: boolean,
 *   metrics: {
 *     refLeavesCount: number,
 *     targetLeavesCount: number,
 *     missingCount: number,
 *     extraCount: number,
 *     emptyRefCount: number,
 *     emptyTargetCount: number,
 *     placeholdersChecked: number,
 *     placeholderMismatchCount: number,
 *     typeMismatchCount: number,
 *   },
 *   discrepancies: {
 *     missingKeys: string[],
 *     extraKeys: string[],
 *     emptyRefKeys: string[],
 *     emptyTargetKeys: string[],
 *     typeMismatches: Array<{ path: string, refType: string, targetType: string }>,
 *     placeholderMismatches: Array<{ path: string, refVars: string[], targetVars: string[] }>,
 *   }
 * }}
 */
export function verifyI18nParity(refObj, targetObj, refName = 'en', targetName = 'vi') {
  const refLeaves = flattenLeaves(refObj);
  const targetLeaves = flattenLeaves(targetObj);

  const refMap = new Map(refLeaves.map((item) => [item.path, item]));
  const targetMap = new Map(targetLeaves.map((item) => [item.path, item]));

  const missingKeys = [];
  const extraKeys = [];
  const emptyRefKeys = [];
  const emptyTargetKeys = [];
  const typeMismatches = [];
  const placeholderMismatches = [];

  let placeholdersChecked = 0;

  // 1. Check reference keys against target
  for (const refItem of refLeaves) {
    const { path: keyPath, value: refVal, type: refType } = refItem;

    if (refType === 'string' && refVal.trim() === '') {
      emptyRefKeys.push(keyPath);
    }

    const targetItem = targetMap.get(keyPath);
    if (!targetItem) {
      missingKeys.push(keyPath);
      continue;
    }

    if (targetItem.type !== refType) {
      typeMismatches.push({
        path: keyPath,
        refType,
        targetType: targetItem.type,
      });
      continue;
    }

    if (refType === 'string' && targetItem.type === 'string') {
      const refVars = extractPlaceholders(refVal);
      const targetVars = extractPlaceholders(targetItem.value);

      if (refVars.length > 0 || targetVars.length > 0) {
        placeholdersChecked += refVars.length;
        const sortedRef = [...refVars].sort();
        const sortedTarget = [...targetVars].sort();

        if (sortedRef.join('::') !== sortedTarget.join('::')) {
          placeholderMismatches.push({
            path: keyPath,
            refVars,
            targetVars,
          });
        }
      }
    }
  }

  // 2. Check for extra keys and empty values in target
  for (const targetItem of targetLeaves) {
    const { path: keyPath, value: targetVal, type: targetType } = targetItem;

    if (targetType === 'string' && targetVal.trim() === '') {
      emptyTargetKeys.push(keyPath);
    }

    if (!refMap.has(keyPath)) {
      extraKeys.push(keyPath);
    }
  }

  const valid =
    missingKeys.length === 0 &&
    extraKeys.length === 0 &&
    emptyRefKeys.length === 0 &&
    emptyTargetKeys.length === 0 &&
    typeMismatches.length === 0 &&
    placeholderMismatches.length === 0;

  return {
    valid,
    metrics: {
      refLeavesCount: refLeaves.length,
      targetLeavesCount: targetLeaves.length,
      missingCount: missingKeys.length,
      extraCount: extraKeys.length,
      emptyRefCount: emptyRefKeys.length,
      emptyTargetCount: emptyTargetKeys.length,
      placeholdersChecked,
      placeholderMismatchCount: placeholderMismatches.length,
      typeMismatchCount: typeMismatches.length,
    },
    discrepancies: {
      missingKeys,
      extraKeys,
      emptyRefKeys,
      emptyTargetKeys,
      typeMismatches,
      placeholderMismatches,
    },
  };
}

/**
 * Main script runner
 */
export function runCli() {
  const args = process.argv.slice(2);
  const enPath = args[0] ? path.resolve(args[0]) : path.join(repoRoot, 'src', 'i18n', 'en.json');
  const viPath = args[1] ? path.resolve(args[1]) : path.join(repoRoot, 'src', 'i18n', 'vi.json');

  console.log(
    `${colors.bold}${colors.cyan}======================================================================${colors.reset}`,
  );
  console.log(`${colors.bold}${colors.cyan} Stalwart WebUI i18n Parity & Static Verification Tool${colors.reset}`);
  console.log(
    `${colors.bold}${colors.cyan}======================================================================${colors.reset}`,
  );
  console.log(`Reference Locale: ${colors.bold}${path.relative(repoRoot, enPath)}${colors.reset}`);
  console.log(`Target Locale:    ${colors.bold}${path.relative(repoRoot, viPath)}${colors.reset}`);
  console.log('');

  if (!fs.existsSync(enPath)) {
    console.error(`${colors.red}${colors.bold}Error: Reference locale file not found:${colors.reset} ${enPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(viPath)) {
    console.error(`${colors.red}${colors.bold}Error: Target locale file not found:${colors.reset} ${viPath}`);
    process.exit(1);
  }

  let enObj;
  let viObj;

  try {
    enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } catch (err) {
    console.error(
      `${colors.red}${colors.bold}Error: Failed to parse reference JSON (${enPath}):${colors.reset}`,
      err.message,
    );
    process.exit(1);
  }

  try {
    viObj = JSON.parse(fs.readFileSync(viPath, 'utf8'));
  } catch (err) {
    console.error(
      `${colors.red}${colors.bold}Error: Failed to parse target JSON (${viPath}):${colors.reset}`,
      err.message,
    );
    process.exit(1);
  }

  const result = verifyI18nParity(enObj, viObj, 'en', 'vi');
  const { metrics, discrepancies, valid } = result;

  console.log(`${colors.bold}Metrics Summary:${colors.reset}`);
  console.log(`  - Total Reference Keys (en):   ${metrics.refLeavesCount}`);
  console.log(`  - Total Target Keys (vi):      ${metrics.targetLeavesCount}`);
  console.log(
    `  - Missing Keys in Target:      ${metrics.missingCount > 0 ? colors.red : colors.green}${metrics.missingCount}${colors.reset}`,
  );
  console.log(
    `  - Extra Keys in Target:        ${metrics.extraCount > 0 ? colors.yellow : colors.green}${metrics.extraCount}${colors.reset}`,
  );
  console.log(
    `  - Empty Values (en):           ${metrics.emptyRefCount > 0 ? colors.red : colors.green}${metrics.emptyRefCount}${colors.reset}`,
  );
  console.log(
    `  - Empty Values (vi):           ${metrics.emptyTargetCount > 0 ? colors.red : colors.green}${metrics.emptyTargetCount}${colors.reset}`,
  );
  console.log(`  - Placeholder Variables:       ${metrics.placeholdersChecked} verified`);
  console.log(
    `  - Placeholder Mismatches:      ${metrics.placeholderMismatchCount > 0 ? colors.red : colors.green}${metrics.placeholderMismatchCount}${colors.reset}`,
  );
  console.log(
    `  - Type Mismatches:             ${metrics.typeMismatchCount > 0 ? colors.red : colors.green}${metrics.typeMismatchCount}${colors.reset}`,
  );
  console.log('');

  if (!valid) {
    console.error(
      `${colors.bold}${colors.red}❌ VERIFICATION FAILED: Discrepancies detected between locales!${colors.reset}\n`,
    );

    if (discrepancies.missingKeys.length > 0) {
      console.error(
        `${colors.red}${colors.bold}Missing Keys in ${path.basename(viPath)} (${discrepancies.missingKeys.length}):${colors.reset}`,
      );
      for (const k of discrepancies.missingKeys) {
        console.error(`  - ${k}`);
      }
      console.error('');
    }

    if (discrepancies.extraKeys.length > 0) {
      console.error(
        `${colors.yellow}${colors.bold}Extra Keys in ${path.basename(viPath)} (${discrepancies.extraKeys.length}):${colors.reset}`,
      );
      for (const k of discrepancies.extraKeys) {
        console.error(`  - ${k}`);
      }
      console.error('');
    }

    if (discrepancies.emptyRefKeys.length > 0) {
      console.error(
        `${colors.red}${colors.bold}Empty String Values in ${path.basename(enPath)} (${discrepancies.emptyRefKeys.length}):${colors.reset}`,
      );
      for (const k of discrepancies.emptyRefKeys) {
        console.error(`  - ${k}`);
      }
      console.error('');
    }

    if (discrepancies.emptyTargetKeys.length > 0) {
      console.error(
        `${colors.red}${colors.bold}Empty String Values in ${path.basename(viPath)} (${discrepancies.emptyTargetKeys.length}):${colors.reset}`,
      );
      for (const k of discrepancies.emptyTargetKeys) {
        console.error(`  - ${k}`);
      }
      console.error('');
    }

    if (discrepancies.typeMismatches.length > 0) {
      console.error(
        `${colors.red}${colors.bold}Type Mismatches (${discrepancies.typeMismatches.length}):${colors.reset}`,
      );
      for (const tm of discrepancies.typeMismatches) {
        console.error(`  - ${tm.path}: expected ${tm.refType}, got ${tm.targetType}`);
      }
      console.error('');
    }

    if (discrepancies.placeholderMismatches.length > 0) {
      console.error(
        `${colors.red}${colors.bold}Template Variable Mismatches (${discrepancies.placeholderMismatches.length}):${colors.reset}`,
      );
      for (const pm of discrepancies.placeholderMismatches) {
        console.error(
          `  - ${pm.path}: en variables [${pm.refVars.join(', ')}] !== vi variables [${pm.targetVars.join(', ')}]`,
        );
      }
      console.error('');
    }

    process.exit(1);
  }

  console.log(
    `${colors.bold}${colors.green}✔ SUCCESS: 100% key parity, value integrity, and template symmetry verified!${colors.reset}`,
  );
  process.exit(0);
}

// Execute when run directly as CLI
function isDirectExecution() {
  if (!process.argv[1]) return false;
  const scriptPath = fileURLToPath(import.meta.url);
  const entryPath = path.resolve(process.argv[1]);
  if (scriptPath === entryPath) return true;
  try {
    return fs.realpathSync(scriptPath) === fs.realpathSync(entryPath);
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  runCli();
}
