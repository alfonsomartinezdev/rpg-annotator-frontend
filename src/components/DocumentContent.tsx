import React, { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Annotation } from "../types";
import InlineAnnotation from './InlineAnnotation';

interface DocumentContentProps {
  htmlContent: string;
  annotations: Annotation[];
  selectedAnnotationIds: number[];
  onAnnotationToggle: (id: number) => void;
  onEditAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (annotation: Annotation) => void;
}

const DocumentContent = ({
  htmlContent,
  annotations,
  selectedAnnotationIds,
  onAnnotationToggle,
  onEditAnnotation,
  onDeleteAnnotation
}: DocumentContentProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactRootsRef = useRef<Map<number, Root>>(new Map());
  const reactContainersRef = useRef<Map<number, HTMLElement>>(new Map());

  const processHTML = () => {
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
        console.warn("Multi-node annotation not handled yet:", ann);
      }
    });

    return doc.body.innerHTML;
  };

  const processedHTML = processHTML();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const existingContainers = container.querySelectorAll('.inline-annotation-container');
    existingContainers.forEach(c => {
      const id = parseInt(c.getAttribute('data-annotation-id') || '0', 10);
      if (!selectedAnnotationIds.includes(id)) {
        c.setAttribute("style", "display: none;");
      } else {
        c.setAttribute("style", "display: block;");
      }
    });

    reactRootsRef.current.forEach((root, id) => {
      const knownContainer = reactContainersRef.current.get(id);
      if (!knownContainer || !knownContainer.isConnected) {
        try { root.unmount(); } catch { /* ignore */ }
        reactRootsRef.current.delete(id);
        reactContainersRef.current.delete(id);
      }
    });

    selectedAnnotationIds.forEach((selectedId) => {
      const annotation = annotations.find(ann => ann.id === selectedId);
      if (!annotation) return;

      let reactContainer = container.querySelector(
        `[data-annotation-id='${selectedId}']`
      ) as HTMLElement | null;

      if (!reactContainer) {
        const span = container.querySelector(`.annotation[data-id='${selectedId}']`);
        if (!span) return;

        reactContainer = document.createElement('div');
        reactContainer.className = 'inline-annotation-container';
        reactContainer.setAttribute('data-annotation-id', selectedId.toString());
        reactContainer.style.display = "block";

        const parentElement = span.closest("p, li, div, h1, h2, h3, h4, h5, h6");
        if (parentElement?.parentNode) {
          parentElement.parentNode.insertBefore(reactContainer, parentElement.nextSibling);
        } else {
          container.appendChild(reactContainer);
        }
      } else {
        reactContainer.style.display = "block";
      }

      let root = reactRootsRef.current.get(selectedId);
      const knownContainer = reactContainersRef.current.get(selectedId);

      if (root && knownContainer && !knownContainer.isSameNode(reactContainer)) {
        try { root.unmount(); } catch { /* ignore */ }
        reactRootsRef.current.delete(selectedId);
        reactContainersRef.current.delete(selectedId);
        root = undefined;
      }

      if (!root) {
        root = createRoot(reactContainer);
        reactRootsRef.current.set(selectedId, root);
        reactContainersRef.current.set(selectedId, reactContainer);
      } else {
        reactContainersRef.current.set(selectedId, reactContainer);
      }

      root.render(
        <InlineAnnotation
          annotation={annotation}
          onEdit={() => onEditAnnotation(annotation)}
          onDelete={onDeleteAnnotation}
        />
      );
    });
  }, [annotations, selectedAnnotationIds, onEditAnnotation, onDeleteAnnotation]);

  useEffect(() => {
  const roots = reactRootsRef.current;
  const containers = reactContainersRef.current;

  return () => {
    roots.forEach((root) => {
      try { root.unmount(); } catch { /* ignore */ }
    });
    roots.clear();
    containers.clear();
  };
}, []);


  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.inline-annotation-container')) {
      return;
    }

    const annEl = target.closest('.annotation') as HTMLElement | null;
    if (annEl) {
      const id = parseInt(annEl.getAttribute('data-id') || '0', 10);
      if (id) {
        onAnnotationToggle(id);
        return;
      }
    }

  };

  return (
    <div
      key={`${annotations.length}-${annotations.map(a => a.id).join(',')}`}
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: processedHTML }}
      onClick={handleClick}
    />
  );
};

export default DocumentContent;