export interface ASTNodeBase {
  id: string; // unique ID for parsing and tree rendering keys
  line: number;
}

export type StatementNode =
  | VarDeclNode
  | AssignmentNode
  | PrintNode
  | IfNode
  | WhileNode
  | BlockNode
  | ExpressionNode; // we can allow expression statements at the core level

export interface ProgramNode extends ASTNodeBase {
  type: 'Program';
  body: StatementNode[];
}

export interface VarDeclNode extends ASTNodeBase {
  type: 'VarDecl';
  name: string;
  initializer: ExpressionNode;
}

export interface AssignmentNode extends ASTNodeBase {
  type: 'Assignment';
  name: string;
  value: ExpressionNode;
}

export interface PrintNode extends ASTNodeBase {
  type: 'Print';
  expression: ExpressionNode;
}

export interface IfNode extends ASTNodeBase {
  type: 'If';
  test: ExpressionNode;
  consequent: StatementNode;
  alternate?: StatementNode;
}

export interface WhileNode extends ASTNodeBase {
  type: 'While';
  test: ExpressionNode;
  body: StatementNode;
}

export interface BlockNode extends ASTNodeBase {
  type: 'Block';
  body: StatementNode[];
}

export type ExpressionNode =
  | NumberLiteralNode
  | VariableNode
  | BinaryExpressionNode;

export interface NumberLiteralNode extends ASTNodeBase {
  type: 'NumberLiteral';
  value: number;
}

export interface VariableNode extends ASTNodeBase {
  type: 'Variable';
  name: string;
}

export interface BinaryExpressionNode extends ASTNodeBase {
  type: 'BinaryExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type ASTNode = ProgramNode | StatementNode | ExpressionNode;

// Node format designed specifically for the visual tree component
export interface VisualTreeNode {
  id: string;
  type: string;
  label: string;
  subLabel?: string;
  children?: VisualTreeNode[];
  expanded?: boolean;
}

/**
 * Recursively maps any AST Node to a VisualTreeNode for interactive tree rendering.
 */
export function astToVisualTree(node: ASTNode): VisualTreeNode {
  const lineStr = `[Line ${node.line}]`;
  
  switch (node.type) {
    case 'Program': {
      return {
        id: node.id,
        type: 'Program',
        label: 'Program',
        subLabel: `${node.body.length} statements`,
        children: node.body.map(stmt => astToVisualTree(stmt)),
        expanded: true
      };
    }
    case 'VarDecl': {
      return {
        id: node.id,
        type: 'VarDecl',
        label: `Variable Declaration (let)`,
        subLabel: `name: "${node.name}" ${lineStr}`,
        children: [
          {
            id: `${node.id}-init-label`,
            type: 'Section',
            label: 'Initializer',
            children: [astToVisualTree(node.initializer)],
            expanded: true
          }
        ],
        expanded: true
      };
    }
    case 'Assignment': {
      return {
        id: node.id,
        type: 'Assignment',
        label: `Assignment (=)`,
        subLabel: `variable: "${node.name}" ${lineStr}`,
        children: [
          {
            id: `${node.id}-val-label`,
            type: 'Section',
            label: 'value',
            children: [astToVisualTree(node.value)],
            expanded: true
          }
        ],
        expanded: true
      };
    }
    case 'Print': {
      return {
        id: node.id,
        type: 'Print',
        label: 'Print Statement',
        subLabel: `print() ${lineStr}`,
        children: [astToVisualTree(node.expression)],
        expanded: true
      };
    }
    case 'If': {
      const children: VisualTreeNode[] = [
        {
          id: `${node.id}-test`,
          type: 'Section',
          label: 'Test Condition',
          children: [astToVisualTree(node.test)],
          expanded: true
        },
        {
          id: `${node.id}-consequent`,
          type: 'Section',
          label: 'Then Branch',
          children: [astToVisualTree(node.consequent)],
          expanded: true
        }
      ];
      if (node.alternate) {
        children.push({
          id: `${node.id}-alternate`,
          type: 'Section',
          label: 'Else Branch',
          children: [astToVisualTree(node.alternate)],
          expanded: true
        });
      }
      return {
        id: node.id,
        type: 'If',
        label: 'Conditional (if)',
        subLabel: alternateLabel(node) + ` ${lineStr}`,
        children,
        expanded: true
      };
    }
    case 'While': {
      return {
        id: node.id,
        type: 'While',
        label: 'Loop (while)',
        subLabel: `${lineStr}`,
        children: [
          {
            id: `${node.id}-test`,
            type: 'Section',
            label: 'Test Condition',
            children: [astToVisualTree(node.test)],
            expanded: true
          },
          {
            id: `${node.id}-body`,
            type: 'Section',
            label: 'Loop Body',
            children: [astToVisualTree(node.body)],
            expanded: true
          }
        ],
        expanded: true
      };
    }
    case 'Block': {
      return {
        id: node.id,
        type: 'Block',
        label: 'Scope Block ({ })',
        subLabel: `${node.body.length} statements ${lineStr}`,
        children: node.body.map(stmt => astToVisualTree(stmt)),
        expanded: true
      };
    }
    case 'NumberLiteral': {
      return {
        id: node.id,
        type: 'NumberLiteral',
        label: `Number Literal`,
        subLabel: `value: ${node.value} ${lineStr}`
      };
    }
    case 'Variable': {
      return {
        id: node.id,
        type: 'Variable',
        label: `Variable Reference`,
        subLabel: `name: "${node.name}" ${lineStr}`
      };
    }
    case 'BinaryExpression': {
      return {
        id: node.id,
        type: 'BinaryExpression',
        label: `Binary Operation (${node.operator})`,
        subLabel: `${lineStr}`,
        children: [
          {
            id: `${node.id}-left`,
            type: 'Section',
            label: 'Left side',
            children: [astToVisualTree(node.left)],
            expanded: true
          },
          {
            id: `${node.id}-right`,
            type: 'Section',
            label: 'Right side',
            children: [astToVisualTree(node.right)],
            expanded: true
          }
        ],
        expanded: true
      };
    }
    default: {
      return {
        id: Math.random().toString(),
        type: 'Unknown',
        label: 'Unknown Node'
      };
    }
  }
}

function alternateLabel(node: IfNode): string {
  return node.alternate ? 'with else branch' : 'no else branch';
}
