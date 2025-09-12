import React, { useState, useEffect, useRef } from "react";
import DocumentContent from "./DocumentContent";
import type { Annotation, DocumentData } from "../types";
import AnnotationModal from "./AnnotationModal";
import SelectionTooltip from "./SelectionTooltip";

const MemoizedDocumentContent = React.memo(
  DocumentContent,
  (prev, next) =>
    prev.htmlContent === next.htmlContent &&
    prev.annotations === next.annotations &&
    prev.selectedAnnotationId === next.selectedAnnotationId
);

const DocumentViewer = () => {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const savedRangeRef = useRef<Range | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/v1/documents/1")
      .then((res) => res.json())
      .then((data) => {
        setDocumentData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch document:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTooltipPosition(null);
        savedRangeRef.current = null;
        return;
      }

      const range = selection.getRangeAt(0);
      savedRangeRef.current = range.cloneRange();

      const clientRects = Array.from(savedRangeRef.current.getClientRects());
      if (clientRects.length === 0) {
        setTooltipPosition(null);
        return;
      }

      let minLeft = Number.POSITIVE_INFINITY;
      let minTop = Number.POSITIVE_INFINITY;
      let maxRight = Number.NEGATIVE_INFINITY;
      let maxBottom = Number.NEGATIVE_INFINITY;

      for (const r of clientRects) {
        minLeft = Math.min(minLeft, r.left);
        minTop = Math.min(minTop, r.top);
        maxRight = Math.max(maxRight, r.left + r.width);
        maxBottom = Math.max(maxBottom, r.top + r.height);
      }

      const centerXViewport = minLeft + (maxRight - minLeft) / 2;
      const topViewport = minTop;

      // If we have a positioned wrapper, compute coordinates relative to it.
      // That way the tooltip (which is absolutely positioned inside that wrapper)
      // lines up without needing window.scroll offsets.
      const wrapperEl = wrapperRef.current;
      if (wrapperEl) {
        const containerRect = wrapperEl.getBoundingClientRect();

        let x = centerXViewport - containerRect.left;
        let y = topViewport - containerRect.top - 12;

        // If tooltip would go above the container, flip below selection
        if (y < 8) {
          y = maxBottom - containerRect.top + 8; // below selection
        }

        const padding = 12;
        const maxX = Math.max(0, wrapperEl.clientWidth - padding);
        x = Math.max(padding, Math.min(maxX, x));

        requestAnimationFrame(() => {
          setTooltipPosition({ x, y });
        });
      } else {
        // Fallback: position relative to the page (adds scroll offsets)
        requestAnimationFrame(() => {
          setTooltipPosition({
            x: centerXViewport + window.scrollX,
            y: topViewport + window.scrollY - 12,
          });
        });
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (tooltipPosition && savedRangeRef.current) {
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current!);
      });
    }
  }, [tooltipPosition]);

  if (loading) return <div>Loading...</div>;
  if (!documentData) return <div>Failed to load document</div>;

  const handleDocumentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("annotation")) {
      const annotationId = parseInt(target.getAttribute("data-id") || "0", 10);
      setSelectedAnnotationId(selectedAnnotationId === annotationId ? null : annotationId);
    }
  };

  const handleSaveAnnotation = (updatedAnnotation: Annotation) => {
    if (documentData) {
      const updatedAnnotations = documentData.annotations.map((ann) =>
        ann.id === updatedAnnotation.id ? updatedAnnotation : ann
      );
      setDocumentData({ ...documentData, annotations: updatedAnnotations });
    }
    setEditingAnnotation(null);
  };

const handleAddNote = () => {
  if (savedRangeRef.current) {
    const fragment = savedRangeRef.current.toString();
    if (!fragment.trim()) return;

    const containerText = savedRangeRef.current.startContainer.parentElement?.textContent || "";
    const startOffset = savedRangeRef.current.startOffset;
    const endOffset = startOffset + fragment.length;

    const before_context = containerText
      .slice(Math.max(0, startOffset - 30), startOffset)
      .trim();

    const after_context = containerText
      .slice(endOffset, endOffset + 30)
      .trim();

    const newAnnotation: Annotation = {
      id: Date.now(),
      fragment,
      before_context,
      after_context,
      annotation_text: "",
      author: "current_user",
      created_at: new Date().toISOString(),
    };

    setEditingAnnotation(newAnnotation);
    setTooltipPosition(null);
  }
};


  const handleCancelSelection = () => {
    setTooltipPosition(null);
    savedRangeRef.current = null;
    const selection = window.getSelection();
    selection?.removeAllRanges();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        className="prose relative"
        ref={wrapperRef}
        onClick={handleDocumentClick}
      >
        <MemoizedDocumentContent
          htmlContent={documentData.document.rendered_content}
          annotations={documentData.annotations}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={handleDocumentClick}
          onEditAnnotation={setEditingAnnotation}
        />

        {/* Tooltip when a selection exists */}
        {tooltipPosition && (
          <SelectionTooltip
            position={tooltipPosition}
            onAddNote={handleAddNote}
            onCancel={handleCancelSelection}
          />
        )}

        {editingAnnotation && (
          <AnnotationModal
            annotation={editingAnnotation}
            onClose={() => setEditingAnnotation(null)}
            onSave={handleSaveAnnotation}
            documentId={documentData.document.id}
            isNew={
              editingAnnotation.id.toString().startsWith("temp-") ||
              editingAnnotation.id > Date.now() - 1000
            }
          />
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
