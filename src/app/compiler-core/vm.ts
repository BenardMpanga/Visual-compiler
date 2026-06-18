import { BytecodeInstruction } from './compiler';

export type VMStatus = 'READY' | 'PAUSED' | 'HALTED' | 'ERROR';

export interface VMStateSnapshot {
  ip: number;
  stack: number[];
  globals: Record<string, number>;
  output: string[];
  status: VMStatus;
  errorMessage?: string;
  stepsCount: number;
}

export class VirtualMachine {
  private instructions: BytecodeInstruction[] = [];
  
  // Registers and State
  public ip = 0;
  public stack: number[] = [];
  public globals: Record<string, number> = {};
  public output: string[] = [];
  public status: VMStatus = 'READY';
  public errorMessage?: string;
  public stepsCount = 0;

  // Track VM state snapshots for stepping backwards! (Bonus Feature)
  private history: VMStateSnapshot[] = [];

  private MAX_STEPS = 10000; // safety ceiling for infinite loops

  constructor(instructions: BytecodeInstruction[]) {
    this.instructions = instructions;
    this.reset();
  }

  public reset(): void {
    this.ip = 0;
    this.stack = [];
    this.globals = {};
    this.output = [];
    this.status = this.instructions.length > 0 ? 'READY' : 'HALTED';
    this.errorMessage = undefined;
    this.stepsCount = 0;
    this.history = [];
  }

  public saveSnapshot(): VMStateSnapshot {
    return {
      ip: this.ip,
      stack: [...this.stack],
      globals: { ...this.globals },
      output: [...this.output],
      status: this.status,
      errorMessage: this.errorMessage,
      stepsCount: this.stepsCount,
    };
  }

  public stepBackward(): boolean {
    if (this.history.length === 0) return false;
    const previousState = this.history.pop()!;
    this.ip = previousState.ip;
    this.stack = previousState.stack;
    this.globals = previousState.globals;
    this.output = previousState.output;
    this.status = previousState.status;
    this.errorMessage = previousState.errorMessage;
    this.stepsCount = previousState.stepsCount;
    return true;
  }

  public step(): void {
    if (this.status === 'HALTED' || this.status === 'ERROR') return;
    if (this.ip < 0 || this.ip >= this.instructions.length) {
      this.status = 'HALTED';
      return;
    }

    if (this.stepsCount >= this.MAX_STEPS) {
      this.status = 'ERROR';
      this.errorMessage = `Infinite Loop Protection: Execution exceeded dynamic safety ceiling of ${this.MAX_STEPS} instructions.`;
      return;
    }

    // Save state snapshot for step backward capability
    this.history.push(this.saveSnapshot());

    const inst = this.instructions[this.ip];
    let nextIp = this.ip + 1;
    this.stepsCount++;

    try {
      switch (inst.op) {
        case 'PUSH': {
          if (inst.operand === undefined || typeof inst.operand !== 'number') {
            throw new Error(`PUSH instruction expects a numeric operand. Got: ${inst.operand}`);
          }
          this.stack.push(inst.operand);
          break;
        }
        case 'LOAD': {
          const varName = inst.operand as string;
          if (varName === undefined) {
             throw new Error('LOAD instruction expects a variable name operand.');
          }
          if (this.globals[varName] === undefined) {
            throw new Error(`Runtime Reference Error: Variable "${varName}" is used before initialization.`);
          }
          this.stack.push(this.globals[varName]);
          break;
        }
        case 'STORE': {
          const varName = inst.operand as string;
          if (varName === undefined) {
            throw new Error('STORE instruction expects a variable name operand.');
          }
          if (this.stack.length === 0) {
            throw new Error(`Runtime Stack Underflow: Tried to store into "${varName}" but stack is empty.`);
          }
          const val = this.stack.pop()!;
          this.globals[varName] = val;
          break;
        }
        case 'ADD': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs + rhs);
          break;
        }
        case 'SUB': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs - rhs);
          break;
        }
        case 'MUL': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs * rhs);
          break;
        }
        case 'DIV': {
          const [lhs, rhs] = this.popBinary();
          if (rhs === 0) {
            throw new Error('Runtime Math Error: Division by zero is undefined.');
          }
          this.stack.push(lhs / rhs);
          break;
        }
        case 'LT': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs < rhs ? 1 : 0);
          break;
        }
        case 'GT': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs > rhs ? 1 : 0);
          break;
        }
        case 'LTE': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs <= rhs ? 1 : 0);
          break;
        }
        case 'GTE': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs >= rhs ? 1 : 0);
          break;
        }
        case 'EQ': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs === rhs ? 1 : 0);
          break;
        }
        case 'NEQ': {
          const [lhs, rhs] = this.popBinary();
          this.stack.push(lhs !== rhs ? 1 : 0);
          break;
        }
        case 'JUMP': {
          const target = inst.operand as number;
          if (target === undefined || target < 0 || target > this.instructions.length) {
            throw new Error(`Runtime Jump Error: Invalid JUMP address (${target})`);
          }
          nextIp = target;
          break;
        }
        case 'JUMP_IF_FALSE': {
          const target = inst.operand as number;
          if (target === undefined || target < 0 || target > this.instructions.length) {
            throw new Error(`Runtime Jump Error: Invalid JUMP_IF_FALSE address (${target})`);
          }
          if (this.stack.length === 0) {
            throw new Error('Runtime Stack Underflow: JUMP_IF_FALSE expects a value on the stack.');
          }
          const checkValue = this.stack.pop()!;
          if (checkValue === 0) {
            nextIp = target;
          }
          break;
        }
        case 'PRINT': {
          if (this.stack.length === 0) {
            throw new Error('Runtime Stack Underflow: PRINT instruction expects a value on the stack.');
          }
          const val = this.stack.pop()!;
          this.output.push(val.toString());
          break;
        }
        default: {
          throw new Error(`Runtime Error: Unsupported virtual machine instruction opcode: "${inst.op}"`);
        }
      }

      this.ip = nextIp;
      if (this.ip >= this.instructions.length) {
        this.status = 'HALTED';
      } else {
        this.status = 'PAUSED';
      }
    } catch (err: unknown) {
      this.status = 'ERROR';
      this.errorMessage = err instanceof Error ? err.message : 'Unknown runtime error occurred.';
    }
  }

  private popBinary(): [number, number] {
    if (this.stack.length < 2) {
      throw new Error('Runtime Stack Underflow: Binary operation requires two operands on the stack.');
    }
    const rhs = this.stack.pop()!;
    const lhs = this.stack.pop()!;
    return [lhs, rhs];
  }

  public runToCompletion(): void {
    while (this.status === 'READY' || this.status === 'PAUSED') {
      this.step();
      const currentStatusStr = this.status as string;
      if (currentStatusStr === 'HALTED' || currentStatusStr === 'ERROR') {
        break;
      }
    }
  }

  public getHistoryLength(): number {
    return this.history.length;
  }
}
