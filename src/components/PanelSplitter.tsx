import React, { useState } from 'react';
import { GripVertical, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface PanelSplitterProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseDirection?: 'left' | 'right';
  panelName?: string;
  currentWidth?: number;
}

export const PanelSplitter: React.FC<PanelSplitterProps> = ({
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  isDragging = false,
  isCollapsed = false,
  onToggleCollapse,
  collapseDirection = 'left',
  panelName,
  currentWidth,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 z-20 group transition-all select-none",
        "w-3 cursor-col-resize hover:bg-indigo-500/10 active:bg-indigo-500/20",
        isDragging && "bg-indigo-600/30 w-3.5",
      )}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Kéo sang 2 bên để giãn chỉnh kích thước | Nhấp đúp để đặt lại mặc định"
    >
      {/* Visual Divider Line */}
      <div
        className={cn(
          "absolute inset-y-0 w-[2px] transition-colors duration-200",
          isDragging
            ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            : isHovered
            ? "bg-indigo-400/80"
            : "bg-white/10"
        )}
      />

      {/* Floating Center Drag Handle Bar */}
      <div
        className={cn(
          "absolute flex flex-col items-center justify-center gap-1.5 py-2 px-0.5 rounded-full border transition-all duration-200",
          isDragging
            ? "bg-indigo-600 border-indigo-400 text-white scale-110 shadow-lg shadow-indigo-600/50"
            : isHovered
            ? "bg-[#1E2433] border-indigo-500/60 text-indigo-300 scale-105 shadow-md"
            : "bg-[#141822] border-white/15 text-slate-500"
        )}
      >
        <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
        
        {/* Quick Collapse / Expand Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              "hover:bg-indigo-500 hover:text-white text-slate-400"
            )}
            title={isCollapsed ? "Mở rộng bảng" : "Thu gọn bảng"}
          >
            {collapseDirection === 'left' ? (
              isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />
            ) : (
              isCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Hover Width Indicator Tooltip */}
      {(isHovered || isDragging) && currentWidth !== undefined && (
        <div className="absolute -top-7 px-2 py-0.5 rounded bg-slate-900/90 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 whitespace-nowrap shadow-xl pointer-events-none z-30 flex items-center gap-1">
          <span>{panelName || 'Kích thước'}:</span>
          <span className="font-bold text-white">{Math.round(currentWidth)}px</span>
        </div>
      )}
    </div>
  );
};
