import { ChangeDetectionStrategy, Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lexer, Token } from './compiler-core/lexer';
import { Parser } from './compiler-core/parser';
import { ProgramNode, astToVisualTree, VisualTreeNode } from './compiler-core/ast';
import { Compiler, BytecodeInstruction } from './compiler-core/compiler';
import { VirtualMachine, VMStateSnapshot } from './compiler-core/vm';
import { ASTTreeNode } from './ast-tree-node';

export interface CompilerExample {
  id: string;
  name: string;
  description: string;
  code: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, ASTTreeNode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Pre-loaded executable examples
  readonly examples: CompilerExample[] = [
    {
      id: 'sum',
      name: 'Loop Sum (1 to 10)',
      description: 'Sums integers from 1 to 10 using a while-loop structure and updates variable totals.',
      code: `// Sum numbers from 1 to 10 with a while loop
let sum = 0;
let i = 1;

while (i <= 10) {
  sum = sum + i;
  i = i + 1;
}

print(sum);`
    },
    {
      id: 'fib',
      name: 'Fibonacci Sequence',
      description: 'Calculates the golden ratio Fibonacci sequence numbers, using while loop and storage shift ops.',
      code: `// Compute Fibonacci numbers
let a = 0;
let b = 1;
let n = 8;
let count = 0;

print(a); // F(0)
print(b); // F(1)

while (count < n) {
  let next = a + b;
  print(next);
  a = b;
  b = next;
  count = count + 1;
}`
    },
    {
      id: 'conditional',
      name: 'Voting Age Check',
      description: 'Demonstrates parsing nested binary operations, if/else controls, print statement routines, and scope state maps.',
      code: `// Conditional verification flow
let age = 19;
let status = 0;

if (age >= 18) {
  print(1); // 1 = eligible
  status = 123;
} else {
  print(0); // 0 = denied
  status = 999;
}

print(status);`
    }
  ];

  // Primary Workspace Signals
  readonly sourceCode = signal<string>(this.examples[0].code);
  readonly autoCompile = signal<boolean>(true);
  readonly activeTab = signal<'tokens' | 'ast' | 'bytecode' | 'vm-exec'>('vm-exec');

  // Compilation Pipeline Output Signals
  readonly tokens = signal<Token[]>([]);
  readonly lexerErrors = signal<{ message: string; line: number; column: number }[]>([]);
  readonly ast = signal<ProgramNode | null>(null);
  readonly visualAst = signal<VisualTreeNode | null>(null);
  readonly bytecode = signal<BytecodeInstruction[]>([]);
  readonly parserErrors = signal<{ message: string; line: number; column: number }[]>([]);

  // Interactive VM and State Tracer Signals
  private vmInstance: VirtualMachine | null = null;
  readonly vmState = signal<VMStateSnapshot | null>(null);

  constructor() {
    // Compile and sync pipeline when sourceCode changes in Auto-Compile mode
    effect(() => {
      if (this.autoCompile()) {
        this.runPipeline(this.sourceCode());
      }
    });
  }

  // Calculated utilities for visual alignment and feedback
  readonly linesCount = computed(() => {
    return this.sourceCode().split('\n').length;
  });

  readonly codeLineNumbers = computed(() => {
    const totalLines = this.linesCount();
    return Array.from({ length: totalLines }, (_, index) => index + 1);
  });

  readonly hasErrors = computed(() => {
    return this.lexerErrors().length > 0 || this.parserErrors().length > 0;
  });

  // Highlight executing statement active source line in Code Editor!
  readonly activeExecutionSourceLine = computed(() => {
    const snapshot = this.vmState();
    const insts = this.bytecode();
    if (!snapshot || !insts || snapshot.status === 'HALTED' || snapshot.status === 'READY') {
      return null;
    }
    const currentInst = insts[snapshot.ip];
    return currentInst ? currentInst.line : null;
  });

  /**
   * Loads a custom compiler program and triggers immediate pipeline execution
   */
  loadExample(example: CompilerExample): void {
    this.sourceCode.set(example.code);
    this.runPipeline(example.code);
  }

  onCodeChange(newCode: string): void {
    this.sourceCode.set(newCode);
  }

