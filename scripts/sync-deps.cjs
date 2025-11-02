#!/usr/bin/env node
/*
    Safe sync script for deps.dependencies.json -> package.json
    Usage:
        node scripts/sync-deps.cjs          # apply changes
        node scripts/sync-deps.cjs --dry    # show planned changes, don't write
        node scripts/sync-deps.cjs --help   # this message

    Notes:
    - Creates a timestamped backup: package.json.bak.YYYYMMDDHHMMSS
    - Preserves other package.json fields; replaces only `dependencies` and `devDependencies`.
    - If `deps.dependencies.json` is missing, a starter file is created from the current package.json and the script exits.
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const depsPath = path.join(root, 'deps.dependencies.json');

function readJSON(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function nowTs() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );
}

function usage() {
    console.log('Usage: node scripts/sync-deps.cjs [--dry]');
    console.log('  --dry    Show planned changes without writing files');
    console.log('  --help   Show this message');
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
    usage();
    process.exit(0);
}

const dry = args.includes('--dry');

if (!fs.existsSync(pkgPath)) {
    console.error('package.json not found in', root);
    process.exit(1);
}

const pkg = readJSON(pkgPath);

// If deps file doesn't exist, create a starter file from current package.json and exit
if (!fs.existsSync(depsPath)) {
    const starter = {
        __meta: 'Edit `dependencies` and `devDependencies` inside this file, then run `npm run sync-deps` to update package.json',
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
    };
    writeJSON(depsPath, starter);
    console.log('Created deps.dependencies.json from current package.json.');
    console.log('Edit deps.dependencies.json to the desired dependency set, then run this script again to sync.');
    process.exit(0);
}

const depsFile = readJSON(depsPath);

const newDeps = depsFile.dependencies || {};
const newDevDeps = depsFile.devDependencies || {};

function diffDeps(oldDeps = {}, newDeps = {}) {
    const added = [];
    const removed = [];
    const changed = [];
    const allKeys = new Set([...Object.keys(oldDeps), ...Object.keys(newDeps)]);
    for (const k of allKeys) {
        const o = oldDeps[k];
        const n = newDeps[k];
        if (o === undefined && n !== undefined) added.push({ package: k, version: n });
        else if (o !== undefined && n === undefined) removed.push({ package: k, version: o });
        else if (o !== n) changed.push({ package: k, from: o, to: n });
    }
    return { added, removed, changed };
}

const dDeps = diffDeps(pkg.dependencies || {}, newDeps);
const dDev = diffDeps(pkg.devDependencies || {}, newDevDeps);

function printDiffSection(title, d) {
    if (d.added.length || d.removed.length || d.changed.length) {
        console.log('\n' + title + ':');
        if (d.added.length) {
            console.log('  Added:');
            d.added.forEach((i) => console.log('   +', i.package, i.version));
        }
        if (d.removed.length) {
            console.log('  Removed:');
            d.removed.forEach((i) => console.log('   -', i.package, i.version));
        }
        if (d.changed.length) {
            console.log('  Changed:');
            d.changed.forEach((i) => console.log('   *', i.package, i.from, '->', i.to));
        }
    } else {
        console.log('\n' + title + ': (no changes)');
    }
}

printDiffSection('dependencies', dDeps);
printDiffSection('devDependencies', dDev);

if (dry) {
    console.log('\nDry run complete. No files changed.');
    process.exit(0);
}

// Backup package.json with timestamp
const bakPath = pkgPath + '.bak.' + nowTs();
fs.copyFileSync(pkgPath, bakPath);
console.log('\nBacked up package.json to', bakPath);

// Apply changes
pkg.dependencies = newDeps;
pkg.devDependencies = newDevDeps;
writeJSON(pkgPath, pkg);
console.log('Merged deps.dependencies.json into package.json.');
console.log('Now run `npm install` to apply changes.');
