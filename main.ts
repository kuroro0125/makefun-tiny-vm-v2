// Tiny stack VM for make.fun's "Build a tiny stack virtual machine" bounty.
// Runs every /input/<id>/program.bin on /input/<id>/input.bin, writing
// /output/<id>/stdout.bin and exit.txt. Follows the kit ISA: 32-bit wrapping
// integers, 256-value data stack, 64-deep call stack, 256 words of memory,
// ten traps, 1,000,000 steps, 65,536 output bytes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POPS8 = [0, 0, 0, 1, 1, 2, 2, 3];
const PUSH8 = [0, 1, 1, 0, 2, 2, 3, 3];

function run(p: Uint8Array, inp: Uint8Array): { out: number[]; code: number } {
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out: number[] = [];
  let sp = 0, csp = 0, pc = 0, ip = 0, steps = 0;
  for (;;) {
    if (steps === 1e6) return { out, code: 10 };
    if (pc < 0 || pc >= p.length) return { out, code: 9 };
    const op = p[pc];
    const known = op < 8 || (op >= 0x10 && op <= 0x22) || (op >= 0x30 && op <= 0x34) || (op >= 0x40 && op <= 0x41) || (op >= 0x50 && op <= 0x53);
    if (!known) return { out, code: 5 };
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (pc + imm >= p.length) return { out, code: 9 };
    steps++;
    let pops = 0, pushes = 0;
    if (op < 8) { pops = POPS8[op]; pushes = PUSH8[op]; }
    else if (op < 0x30) { pops = op === 0x17 || op === 0x1b ? 1 : 2; pushes = 1; }
    else if (op < 0x40) { pops = op === 0x31 || op === 0x32 ? 1 : 0; }
    else if (op < 0x50) { pops = op === 0x40 ? 1 : 2; pushes = op === 0x40 ? 1 : 0; }
    else { pops = op === 0x52 ? 0 : 1; pushes = op === 0x52 ? 1 : 0; }
    if (sp < pops) return { out, code: 2 };
    if (sp - pops + pushes > 256) return { out, code: 3 };
    const next = pc + 1 + imm;
    pc = next;
    switch (op) {
      case 0x00: return { out, code: 0 };
      case 0x01: D[sp++] = (p[next - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) { if (b === 0) return { out, code: 4 }; r = (a / b) | 0; }
        else if (op === 0x14) { if (b === 0) return { out, code: 4 }; r = (a % b) | 0; }
        else if (op === 0x15) { if (b === 0) return { out, code: 4 }; r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 0x16) { if (b === 0) return { out, code: 4 }; r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; D[sp++] = r; break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === 64) return { out, code: 7 };
        C[csp++] = next; pc = p[next - 2] | (p[next - 1] << 8); break;
      case 0x34:
        if (csp === 0) return { out, code: 8 };
        pc = C[--csp]; break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) return { out, code: 6 };
        D[sp - 1] = M[addr]; break;
      }
      case 0x41: {
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr >= 256) return { out, code: 6 };
        sp -= 2; M[addr] = v; break;
      }
      case 0x50: {
        const s = String(D[sp - 1]);
        if (out.length + s.length > 65536) return { out, code: 11 };
        sp--;
        for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
        break;
      }
      case 0x51:
        if (out.length + 1 > 65536) return { out, code: 11 };
        out.push(D[--sp] & 255); break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return { out, code: D[--sp] & 255 };
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), Buffer.from(r.out));
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
