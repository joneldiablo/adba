#!/usr/bin/env node
require('dotenv').config();
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveRefs } from 'dbl-utils';
import * as pkg from './index';

const cli = yargs(hideBin(process.argv));

interface ParamInfo {
  name: string;
  desc?: string;
}

interface CommandInfo {
  description: string;
  params: ParamInfo[];
}

function loadMetadata(): Record<string, CommandInfo> {
  const typesDir = path.join(__dirname, '../types');
  const map: Record<string, CommandInfo> = {};
  if (!fs.existsSync(typesDir)) return map;
  for (const file of fs.readdirSync(typesDir)) {
    if (!file.endsWith('.d.ts')) continue;
    const text = fs.readFileSync(path.join(typesDir, file), 'utf8');
    const regexFn = new RegExp('\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*export\\s+declare\\s+function\\s+(\\w+)\\s*\\(([^)]*)\\)', 'g');
    const regexVar = new RegExp('\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*export\\s+declare\\s+(?:const|let|var)\\s+(\\w+)\\s*:\\s*\\(([^)]*)\\)\\s*=>', 'g');
    let m: RegExpExecArray | null;
    const add = (comment: string, name: string, params: string) => {
      const descLines: string[] = [];
      const paramDesc: Record<string, string> = {};
      for (const line of comment.split('\n')) {
        const trimmed = line.trim().replace(/^\*/,'').trim();
        if (trimmed.startsWith('@param')) {
          const [, p, d] = trimmed.match(/^@param\s+(\w+)\s*(.*)/) || [];
          if (p) paramDesc[p] = d;
        } else if (!trimmed.startsWith('@')) {
          descLines.push(trimmed);
        }
      }
      const paramNames = params
        .split(/,(?![^()]*\))/)
        .map((p) => p.trim().split(':')[0].replace(/\?|\s+$/g, ''))
        .filter(Boolean);
      map[name] = {
        description: descLines.join(' ').trim(),
        params: paramNames.map((n) => ({ name: n, desc: paramDesc[n] })),
      };
    };
    while ((m = regexFn.exec(text))) add(m[1], m[2], m[3]);
    while ((m = regexVar.exec(text))) add(m[1], m[2], m[3]);
  }
  return map;
}

function parseInput(value: string): any {
  if (typeof value !== 'string') return value;
  let content = value;
  if (fs.existsSync(value)) {
    content = fs.readFileSync(value, 'utf8');
  }
  try {
    const json = JSON.parse(content);
    return resolveRefs(json, { env: process.env } as any);
  } catch {
    return value;
  }
}

const metadata = loadMetadata();

for (const name of Object.keys(pkg)) {
  const fn: any = (pkg as any)[name];
  if (typeof fn !== 'function') continue;

  const info = metadata[name];
  const cmdPath = path.join(__dirname, 'commands', `${name}.js`);
  if (fs.existsSync(cmdPath)) {
    const mod = require(cmdPath);
    const describe = mod.describe || info?.description || `Run ${name}`;
    const builder = typeof mod.builder === 'function' ? mod.builder : (y: any) => y;
    const handler = mod.handler || mod.main;
    if (typeof handler === 'function') {
      cli.command(name, describe, builder, handler);
    }
  } else if (info) {
    const positional = info.params.map(p => `<${p.name}>`).join(' ');
    cli.command(
      `${name} ${positional}`.trim(),
      info.description || `Ejecuta la función ${name}`,
      y => {
        for (const p of info.params) {
          y.positional(p.name, { type: 'string', describe: p.desc });
        }
        return y;
      },
      async argv => {
        const args = info.params.map(p => parseInput((argv as any)[p.name]));
        const result = await Promise.resolve(fn(...args));
        if (result !== undefined) {
          if (typeof result === 'string') console.log(result);
          else console.log(JSON.stringify(result, null, 2));
        }
      }
    );
  } else {
    cli.command(
      name + ' [args..]',
      `Ejecuta la función ${name}`,
      y => y.positional('args', { type: 'string', array: true }),
      async argv => {
        const raw = (argv.args || []) as any[];
        const args = raw.map(a => parseInput(a));
        const result = await Promise.resolve(fn(...args));
        if (result !== undefined) {
          if (typeof result === 'string') console.log(result);
          else console.log(JSON.stringify(result, null, 2));
        }
      }
    );
  }
}

cli.demandCommand(1).help().argv;
