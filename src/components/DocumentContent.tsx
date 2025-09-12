import type { Annotation } from "../types";

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
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Build mapping of plain-text index -> text node
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

  // Wrap annotation text in spans using offsets
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

  // Inject inline annotation divs if selected
  annotations.forEach((ann) => {
    if (ann.id !== selectedAnnotationId) return;

    const span = doc.querySelector(`.annotation[data-id='${ann.id}']`);
    if (!span) return;

    const inlineDiv = doc.createElement("div");
    inlineDiv.className = "inline-annotation";
    inlineDiv.innerHTML = `
      <div class="bg-amber-50 border-l-4 border-amber-400 p-4 my-1">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-gray-700 mb-2 mt-0">${ann.annotation_text}</p>
            <div class="text-xs text-gray-500">
              By: ${ann.author} • ${new Date(ann.created_at).toLocaleDateString()}
            </div>
          </div>
          <button class="cursor-pointer edit-btn text-amber-600 hover:text-amber-800 text-sm">Edit</button>
        </div>
      </div>
    `;

    const parentElement = span.closest("p, li, div, h1, h2, h3, h4, h5, h6");
    if (parentElement && parentElement.parentNode) {
      parentElement.parentNode.insertBefore(inlineDiv, parentElement.nextSibling);
    }
  });

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("edit-btn")) {
      const annotation = annotations.find((ann) => ann.id === selectedAnnotationId);
      if (annotation) onEditAnnotation(annotation);
    } else {
      onAnnotationClick(event);
    }
  };

  return <div dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} onClick={handleClick} />;
};

export default DocumentContent;
