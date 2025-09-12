import { MessageSquarePlus, X } from 'lucide-react';

interface SelectionTooltipProps {
  position: { x: number; y: number };
}

const SelectionTooltip = ({ position,}: SelectionTooltipProps) => {
  return (
    <div
      className="fixed z-50 bg-white shadow-lg border border-gray-200 rounded-lg py-2 px-3 flex items-center gap-2 text-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%) translateY(-100%)'
      }}
    >
      <button
        onClick={() =>{}}
        className="flex items-center gap-1 text-amber-600 hover:text-amber-800"
      >
        <MessageSquarePlus size={16} />
        Add Note
      </button>
      <button onClick={() =>{}} className="text-gray-400 hover:text-gray-600 ml-1">
        <X size={14} />
      </button>
    </div>
  );
};

export default SelectionTooltip;