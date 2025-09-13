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

  // Fetch document from backend
  const fetchDocument = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/v1/documents/3");
      const data = await res.json();
      setDocumentData(data);
    } catch (err) {
      console.error("Failed to fetch document:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, []);

  // Track text selection and position tooltip
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
      const rects = Array.from(savedRangeRef.current.getClientRects());

      if (!rects.length) {
        setTooltipPosition(null);
        return;
      }

      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;

      rects.forEach((r) => {
        minLeft = Math.min(minLeft, r.left);
        minTop = Math.min(minTop, r.top);
        maxRight = Math.max(maxRight, r.right);
        maxBottom = Math.max(maxBottom, r.bottom);
      });

      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        let x = minLeft + (maxRight - minLeft) / 2 - rect.left;
        let y = minTop - rect.top - 12;

        if (y < 8) y = maxBottom - rect.top + 8;
        const padding = 12;
        x = Math.max(padding, Math.min(wrapper.clientWidth - padding, x));

        requestAnimationFrame(() => setTooltipPosition({ x, y }));
      } else {
        requestAnimationFrame(() =>
          setTooltipPosition({ x: minLeft + window.scrollX, y: minTop + window.scrollY - 12 })
        );
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Keep selection active when tooltip renders
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
      const annotationId = parseInt(target.dataset.id || "0", 10);
      setSelectedAnnotationId(selectedAnnotationId === annotationId ? null : annotationId);
    }
  };

  const handleSaveAnnotation = async (updatedAnnotation: Annotation) => {
    if (documentData) {
      const updatedAnnotations = documentData.annotations.map((ann) =>
        ann.id === updatedAnnotation.id ? updatedAnnotation : ann
      );
      setDocumentData({ ...documentData, annotations: updatedAnnotations });
    }
    setEditingAnnotation(null);
    await fetchDocument();
  };

const getTextOffset = (root: Node, node: Node, offset: number): number => {
  let textOffset = 0;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent?.length || 0;
  }
  
  return textOffset;
};

  const handleAddNote = () => {
  if (!savedRangeRef.current) return;

  const selectionText = savedRangeRef.current.toString().trim();
  if (!selectionText) return;

  const documentElement = wrapperRef.current;
  if (!documentElement) return;

  const startOffset = getTextOffset(
    documentElement, 
    savedRangeRef.current.startContainer, 
    savedRangeRef.current.startOffset
  );
  const endOffset = startOffset + selectionText.length;

  const newAnnotation: Annotation = {
    id: Date.now(),
    selection_text: selectionText,
    start_offset: startOffset,
    end_offset: endOffset,
    annotation_text: "",
    author: "current_user",
    created_at: new Date().toISOString(),
  };

  setEditingAnnotation(newAnnotation);
  setTooltipPosition(null);
};

  const handleCancelSelection = () => {
    setTooltipPosition(null);
    savedRangeRef.current = null;
    const selection = window.getSelection();
    selection?.removeAllRanges();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="prose relative" ref={wrapperRef} onClick={handleDocumentClick}>
        <MemoizedDocumentContent
          htmlContent={documentData.document.rendered_content}
          annotations={documentData.annotations}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={handleDocumentClick}
          onEditAnnotation={setEditingAnnotation}
        />

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
