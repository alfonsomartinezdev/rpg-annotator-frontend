import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
    prev.selectedAnnotationIds.join(",") ===
      next.selectedAnnotationIds.join(",")
);

type EditingState = {
  annotation: Annotation;
  isNew: boolean;
};

const DocumentViewer = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<number[]>(
    []
  );
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const savedRangeRef = useRef<Range | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}`);
      const data = await res.json();
      setDocumentData(data);
    } catch (err) {
      console.error("Failed to fetch document:", err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [documentId, fetchDocument]);

  useEffect(() => {
    const handleSelection = () => {
      if (editingState) return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
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
      } else {
        requestAnimationFrame(() =>
          setTooltipPosition({
            x: minLeft + window.scrollX,
            y: minTop + window.scrollY - 12,
          })
        );
      }
    };

    const handleSelectionChange = () => {
      if (editingState) return;
      
      const selection = window.getSelection();
      
      if (selection && !selection.isCollapsed && wrapperRef.current) {
        const range = selection.getRangeAt(0);
        if (wrapperRef.current.contains(range.commonAncestorContainer)) {
          setTimeout(handleSelection, 10);
        }
      }
    };

    const handleTouchEnd = () => {
      if (editingState) return;
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
  }, [editingState]);

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

  const handleToggleAnnotation = (id: number) => {
    setSelectedAnnotationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveAnnotation = async () => {
    setEditingState(null);
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
      setSelectedAnnotationIds((prev) =>
        prev.filter((id) => id !== annotation.id)
      );
    } catch (err) {
      console.error("Error deleting annotation:", err);
    }
  };

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingState({ annotation, isNew: false });
  };

  const handleCloseModal = () => {
    setEditingState(null);
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

    console.log("start offset: ", start);
    console.log("end offset: ", end);

    const newAnnotation: Annotation = {
      id: Date.now(),
      selection_text: text,
      start_offset: start,
      end_offset: end,
      annotation_text: "",
      author: "Anonymous",
      created_at: new Date().toISOString(),
    };

    setEditingState({ annotation: newAnnotation, isNew: true });
    setTooltipPosition(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Documents
      </Link>
      <div className="prose relative" ref={wrapperRef}>
        <MemoizedDocumentContent
          key={`annotations-${
            documentData.annotations.length
          }-${documentData.annotations.map((a) => a.id).join(",")}`}
          htmlContent={documentData.document.rendered_content}
          annotations={documentData.annotations}
          selectedAnnotationIds={selectedAnnotationIds}
          onAnnotationToggle={handleToggleAnnotation}
          onEditAnnotation={handleEditAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
        />

        {tooltipPosition && (
          <SelectionTooltip
            position={tooltipPosition}
            onAddNote={handleAddNote}
          />
        )}

        {editingState && (
          <AnnotationModal
            annotation={editingState.annotation}
            onClose={handleCloseModal}
            onSave={handleSaveAnnotation}
            documentId={documentData.document.id}
            isNew={editingState.isNew}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;