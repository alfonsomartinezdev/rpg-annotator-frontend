import { useEffect, useRef, useState } from 'react';

interface UseTextSelectionProps {
  wrapperRef: React.MutableRefObject<HTMLDivElement | null>;
  isModalOpen: boolean;
}

export const useTextSelection = ({ wrapperRef, isModalOpen }: UseTextSelectionProps) => {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      if (isModalOpen) return;
      
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (!selection || !selectedText) {
        setTooltipPosition(null);
        savedRangeRef.current = null;
        return;
      }

      const range = selection.getRangeAt(0);
      if (!wrapperRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }

      savedRangeRef.current = range.cloneRange();
      const rects = Array.from(range.getClientRects());

      if (!rects.length) {
        setTooltipPosition(null);
        return;
      }

      const minLeft = Math.min(...rects.map((r) => r.left));
      const minTop = Math.min(...rects.map((r) => r.top));
      const maxRight = Math.max(...rects.map((r) => r.right));
      const maxBottom = Math.max(...rects.map((r) => r.bottom));

      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        let x = minLeft + (maxRight - minLeft) / 2 - rect.left;
        let y = minTop - rect.top - 12;

        if (y < 8) y = maxBottom - rect.top + 8;
        const padding = 12;
        x = Math.max(padding, Math.min(wrapper.clientWidth - padding, x));

        requestAnimationFrame(() => setTooltipPosition({ x, y }));
      }
    };

    const handleSelectionChange = () => {
      if (isModalOpen) return;
      
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'TEXTAREA' || 
          activeElement?.tagName === 'INPUT') {
        return;
      }
      
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selection && selectedText && wrapperRef.current) {
        try {
          const range = selection.getRangeAt(0);
          if (wrapperRef.current.contains(range.commonAncestorContainer)) {
            setTimeout(handleSelection, 50);
          }
        } catch (e) {
          console.log('Error getting range:', e);
        }
      }
    };

    const handleTouchEnd = () => {
      if (isModalOpen) return;
      setTimeout(handleSelection, 300);
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isModalOpen, wrapperRef]);

  return {
    tooltipPosition,
    savedRange: savedRangeRef.current,
    clearSelection: () => {
      setTooltipPosition(null);
      savedRangeRef.current = null;
    }
  };
};