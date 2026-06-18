import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisualTreeNode } from './compiler-core/ast';

@Component({
  selector: 'app-ast-tree-node',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col select-none" [id]="'ast-node-' + node().id">
      <!-- Node Header Ribbon -->
      <div 
        class="flex items-center gap-2 py-1.5 px-3 rounded border transition-all duration-200"
        [class]="getHeaderClass(node().type)"
      >
        <!-- Collapse/Expand Arrow for nodes with children -->
        @if (node().children && node().children!.length > 0) {
          <button 
            type="button"
            (click)="toggleExpand($event)"
            class="p-0.5 rounded hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer text-current"
            aria-label="Toggle node children"
          >
            <span class="material-icons text-[18px] transform transition-transform duration-200" [class.rotate-90]="expanded()">
              chevron_right
            </span>
          </button>
        } @else {
          <div class="w-5 h-5 flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-45"></span>
          </div>
        }

        <!-- Icon representation based on Node category -->
        <span class="material-icons text-[18px] opacity-75">
          {{ getNodeIcon(node().type) }}
        </span>

        <!-- Node Label and Descriptive sub-label metadata -->
        <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <span class="font-semibold text-xs tracking-tight text-white">{{ node().label }}</span>
          @if (node().subLabel) {
            <span class="font-mono text-[10px] text-gray-450 opacity-80">{{ node().subLabel }}</span>
          }
        </div>
      </div>

      <!-- Nested Children container with visual indents and connector lines -->
      @if (node().children && node().children!.length > 0 && expanded()) {
        <div class="ml-4 pl-4 border-l border-[#2D2D2D] flex flex-col gap-2 mt-1.5 relative">
          <!-- Connector line visual aids -->
          @for (child of node().children; track child.id) {
            <div class="relative flex flex-col">
              <!-- Decorative horizontal branch node tip -->
              <div class="absolute -left-4 top-4 w-3.5 border-t border-[#2D2D2D]"></div>
              
              <app-ast-tree-node [node]="child" />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `
})
export class ASTTreeNode {
  readonly node = input.required<VisualTreeNode>();
  readonly expanded = signal<boolean>(true);

  toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    this.expanded.update(v => !v);
  }

  getNodeIcon(type: string): string {
    switch (type) {
      case 'Program': return 'terminal';
      case 'VarDecl': return 'add_box';
      case 'Assignment': return 'edit';
      case 'Print': return 'print';
      case 'If': return 'alt_route';
      case 'While': return 'sync';
      case 'Block': return 'folder_open';
      case 'NumberLiteral': return 'tag';
      case 'Variable': return 'badge';
      case 'BinaryExpression': return 'calculate';
      case 'Section': return 'subdirectory_arrow_right';
      default: return 'help_outline';
    }
  }

  getHeaderClass(type: string): string {
    const base = 'bg-[#141414] border-[#1F1F1F] ';
    switch (type) {
      case 'Program':
        return base + 'bg-[#1C1C1C] border-emerald-500/40 text-emerald-450 font-bold';
      case 'VarDecl':
      case 'Assignment':
        return base + 'border-emerald-500/30 text-emerald-400';
      case 'Print':
        return base + 'border-blue-500/30 text-blue-400';
      case 'If':
        return base + 'border-purple-500/30 text-purple-400';
      case 'While':
        return base + 'border-purple-500/30 text-purple-400';
      case 'Block':
        return base + 'bg-[#0E0E0E] text-gray-400';
      case 'BinaryExpression':
        return base + 'border-amber-500/30 text-amber-500';
      case 'NumberLiteral':
      case 'Variable':
        return base + 'border-emerald-500/20 text-emerald-300';
      case 'Section':
        return 'bg-emerald-950/20 border-transparent text-emerald-450 py-0.5 px-2 hover:bg-emerald-950/40';
      default:
        return base + 'text-gray-400';
    }
  }
}
