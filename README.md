# Visual Compiler & Bytecode VM Runtime

I built this interactive web application to demystify the inner workings of compilers and register/stack-based virtual machines. 

Compilers, parsers, and VMs are often treated as "black boxes" in computer science education and software engineering. We write high-level code, hit a run button, and magically see output — but the complex intermediate step-by-step state changes remain hidden. This application brings those hidden layers to light through a completely transparent, real-time visual interpreter.

---

## 🔴 The Problem Statement: The Execution Black Box

When learning about or working with compilers and virtualization engines:
1. **Unseen Transitions:** Textbooks explain lexical scanners, recursive descent parsers, and abstract syntax trees (ASTs) conceptually, but it's incredibly hard to see how a code edit dynamically alters the AST representation on the fly.
2. **Bytecode Ambiguity:** Seeing compiled bytecode in a terminal is static. Understanding how bytecode instructions map back to original source lines is tedious.
3. **Implicit VM State:** Tracing how an operand stack, a program counter (IP), and a symbol environment/variable scope change during execution is typically a manual, error-prone exercise on a whiteboard. There is a lack of step-through, directional debugging tools that allow you to pause, step *into* instructions, and even backtrack (undo) individual operations to re-examine state.

---

## 🟢 The Solution: A Live, Line-by-Line Execution Trace Visualizer

This project is a fully custom-built compiler pipeline and stack-based virtual machine written in TypeScript and Angular. It breaks open the execution black box by synchronizing a custom IDE with three parallel visualizers:

1. **Live Lexical Stream & AST Visualizer:**
   * Converts high-level source statements into structured compiler tokens instantly as you type.
   * Generates a nested, collapsible Tree view of the Abstract Syntax Tree (AST) representing control structures, expressions with correct operator precedence, declarations, and function points.
2. **Interactive Bytecode Disassembler:**
   * Shows the raw compiled stack instructions (`PUSH`, `LOAD`, `STORE`, `JMP`, `ADD`, `LTE`, etc.) with physical address offsets and comments mapping instructions back to their corresponding source lines.
3. **Step-Through Bidirectional VM Debugger with Autoplay:**
   * Provides complete tactile control over VM execution. You can **Run** to completion, **Reset** at will, step **Forward** single instructions, and even step **Backward (Undo)** through historical snaps of execution.
   * **Custom Autoplay / Playback Mode:** Toggle an automated step-by-step playback mode to watch the program counter flow, operand stack accumulate, and environment swap values completely hands-free.
   * **Adjustable Speed Interval:** Use the real-time speed slider to configure the stepping delay from a rapid `100ms` down to a slow, methodical `1500ms` observation pace.
   * Tracks the Live Operand Stack, Program Counter/Instruction Pointer (IP), Scope Symbol Table (globals, values), and standard output (`stdout`) in real-time.

---

## 💫 Core Architecture & Pipeline Phases

This compiler pipeline is hand-crafted from scratch without relying on external parser generators or lexer libraries:

### 1. Lexer (Lexical Analyzer)
* Character-scrapes the source editor to extract clear tokens like `LET`, `WHILE`, `IF`, `ELSE`, `PRINT`, operators, variable identifiers, and literal numerical constants.
* Detects syntax offenses and reports them with detailed character column indexes.

### 2. Parser (Recursive Descent)
* Parses the stream of tokens into standard hierarchical node structures following mathematical operator precedence rules (addition/subtraction is lower than multiplication/division, with support for nested parentheses).
* Emits a comprehensive AST representation of instructions.

### 3. Compiler (Assembly Generator)
* Translates the AST nodes down to a linear list of compact stack VM bytecode instructions.
* Automatically implements label-offset jumps for conditionals (`IF/ELSE`) and loops (`WHILE`), mapping each address back to the editor's physical line numbers.

### 4. Stack-based Virtual Machine (VM)
* Mimics authentic runtime microprocessors using an evaluation operand stack.
* Retains a historical snapshot timeline array (`history`), making back-stepping/debugging physically possible by restoring structural states when you click the "Undo" button.

---

## 🚀 Supported Language Specification

The visualizer interprets a simple clean programming language featuring:
* **Variable Definition:** `let x = 10;`
* **Assignment Expressions:** `x = x + 1;`
* **Control Flows:** `while (x > 0) { ... }` or `if (x == 10) { ... } else { ... }`
* **Math Operators:** `+`, `-`, `*`, `/` with correct mathematical precedence.
* **Console Writing:** `print(x);` to write outputs to the live stdout stream.

---

## 🎨 Design Theme & Aesthetics

The application is styled with an **Elegant Dark Theme** designed to feel like a high-end IDE:
* **Rich Contrast:** Framed with deep dark backgrounds (`#0A0A0A`, `#0E0E0E`) complemented by high-visibility emerald accent highlights representing action routes, compiled instructions, and output paths.
* **Layout Grid:** Structured in a side-by-side bento layout with micro-containers separating source code editing from execution diagnostics.
* **Clean Font Pairings:** Clear display sans-serif headings paired with **JetBrains Mono** font arrays for assembly instructions, lexical listings, and standard variables tables.
* **AOT & Zoneless Ready:** Built with super-responsive modern Angular principles for maximum interface fluidity and minimal rendering footprint.
