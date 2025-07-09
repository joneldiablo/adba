#!/usr/bin/env node
require('dotenv').config();
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolveRefs } from 'dbl-utils';
import * as pkg from './index';

const cli = yargs(hideBin(process.argv));

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

for (const name of Object.keys(pkg)) {
  const fn: any = (pkg as any)[name];
  if (typeof fn !== 'function') continue;

  const cmdPath = path.join(__dirname, 'commands', `${name}.js`);
  if (fs.existsSync(cmdPath)) {
    const mod = require(cmdPath);
    const describe = mod.describe || `Run ${name}`;
    const builder = typeof mod.builder === 'function' ? mod.builder : (y: any) => y;
    const handler = mod.handler || mod.main;
    if (typeof handler === 'function') {
      cli.command(name, describe, builder, handler);
    }
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