  /**
   * Main Compiler Pipeline: Lexer -> Parser -> AST Map -> Compiler -> VM Reset
   */
  runPipeline(code: string): void {
    this.lexerErrors.set([]);
    this.parserErrors.set([]);

    try {
      // 1. Lexical Analysis
      const lexer = new Lexer(code);
      const tokenStream = lexer.tokenize();
      this.tokens.set(tokenStream);

      // Check lexer output for severe unhandled errors
      const lexErrs = tokenStream
        .filter(t => t.type === 'ERROR')
        .map(t => ({
          message: `Lexer Error: Unexpected character symbol "${t.value}"`,
          line: t.line,
          column: t.column
        }));
      if (lexErrs.length > 0) {
        this.lexerErrors.set(lexErrs);
        this.ast.set(null);
        this.visualAst.set(null);
        this.bytecode.set([]);
        this.vmState.set(null);
        return;
      }

      // 2. Syntax Parsing (AST Construction)
      const parser = new Parser(tokenStream);
      const programAst = parser.parse();

      if (parser.errors.length > 0) {
        this.parserErrors.set(parser.errors.map(e => ({
          message: e.message,
          line: e.line,
          column: e.column
        })));
        this.ast.set(null);
        this.visualAst.set(null);
        this.bytecode.set([]);
        this.vmState.set(null);
        return;
      }

      this.ast.set(programAst);
      
      // Convert standard parsed algebraic AST Node into interactive visualization tree format
      const visualTreeFormat = astToVisualTree(programAst);
      this.visualAst.set(visualTreeFormat);

      // 3. Bytecode Compilation
      const compiler = new Compiler();
      const compiledBytecode = compiler.compile(programAst);
      this.bytecode.set(compiledBytecode);

      // 4. Load Assembly into stack VM & initialize snapshots
      this.vmInstance = new VirtualMachine(compiledBytecode);
      this.vmState.set(this.vmInstance.saveSnapshot());

    } catch (err: unknown) {
      // General safety fallback diagnostics
      const msg = err instanceof Error ? err.message : 'Fatal unexpected compilation breakdown.';
      this.parserErrors.set([{
        message: msg,
        line: 1,
        column: 1
      }]);
      this.ast.set(null);
      this.visualAst.set(null);
      this.bytecode.set([]);
      this.vmState.set(null);
    }
  }

  // --- VM Step Debugger Visual Controllers ---

  vmStepForward(): void {
    if (!this.vmInstance) return;
    this.vmInstance.step();
    this.vmState.set(this.vmInstance.saveSnapshot());
  }

  vmStepBackward(): void {
    if (!this.vmInstance) return;
    const stepped = this.vmInstance.stepBackward();
    if (stepped) {
      this.vmState.set(this.vmInstance.saveSnapshot());
    }
  }

  vmRunToCompletion(): void {
    if (!this.vmInstance) return;
    this.vmInstance.runToCompletion();
    this.vmState.set(this.vmInstance.saveSnapshot());
  }

  vmReset(): void {
    if (!this.vmInstance) return;
    this.vmInstance.reset();
    this.vmState.set(this.vmInstance.saveSnapshot());
  }

  getVmHistoryStackCount(): number {
    return this.vmInstance ? this.vmInstance.getHistoryLength() : 0;
  }

  getGlobalsList(): { name: string; value: number }[] {
    const snapshot = this.vmState();
    if (!snapshot || !snapshot.globals) return [];
    return Object.entries(snapshot.globals).map(([name, value]) => ({ name, value }));
  }

  getOpcodeColor(op: string): string {
    switch (op) {
      case 'PUSH': return 'text-sky-450 font-extrabold';
      case 'LOAD': return 'text-teal-400 font-bold';
      case 'STORE': return 'text-emerald-400 font-bold';
      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV':
        return 'text-purple-400 font-black';
      case 'LT':
      case 'GT':
      case 'LTE':
      case 'GTE':
      case 'EQ':
      case 'NEQ':
        return 'text-pink-400 font-black';
      case 'JUMP':
      case 'JUMP_IF_FALSE':
        return 'text-amber-400 font-black';
      case 'PRINT':
        return 'text-rose-400 font-black';
      default: return 'text-slate-300';
    }
  }

  getTokenBadgeClass(type: string): string {
    switch (type) {
      case 'LET':
      case 'PRINT':
      case 'IF':
      case 'ELSE':
      case 'WHILE':
        return 'bg-amber-950/70 text-amber-400 border border-amber-800/50';
      case 'IDENTIFIER':
        return 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/50';
      case 'NUMBER':
        return 'bg-rose-950/70 text-rose-400 border border-rose-800/50';
      case 'ASSIGN':
        return 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50';
      case 'PLUS':
      case 'MINUS':
      case 'STAR':
      case 'SLASH':
        return 'bg-purple-950/70 text-purple-400 border border-purple-800/50';
      case 'LT':
      case 'GT':
      case 'LTE':
      case 'GTE':
      case 'EQ':
      case 'NEQ':
        return 'bg-pink-950/70 text-pink-400 border border-pink-800/50';
      case 'L_PAREN':
      case 'R_PAREN':
      case 'L_BRACE':
      case 'R_BRACE':
        return 'bg-slate-800/80 text-slate-300 border border-slate-700/50';
      case 'SEMICOLON':
        return 'bg-slate-900 text-slate-500 border border-transparent';
      case 'ERROR':
        return 'bg-rose-900/90 text-white font-black animate-pulse';
      case 'EOF':
        return 'bg-slate-950 text-slate-600 border border-slate-900';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  }
}
