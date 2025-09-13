import React, { useState, useEffect, useRef } from "react";
import DocumentContent from "./DocumentContent";
import type { Annotation, DocumentData } from "../types";
import AnnotationModal from "./AnnotationModal";
import SelectionTooltip from "./SelectionTooltip";
import { API_BASE } from "../constants";

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

  const fetchDocument = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/documents/1`);
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

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTooltipPosition(null);
        savedRangeRef.current = null;
        return;
      }

      const range = selection.getRangeAt(0).cloneRange();
      savedRangeRef.current = range;
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
      } else {
        requestAnimationFrame(() =>
          setTooltipPosition({
            x: minLeft + window.scrollX,
            y: minTop + window.scrollY - 12,
          })
        );
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
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
      const id = parseInt(target.dataset.id || "0", 10);
      setSelectedAnnotationId(selectedAnnotationId === id ? null : id);
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

  const handleDeleteAnnotation = async (annotation: Annotation) => {
    if (!documentData) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/annotations/${annotation.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete annotation");

      await fetchDocument();
      if (selectedAnnotationId === annotation.id) {
        setSelectedAnnotationId(null);
      }
    } catch (err) {
      console.error("Error deleting annotation:", err);
    }
  };

  const getTextOffset = (root: Node, node: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current: Node | null;

    while ((current = walker.nextNode())) {
      if (current === node) return textOffset + offset;
      textOffset += current.textContent?.length || 0;
    }
    return textOffset;
  };

  const handleAddNote = () => {
    if (!savedRangeRef.current || !wrapperRef.current) return;

    const text = savedRangeRef.current.toString().trim();
    if (!text) return;

    const start = getTextOffset(
      wrapperRef.current,
      savedRangeRef.current.startContainer,
      savedRangeRef.current.startOffset
    );
    const end = start + text.length;

    const newAnnotation: Annotation = {
      id: Date.now(),
      selection_text: text,
      start_offset: start,
      end_offset: end,
      annotation_text: "",
      author: "current_user",
      created_at: new Date().toISOString(),
    };

    setEditingAnnotation(newAnnotation);
    setTooltipPosition(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        className="prose relative"
        ref={wrapperRef}
        onClick={handleDocumentClick}
      >
        <MemoizedDocumentContent
          key={`annotations-${documentData.annotations.length}-${documentData.annotations
            .map((a) => a.id)
            .join(",")}`}
          htmlContent={documentData.document.rendered_content}
          annotations={documentData.annotations}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={handleDocumentClick}
          onEditAnnotation={setEditingAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
        />

        {tooltipPosition && (
          <SelectionTooltip
            position={tooltipPosition}
            onAddNote={handleAddNote}
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
