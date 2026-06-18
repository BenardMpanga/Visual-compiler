import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  VarDeclNode,
  AssignmentNode,
  PrintNode,
  IfNode,
  WhileNode,
  BlockNode,
  BinaryExpressionNode,
} from './ast';

export type Opcode =
  | 'PUSH'
  | 'LOAD'
  | 'STORE'
  | 'ADD'
  | 'SUB'
  | 'MUL'
  | 'DIV'
  | 'LT'
  | 'GT'
  | 'LTE'
  | 'GTE'
  | 'EQ'
  | 'NEQ'
  | 'JUMP'
  | 'JUMP_IF_FALSE'
  | 'PRINT';

export interface BytecodeInstruction {
  id: string;
  op: Opcode;
  operand?: string | number; // can be numerical value, var name, or instruction pointer address (number)
  line: number;              // mapped back to source line
  comment?: string;          // annotation for easier reading in disassembly view
}

export class Compiler {
  private instructions: BytecodeInstruction[] = [];
  private instructionIdCounter = 0;

  private generateId(): string {
    return `inst-${this.instructionIdCounter++}`;
  }

  private emit(op: Opcode, operand?: string | number, line = 0, comment?: string): number {
    const inst: BytecodeInstruction = {
      id: this.generateId(),
      op,
      operand,
      line,
      comment,
    };
    this.instructions.push(inst);
    return this.instructions.length - 1; // return index of emitted instruction
  }

  private patch(index: number, operand: string | number): void {
    if (this.instructions[index]) {
      this.instructions[index].operand = operand;
    }
  }

  public compile(ast: ProgramNode): BytecodeInstruction[] {
    this.instructions = [];
    this.instructionIdCounter = 0;
    this.compileProgram(ast);
    return this.instructions;
  }

  private compileProgram(node: ProgramNode): void {
    for (const stmt of node.body) {
      this.compileStatement(stmt);
    }
  }

  private compileStatement(node: StatementNode): void {
    switch (node.type) {
      case 'VarDecl':
        this.compileVarDecl(node);
        break;
      case 'Assignment':
        this.compileAssignment(node);
        break;
      case 'Print':
        this.compilePrint(node);
        break;
      case 'If':
        this.compileIf(node);
        break;
      case 'While':
        this.compileWhile(node);
        break;
      case 'Block':
        this.compileBlock(node);
        break;
      case 'NumberLiteral':
      case 'Variable':
      case 'BinaryExpression':
        // Treat raw expressions as evaluation statement (like x + 1;)
        this.compileExpression(node);
        break;
    }
  }

  private compileVarDecl(node: VarDeclNode): void {
    // 1. Evaluate modern initializer expression (leaves value on stack)
    this.compileExpression(node.initializer);
    // 2. Pop value from stack and store into the variable name
    this.emit('STORE', node.name, node.line, `declare let ${node.name}`);
  }

  private compileAssignment(node: AssignmentNode): void {
    // 1. Evaluate the assignment expression (leaves value on stack)
    this.compileExpression(node.value);
    // 2. Pop value from stack and update the variable value
    this.emit('STORE', node.name, node.line, `update ${node.name} = value`);
  }

  private compilePrint(node: PrintNode): void {
    // 1. Evaluate printed expression (leaves value on stack)
    this.compileExpression(node.expression);
    // 2. Pop and print value
    this.emit('PRINT', undefined, node.line);
  }

  private compileIf(node: IfNode): void {
    // 1. Evaluate condition test expression (leaves test value on stack)
    this.compileExpression(node.test);

    // 2. Emit jump-if-false instruction (we will patch this target after compiling consequent block)
    const jumpIfFalseIdx = this.emit('JUMP_IF_FALSE', -1, node.line, 'jump to else-branch if test is false');

    // 3. Compile consequent statement
    this.compileStatement(node.consequent);

    if (node.alternate) {
      // If there's an else branch, the consequent must jump past it
      const jumpToEndIdx = this.emit('JUMP', -1, node.line, 'jump past else-branch');

      // Address of the else branch is the current instruction length
      const elseBranchAddr = this.instructions.length;
      this.patch(jumpIfFalseIdx, elseBranchAddr);

      // Compile alternate statement
      this.compileStatement(node.alternate);

      // Address after else branch
      const endAddr = this.instructions.length;
      this.patch(jumpToEndIdx, endAddr);
    } else {
      // No else branch; patch alternative target directly after consequent block
      const endAddr = this.instructions.length;
      this.patch(jumpIfFalseIdx, endAddr);
    }
  }

  private compileWhile(node: WhileNode): void {
    // 1. Record condition evaluate target offset
    const conditionAddr = this.instructions.length;

    // 2. Evaluate condition test expression
    this.compileExpression(node.test);

    // 3. Emit jump-if-false target to escape the loop (will patch after loop body compile)
    const jumpIfFalseIdx = this.emit('JUMP_IF_FALSE', -1, node.line, 'escape while loop if condition is false');

    // 4. Compile loop body statements
    this.compileStatement(node.body);

    // 5. Emit absolute JUMP target back to condition check
    this.emit('JUMP', conditionAddr, node.line, 'loop back to condition check');

    // 6. Patch the escape conditional jump address
    const escapeAddr = this.instructions.length;
    this.patch(jumpIfFalseIdx, escapeAddr);
  }

  private compileBlock(node: BlockNode): void {
    for (const stmt of node.body) {
      this.compileStatement(stmt);
    }
  }

  private compileExpression(node: ExpressionNode): void {
    switch (node.type) {
      case 'NumberLiteral':
        this.emit('PUSH', node.value, node.line);
        break;
      case 'Variable':
        this.emit('LOAD', node.name, node.line);
        break;
      case 'BinaryExpression':
        this.compileBinaryExpression(node);
        break;
    }
  }

  private compileBinaryExpression(node: BinaryExpressionNode): void {
    // In stack based evaluation: push left, push right, work operator
    this.compileExpression(node.left);
    this.compileExpression(node.right);

    let op: Opcode;
    switch (node.operator) {
      case '+': op = 'ADD'; break;
      case '-': op = 'SUB'; break;
      case '*': op = 'MUL'; break;
      case '/': op = 'DIV'; break;
      case '<': op = 'LT'; break;
      case '>': op = 'GT'; break;
      case '<=': op = 'LTE'; break;
      case '>=': op = 'GTE'; break;
      case '==': op = 'EQ'; break;
      case '!=': op = 'NEQ'; break;
      default:
        throw new Error(`Unknown operator in compiler: ${node.operator}`);
    }

    this.emit(op, undefined, node.line);
  }
}
