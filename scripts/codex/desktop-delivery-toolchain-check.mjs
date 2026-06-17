#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const checks = [
  {
    id: 'node',
    label: 'Node.js',
    command: 'node',
    args: ['--version'],
    requiredFor: 'web, desktop runtime, Electron tooling'
  },
  {
    id: 'pnpm',
    label: 'Repo pnpm',
    command: 'node',
    args: ['.tools/pnpm/bin/pnpm.cjs', '--version'],
    requiredFor: 'workspace install/build scripts'
  },
  {
    id: 'git',
    label: 'Git',
    command: 'git',
    args: ['--version'],
    requiredFor: 'source control and release/version metadata'
  },
  {
    id: 'python3',
    label: 'Python 3',
    command: 'python3',
    args: ['--version'],
    requiredFor: 'auxiliary QA/research scripts only'
  },
  {
    id: 'xcode-select',
    label: 'Active Apple developer directory',
    command: 'xcode-select',
    args: ['-p'],
    requiredFor: 'macOS command-line developer tools'
  },
  {
    id: 'xcodebuild',
    label: 'Xcode build tool',
    command: 'xcodebuild',
    args: ['-version'],
    requiredFor: 'native Xcode project builds; full Xcode.app required'
  },
  {
    id: 'swift',
    label: 'Swift',
    command: 'swift',
    args: ['--version'],
    requiredFor: 'native macOS spike or helper experiments'
  },
  {
    id: 'codesign',
    label: 'codesign',
    command: 'xcrun',
    args: ['--find', 'codesign'],
    requiredFor: 'macOS app signing'
  },
  {
    id: 'notarytool',
    label: 'notarytool',
    command: 'xcrun',
    args: ['--find', 'notarytool'],
    requiredFor: 'macOS notarization'
  },
  {
    id: 'pkgbuild',
    label: 'pkgbuild',
    command: 'xcrun',
    args: ['--find', 'pkgbuild'],
    requiredFor: 'optional macOS package installer workflows'
  }
];

const packageCandidates = [
  {
    id: 'electron',
    label: 'Electron',
    command: 'node',
    args: ['.tools/pnpm/bin/pnpm.cjs', 'view', 'electron', 'version', '--silent'],
    requiredFor: 'cross-platform desktop shell'
  },
  {
    id: 'electron-builder',
    label: 'electron-builder',
    command: 'node',
    args: ['.tools/pnpm/bin/pnpm.cjs', 'view', 'electron-builder', 'version', '--silent'],
    requiredFor: 'macOS and Windows packaging'
  },
  {
    id: 'electron-updater',
    label: 'electron-updater',
    command: 'node',
    args: ['.tools/pnpm/bin/pnpm.cjs', 'view', 'electron-updater', 'version', '--silent'],
    requiredFor: 'future desktop auto-update channel'
  }
];

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false
  });
  const stdout = (result.stdout ?? '').trim();
  const stderr = (result.stderr ?? '').trim();
  return {
    ...check,
    ok: result.status === 0,
    status: result.status,
    output: stdout || stderr || result.error?.message || '(no output)'
  };
}

function printSection(title, rows) {
  console.log(`\n## ${title}`);
  for (const row of rows) {
    const mark = row.ok ? 'OK' : 'MISSING';
    console.log(`${mark.padEnd(7)} ${row.label}: ${row.output}`);
    console.log(`        use: ${row.requiredFor}`);
  }
}

const localRows = checks.map(runCheck);
const packageRows = process.argv.includes('--with-registry') ? packageCandidates.map(runCheck) : [];

console.log('Homebrew Forge desktop delivery toolchain check');
console.log(`Repo: ${repoRoot}`);
console.log(`Xcode.app: ${existsSync('/Applications/Xcode.app') ? 'installed' : 'not installed'}`);
console.log(`Codex.app: ${existsSync('/Applications/Codex.app') ? 'installed' : 'not installed'}`);
printSection('Local tools', localRows);
if (packageRows.length) {
  printSection('Registry package probes', packageRows);
} else {
  console.log('\n## Registry package probes');
  console.log('Skipped. Run with --with-registry to check current Electron package versions.');
}

const failedRequired = localRows.filter((row) => !row.ok && row.id !== 'xcodebuild');
if (failedRequired.length) {
  console.log('\nOne or more required local tools are missing.');
  process.exitCode = 1;
}
