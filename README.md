[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/kuroro0125/makefun-tiny-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/kuroro0125/makefun-tiny-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# Tiny stack VM

Entry for the [make.fun bounty "Build a tiny stack virtual machine, 22 November 2026"](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

`main.ts` runs every program of make.fun's tiny stack ISA: 32-bit wrapping
integers, a 256-value data stack, a 64-deep call stack, 256 words of memory,
input and output, and all ten traps with their own exit codes, under the
1,000,000-step and 65,536-byte limits. Each instance gets `stdout.bin`
and `exit.txt`, matching the kit's reference VM exactly, including the hard
cases: wrapping multiplication, `-2147483648 / -1`, unsigned division and
comparison, five-bit shift counts, `PUSH8` sign extension, `EXIT` taking the
low byte, and every trap code.
