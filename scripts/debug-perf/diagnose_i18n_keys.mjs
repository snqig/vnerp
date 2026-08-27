/**
 * Diagnose missing i18n translation keys across page files.
 *
 * Scans .tsx files for useTranslations('Namespace') and t()/tc() calls,
 * then checks each key against the zh-CN.json message file.
 * Reports all missing keys with file locations.
 *
 * Usage: node diagnose_i18n_keys.mjs [directory...]
 * Default: scans src/app/[locale]/sample and src/app/[locale]/production/workorder
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const PROJECT_ROOT = 'D:/dcprint/erp-project';
const messages = JSON.parse(readFileSync(`${PROJECT_ROOT}/messages/zh-CN.json`, 'utf8'));

// Directories to scan
const scanDirs = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : [
      'src/app/[locale]/sample',
      'src/app/[locale]/production/workorder',
    ];

/**
 * Recursively find all .tsx files in a directory.
 */
function findTsxFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findTsxFiles(fullPath));
      } else if (extname(entry) === '.tsx') {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Directory doesn't exist or permission error
  }
  return results;
}

/**
 * Extract all translation keys from a file.
 * Returns: [{ namespace, key, line, file }]
 */
function extractKeys(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];

  // Find namespace declarations: useTranslations('Namespace')
  const namespaceMap = {}; // variable name -> namespace
  const nsRegex = /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = nsRegex.exec(content)) !== null) {
    namespaceMap[match[1]] = match[2];
  }

  // Also match: const { t } = ... useTranslations('Namespace')
  // And inline: useTranslations('Namespace')('key')
  // Pattern: variable('key') or variable("key")
  // Also handle nested keys like t('status.pending')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match t('key'), tc('key'), t("key"), etc.
    // Also match t(`key`) with template literals
    const callRegex = /(\w+)\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{)?/g;
    while ((match = callRegex.exec(line)) !== null) {
      const varName = match[1];
      const key = match[2];
      // Skip if it's not a translation function (common false positives)
      if (['useState', 'useCallback', 'useEffect', 'useMemo', 'require', 'import',
           'console', 'toast', 'setForm', 'setFormData', 'setNewOrder', 'setActiveTab',
           'setSelectedIds', 'setSortField', 'setSortOrder', 'setPage', 'setKeyword',
           'setSearchQuery', 'setStatusFilter', 'setSelectedCustomer', 'setSelectedStatus',
           'setIsCreateOpen', 'setIsEditOpen', 'setIsDetailOpen', 'setShowFormDialog',
           'setShowDetailDialog', 'setDetailItem', 'setEditingOrder', 'setEditId',
           'setSaving', 'setLoading', 'setList', 'setTotal', 'setWorkOrders',
           'setSalesOrders', 'setBomList', 'params', 'URLSearchParams', 'setParams',
           'parseInt', 'parseFloat', 'String', 'Number', 'Boolean', 'Array', 'Object',
           'JSON', 'Date', 'Promise', 'fetch', 'authFetch', 'confirm', 'alert',
           'toLocaleString', 'toFixed', 'toPrecision', 'toExponential',
           'map', 'filter', 'find', 'findIndex', 'forEach', 'reduce', 'some', 'every',
           'join', 'split', 'slice', 'splice', 'concat', 'push', 'pop', 'shift', 'unshift',
           'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'replace',
           'toLowerCase', 'toUpperCase', 'trim', 'padStart', 'padEnd', 'repeat',
           'keys', 'values', 'entries', 'from', 'isArray', 'of',
           'toString', 'valueOf', 'hasOwnProperty',
           'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
           'formatDate', 'formatNumber', 'formatCurrency',
           'printTable', 'exportTableToPDF', 'exportTableToXLS', 'exportTableToWORD',
           'toggleSelect', 'toggleSelectAll', 'handleSort', 'handleInputChange',
           'openEditDialog', 'resetForm', 'handleCreate', 'handleUpdate', 'handleDelete',
           'handleSave', 'handleViewDetail', 'handleOpenAdd', 'handleOpenEdit',
           'fetchOrders', 'fetchData', 'fetchWorkOrders', 'fetchSalesOrders', 'fetchBomList',
           'handleStatusChange', 'handleCreateOrder', 'getStatusBadge', 'getPriorityBadge',
           'getStatusConfig', 'getPriorityConfig', 'getSortIcon', 'getExportData',
           'sortableHeader', 'formFields',
          ].includes(varName)) continue;
      // Only process if the variable is a known translation function
      if (namespaceMap[varName]) {
        results.push({
          namespace: namespaceMap[varName],
          key,
          line: i + 1,
          file: filePath,
        });
      }
    }
  }

  // Also find keys defined in statusLabelMap / deliveryStatusLabelMap / statusColorMap objects.
  // Pattern: const someMap = { key1: 'value1', key2: 'value2', ... }
  // These values are translation keys passed to t().
  const mapDefRegex = /(?:const|let|var)\s+(\w+(?:Map|LabelMap|StatusMap|ColorMap))\s*[:=]\s*(?:Record<[^>]+>\s*)?\{([^}]+)\}/g;
  while ((match = mapDefRegex.exec(content)) !== null) {
    const mapName = match[1];
    const mapBody = match[2];
    // Extract all string values from the map
    const valRegex = /:\s*['"]([^'"]+)['"]/g;
    let valMatch;
    while ((valMatch = valRegex.exec(mapBody)) !== null) {
      const key = valMatch[1];
      // Skip UI variant names that are not translation keys
      const uiVariants = ['outline', 'secondary', 'default', 'destructive', 'ghost',
        'link', 'primary', 'success', 'warning', 'info', 'muted', 'accent'];
      if (uiVariants.includes(key)) continue;
      // Find which translation variable uses this map — look for t(mapName[ pattern
      const usageRegex = new RegExp(`(\\w+)\\s*\\(\\s*${mapName}\\[`);
      const usageMatch = content.match(usageRegex);
      if (usageMatch && namespaceMap[usageMatch[1]]) {
        results.push({
          namespace: namespaceMap[usageMatch[1]],
          key,
          line: 0,
          file: filePath,
          note: `via ${mapName}`,
        });
      } else {
        // Default to first namespace if we can't determine
        const firstNs = Object.values(namespaceMap)[0];
        if (firstNs) {
          results.push({
            namespace: firstNs,
            key,
            line: 0,
            file: filePath,
            note: `via ${mapName} (defaulted namespace)`,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Check if a key exists in a namespace.
 * Supports nested keys like 'status.pending'.
 */
function keyExists(namespace, key) {
  const ns = messages[namespace];
  if (!ns) return false;
  const parts = key.split('.');
  let current = ns;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return false;
    if (!(part in current)) return false;
    current = current[part];
  }
  return true;
}

// Scan all files
const allMissing = {};
let totalFiles = 0;
let totalKeys = 0;
let totalMissing = 0;

for (const scanDir of scanDirs) {
  const fullPath = `${PROJECT_ROOT}/${scanDir}`;
  const files = findTsxFiles(fullPath);
  for (const file of files) {
    totalFiles++;
    const keys = extractKeys(file);
    const seen = new Set();
    for (const { namespace, key, line, note } of keys) {
      const uniqueKey = `${namespace}.${key}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      totalKeys++;
      if (!keyExists(namespace, key)) {
        totalMissing++;
        const relFile = file.replace(/\\/g, '/').replace(`${PROJECT_ROOT}/`, '');
        if (!allMissing[namespace]) allMissing[namespace] = [];
        allMissing[namespace].push({ key, file: relFile, line, note });
      }
    }
  }
}

// Report
console.log('='.repeat(70));
console.log('i18n Missing Key Diagnosis');
console.log('='.repeat(70));
console.log(`Files scanned: ${totalFiles}`);
console.log(`Total keys checked: ${totalKeys}`);
console.log(`Missing keys: ${totalMissing}`);
console.log('');

for (const [namespace, entries] of Object.entries(allMissing)) {
  console.log(`\n[${namespace}] (${entries.length} missing)`);
  // Group by key
  const byKey = {};
  for (const { key, file, line, note } of entries) {
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({ file, line, note });
  }
  for (const [key, locations] of Object.entries(byKey).sort()) {
    const locStr = locations.map(l => `${l.file}:${l.line}${l.note ? ` (${l.note})` : ''}`).join(', ');
    console.log(`  ${key}`);
    console.log(`    -> ${locStr}`);
  }
}

// Output as JSON for programmatic use
if (process.env.OUTPUT_JSON) {
  const jsonOutput = {};
  for (const [namespace, entries] of Object.entries(allMissing)) {
    jsonOutput[namespace] = [...new Set(entries.map(e => e.key))].sort();
  }
  console.log('\n\n=== JSON (for patching) ===');
  console.log(JSON.stringify(jsonOutput, null, 2));
}
