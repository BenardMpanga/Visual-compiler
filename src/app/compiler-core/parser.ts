import { Token, TokenType } from './lexer';
import {
  StatementNode,
  ExpressionNode,
  ProgramNode,
  VarDeclNode,
  AssignmentNode,
  PrintNode,
  IfNode,
  WhileNode,
  BlockNode,
} from './ast';

export class ParserError extends Error {
  constructor(public override message: string, public token: Token) {
    super(message);
  }
}

export class Parser {
  private tokens: Token[];
  private current = 0;
  private nodeIdCounter = 0;
  public errors: { message: string; line: number; column: number; token: Token }[] = [];

  constructor(tokens: Token[]) {
    // Filter out errors from the lexer, but keep EOF or throw if error tokens are severe.
    // We can parse with them, or report them in parser errors.
    this.tokens = tokens;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${this.nodeIdCounter++}`;
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): ParserError {
    const err = new ParserError(message, token);
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      token,
    });
    return err;
  }

  /**
   * Synchronise parser state after an error occurred to continue parsing
   */
  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === 'SEMICOLON') return;

      switch (this.peek().type) {
        case 'LET':
        case 'PRINT':
        case 'IF':
        case 'WHILE':
          return;
      }

      this.advance();
    }
  }

  // --- Parser Rules ---

  public parse(): ProgramNode {
    this.errors = [];
    this.current = 0;
    this.nodeIdCounter = 0;

    const startLine = this.peek().line;
    const body: StatementNode[] = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) body.push(stmt);
      } catch (err) {
        if (err instanceof ParserError) {
          this.synchronize();
        } else {
          throw err;
        }
      }
    }

    return {
      id: this.generateId('program'),
      type: 'Program',
      body,
      line: startLine,
    };
  }

  private parseStatement(): StatementNode {
    if (this.match('LET')) {
      return this.parseLetStatement();
    }
    if (this.match('PRINT')) {
      return this.parsePrintStatement();
    }
    if (this.match('IF')) {
      return this.parseIfStatement();
    }
    if (this.match('WHILE')) {
      return this.parseWhileStatement();
    }
    if (this.match('L_BRACE')) {
      return this.parseBlockStatement();
    }

    // Otherwise, parse an assignment statement or pure expression statement
    return this.parseAssignmentOrExpressionStatement();
  }

  private parseLetStatement(): VarDeclNode {
    const startToken = this.previous();
    const nameToken = this.consume('IDENTIFIER', "Expect variable name after 'let'.");
    
    this.consume('ASSIGN', "Expect '=' after variable name in declaration.");
    const initializer = this.parseExpression();
    this.consume('SEMICOLON', "Expect ';' after variable declaration.");

    return {
      id: this.generateId('let'),
      type: 'VarDecl',
      name: nameToken.value,
      initializer,
      line: startToken.line,
    };
  }

  private parsePrintStatement(): PrintNode {
    const startToken = this.previous();
    this.consume('L_PAREN', "Expect '(' after 'print'.");
    const expression = this.parseExpression();
    this.consume('R_PAREN', "Expect ')' after print expression.");
    this.consume('SEMICOLON', "Expect ';' after print statement.");

    return {
      id: this.generateId('print'),
      type: 'Print',
      expression,
      line: startToken.line,
    };
  }

  private parseIfStatement(): IfNode {
    const startToken = this.previous();
    this.consume('L_PAREN', "Expect '(' after 'if'.");
    const test = this.parseExpression();
    this.consume('R_PAREN', "Expect ')' after if condition.");

    const consequent = this.parseStatement();
    let alternate: StatementNode | undefined;

    if (this.match('ELSE')) {
      alternate = this.parseStatement();
    }

    return {
      id: this.generateId('if'),
      type: 'If',
      test,
      consequent,
      alternate,
      line: startToken.line,
    };
  }

  private parseWhileStatement(): WhileNode {
    const startToken = this.previous();
    this.consume('L_PAREN', "Expect '(' after 'while'.");
    const test = this.parseExpression();
    this.consume('R_PAREN', "Expect ')' after while condition.");

    const body = this.parseStatement();

    return {
      id: this.generateId('while'),
      type: 'While',
      test,
      body,
      line: startToken.line,
    };
  }

  private parseBlockStatement(): BlockNode {
    const startToken = this.previous(); // the '{'
    const body: StatementNode[] = [];

    while (!this.check('R_BRACE') && !this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) body.push(stmt);
      } catch (err) {
        if (err instanceof ParserError) {
          this.synchronize();
        } else {
          throw err;
        }
      }
    }

    this.consume('R_BRACE', "Expect '}' after block.");

    return {
      id: this.generateId('block'),
      type: 'Block',
      body,
      line: startToken.line,
    };
  }

  private parseAssignmentOrExpressionStatement(): StatementNode {
    const startToken = this.peek();
    
    // Check if we have an assignment: e.g. identifier followed by '='
    if (this.check('IDENTIFIER') && this.current + 1 < this.tokens.length && this.tokens[this.current + 1].type === 'ASSIGN') {
      const nameToken = this.advance(); // consume identifier
      this.advance(); // consume '='
      const value = this.parseExpression();
      this.consume('SEMICOLON', "Expect ';' after assignment.");

      return {
        id: this.generateId('assign'),
        type: 'Assignment',
        name: nameToken.value,
        value,
        line: startToken.line,
      } as AssignmentNode;
    }

    // Parse expression statement
    const expr = this.parseExpression();
    this.consume('SEMICOLON', "Expect ';' after expression.");
    return expr;
  }

  // --- Expression Parsing (recursive descent with standard operator precedence) ---

  public parseExpression(): ExpressionNode {
    return this.parseComparison();
  }

  private parseComparison(): ExpressionNode {
    let expr = this.parseAdditive();

    while (this.match('LT', 'GT', 'LTE', 'GTE', 'EQ', 'NEQ')) {
      const operatorToken = this.previous();
      const right = this.parseAdditive();
      expr = {
        id: this.generateId('binary'),
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
        line: operatorToken.line,
      };
    }

    return expr;
  }

  private parseAdditive(): ExpressionNode {
    let expr = this.parseMultiplicative();

    while (this.match('PLUS', 'MINUS')) {
      const operatorToken = this.previous();
      const right = this.parseMultiplicative();
      expr = {
        id: this.generateId('binary'),
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
        line: operatorToken.line,
      };
    }

    return expr;
  }

  private parseMultiplicative(): ExpressionNode {
    let expr = this.parsePrimary();

    while (this.match('STAR', 'SLASH')) {
      const operatorToken = this.previous();
      const right = this.parsePrimary();
      expr = {
        id: this.generateId('binary'),
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
        line: operatorToken.line,
      };
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    if (this.match('NUMBER')) {
      const token = this.previous();
      return {
        id: this.generateId('num'),
        type: 'NumberLiteral',
        value: parseFloat(token.value),
        line: token.line,
      };
    }

    if (this.match('IDENTIFIER')) {
      const token = this.previous();
      return {
        id: this.generateId('var'),
        type: 'Variable',
        name: token.value,
        line: token.line,
      };
    }

    if (this.match('L_PAREN')) {
      const expr = this.parseExpression();
      this.consume('R_PAREN', "Expect ')' after expression.");
      return expr;
    }

    throw this.error(this.peek(), "Expect expression.");
  }
}
