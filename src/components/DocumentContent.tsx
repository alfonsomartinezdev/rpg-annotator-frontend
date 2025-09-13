import React, { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Annotation } from "../types";
import InlineAnnotation from './InlineAnnotation';

interface DocumentContentProps {
  htmlContent: string;
  annotations: Annotation[];
  selectedAnnotationId: number | null;
  onAnnotationClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEditAnnotation: React.Dispatch<React.SetStateAction<Annotation | null>>;
}

const DocumentContent = ({
  htmlContent,
  annotations,
  selectedAnnotationId,
  onAnnotationClick,
  onEditAnnotation,
}: DocumentContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactRootsRef = useRef<Map<number, Root>>(new Map());

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  type TextNodeInfo = {
    node: Text;
    start: number;
    end: number;
  };
  const textNodes: TextNodeInfo[] = [];
  let plainIndex = 0;

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent || "";
      if (textContent.trim() !== "") {
        textNodes.push({ node: node as Text, start: plainIndex, end: plainIndex + textContent.length });
      }
      plainIndex += textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach(traverse);
    }
  };

  doc.body.childNodes.forEach(traverse);

  annotations.forEach((ann) => {
    const { start_offset, end_offset, id } = ann;

    let startNodeInfo: TextNodeInfo | null = null;
    let endNodeInfo: TextNodeInfo | null = null;

    for (const info of textNodes) {
      if (!startNodeInfo && start_offset >= info.start && start_offset < info.end) {
        startNodeInfo = info;
      }
      if (!endNodeInfo && end_offset > info.start && end_offset <= info.end) {
        endNodeInfo = info;
      }
      if (startNodeInfo && endNodeInfo) break;
    }

    if (!startNodeInfo || !endNodeInfo) return;

    // If the selection is within a single text node
    if (startNodeInfo === endNodeInfo) {
      const node = startNodeInfo.node;
      const parent = node.parentNode;
      if (!parent) return;

      const offsetStart = start_offset - startNodeInfo.start;
      const offsetEnd = end_offset - startNodeInfo.start;

      const before = node.textContent?.slice(0, offsetStart) || "";
      const selected = node.textContent?.slice(offsetStart, offsetEnd) || "";
      const after = node.textContent?.slice(offsetEnd) || "";

      const span = doc.createElement("span");
      span.className = "annotation";
      span.setAttribute("data-id", id.toString());
      span.textContent = selected;

      const frag = doc.createDocumentFragment();
      if (before) frag.appendChild(doc.createTextNode(before));
      frag.appendChild(span);
      if (after) frag.appendChild(doc.createTextNode(after));

      parent.replaceChild(frag, node);
    } else {
      // Multi-node selection (rare, but can happen)
      console.warn("Multi-node annotation not handled yet:", ann);
    }
  });

useEffect(() => {
  if (!containerRef.current) return;

  const currentlyRendered = new Set(
    Array.from(containerRef.current.querySelectorAll('.inline-annotation-container'))
      .map(el => parseInt(el.getAttribute('data-annotation-id') || '0'))
  );

  currentlyRendered.forEach(id => {
    if (id !== selectedAnnotationId) {
      const root = reactRootsRef.current.get(id);
      if (root) {
        root.unmount();
        reactRootsRef.current.delete(id);
      }
      containerRef.current?.querySelector(`[data-annotation-id='${id}']`)?.remove();
    }
  });

  if (selectedAnnotationId) {
    const annotation = annotations.find(ann => ann.id === selectedAnnotationId);
    if (!annotation) return;

    let reactContainer = containerRef.current.querySelector(`[data-annotation-id='${selectedAnnotationId}']`) as HTMLElement;
    let root = reactRootsRef.current.get(selectedAnnotationId);

    if (!reactContainer) {
      const span = containerRef.current.querySelector(`.annotation[data-id='${selectedAnnotationId}']`);
      if (!span) return;

      reactContainer = document.createElement('div');
      reactContainer.className = 'inline-annotation-container';
      reactContainer.setAttribute('data-annotation-id', selectedAnnotationId.toString());

      const parentElement = span.closest("p, li, div, h1, h2, h3, h4, h5, h6");
      if (parentElement && parentElement.parentNode) {
        parentElement.parentNode.insertBefore(reactContainer, parentElement.nextSibling);
      }
    }

    if (!root) {
      root = createRoot(reactContainer);
      reactRootsRef.current.set(selectedAnnotationId, root);
    }

    root.render(
      <InlineAnnotation
        annotation={annotation}
        onEdit={() => onEditAnnotation(annotation)}
      />
    );
  }

  const rootsMap = reactRootsRef.current;

  return () => {
    rootsMap.forEach(root => root.unmount());
    rootsMap.clear();
  };
}, [annotations, selectedAnnotationId, onEditAnnotation]);

  useEffect(() => {
  const rootsToCleanup = new Map(reactRootsRef.current);
  
  return () => {
    rootsToCleanup.forEach(root => root.unmount());
  };
}, []);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    if (target.closest('.inline-annotation-container')) {
      return;
    }
    
    onAnnotationClick(event);
  };

  return (
    <div 
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} 
      onClick={handleClick} 
    />
  );
};

export default DocumentContent;