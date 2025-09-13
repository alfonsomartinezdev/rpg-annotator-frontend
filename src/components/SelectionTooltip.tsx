import { MessageSquarePlus } from "lucide-react";

interface SelectionTooltipProps {
  position: { x: number; y: number };
  onAddNote: () => void;
}

const SelectionTooltip = ({
  position,
  onAddNote,
}: SelectionTooltipProps) => {
  return (
    <div
      className="absolute z-50 bg-white shadow-lg border border-gray-200 rounded-lg flex items-center gap-2 text-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%) translateY(-100%)",
      }}
    >
      <button
        onClick={onAddNote}
        className="flex items-center gap-1 text-amber-600 hover:text-amber-800 p-2 px-3"
      >
        <MessageSquarePlus size={16} />
        Add Note
      </button>
    </div>
  );
};

export default SelectionTooltip;
