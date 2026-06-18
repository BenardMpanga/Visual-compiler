export type TokenType =
  | 'LET'
  | 'PRINT'
  | 'IF'
  | 'ELSE'
  | 'WHILE'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'ASSIGN'
  | 'L_PAREN'
  | 'R_PAREN'
  | 'L_BRACE'
  | 'R_BRACE'
  | 'SEMICOLON'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'LT'      // <
  | 'GT'      // >
  | 'LTE'     // <=
  | 'GTE'     // >=
  | 'EQ'      // ==
  | 'NEQ'     // !=
  | 'EOF'
  | 'ERROR';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export class Lexer {
  private source: string;
  private length: number;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
    this.length = source.length;
  }

  private peek(): string {
    if (this.pos >= this.length) return '';
    return this.source[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.length) return '';
    return this.source[this.pos + 1];
  }

  private advance(): string {
    const char = this.peek();
    this.pos++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
      } else if (char === '/' && this.peekNext() === '/') {
        // Line comment: skip until newline or EOF
        this.advance(); // skip '/'
        this.advance(); // skip '/'
        while (this.pos < this.length && this.peek() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.length) break;

      const start = this.pos;
      const tLine = this.line;
      const tColumn = this.column;
      const char = this.peek();

      // Number literal (integer or floating point)
      if (this.isDigit(char)) {
        let value = this.advance();
        while (this.isDigit(this.peek())) {
          value += this.advance();
        }
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
          value += this.advance(); // '.'
          while (this.isDigit(this.peek())) {
            value += this.advance();
          }
        }
        tokens.push({
          type: 'NUMBER',
          value,
          line: tLine,
          column: tColumn,
          start,
          end: this.pos,
        });
        continue;
      }

      // Identifier or Keyword
      if (this.isAlpha(char)) {
        let value = this.advance();
        while (this.isAlphaNumeric(this.peek())) {
          value += this.advance();
        }

        let type: TokenType = 'IDENTIFIER';
        if (value === 'let') type = 'LET';
        else if (value === 'print') type = 'PRINT';
        else if (value === 'if') type = 'IF';
        else if (value === 'else') type = 'ELSE';
        else if (value === 'while') type = 'WHILE';

        tokens.push({
          type,
          value,
          line: tLine,
          column: tColumn,
          start,
          end: this.pos,
        });
        continue;
      }

      // Two-character and Single-character operators
      this.advance(); // consume the current char
      let value = char;
      let type: TokenType = 'ERROR';

      switch (char) {
        case '=':
          if (this.peek() === '=') {
            this.advance();
            type = 'EQ';
            value = '==';
          } else {
            type = 'ASSIGN';
          }
          break;
        case '!':
          if (this.peek() === '=') {
            this.advance();
            type = 'NEQ';
            value = '!=';
          } else {
            type = 'ERROR';
          }
          break;
        case '<':
          if (this.peek() === '=') {
            this.advance();
            type = 'LTE';
            value = '<=';
          } else {
            type = 'LT';
          }
          break;
        case '>':
          if (this.peek() === '=') {
            this.advance();
            type = 'GTE';
            value = '>=';
          } else {
            type = 'GT';
          }
          break;
        case '+':
          type = 'PLUS';
          break;
        case '-':
          type = 'MINUS';
          break;
        case '*':
          type = 'STAR';
          break;
        case '/':
          type = 'SLASH';
          break;
        case '(':
          type = 'L_PAREN';
          break;
        case ')':
          type = 'R_PAREN';
          break;
        case '{':
          type = 'L_BRACE';
          break;
        case '}':
          type = 'R_BRACE';
          break;
        case ';':
          type = 'SEMICOLON';
          break;
        default:
          type = 'ERROR';
          break;
      }

      tokens.push({
        type,
        value,
        line: tLine,
        column: tColumn,
        start,
        end: this.pos,
      });
    }

    tokens.push({
      type: 'EOF',
      value: 'EOF',
      line: this.line,
      column: this.column,
      start: this.pos,
      end: this.pos,
    });

    return tokens;
  }
}
