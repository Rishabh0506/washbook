import { Floor } from '@/types/database';
import { MoreHorizontal } from 'lucide-react';

interface FloorTabsProps {
  floors: Floor[];
  selectedFloorId: number | 'ALL';
  onSelectFloor: (floorId: number | 'ALL') => void;
}

export default function FloorTabs({ floors, selectedFloorId, onSelectFloor }: FloorTabsProps) {
  return (
    <div className="flex overflow-x-auto py-4 space-x-3 hide-scrollbar">
      <button
        onClick={() => onSelectFloor('ALL')}
        className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm ${
          selectedFloorId === 'ALL'
            ? 'bg-gradient-to-r from-[#ff9a6a] to-[#ff5d5d] text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
        }`}
      >
        All Floors
      </button>

      {floors.map((floor) => (
        <button
          key={floor.floor_id}
          onClick={() => onSelectFloor(floor.floor_id)}
          className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm ${
            selectedFloorId === floor.floor_id
              ? 'bg-gradient-to-r from-[#ff9a6a] to-[#ff5d5d] text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          {floor.label}
        </button>
      ))}

      <button className="p-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
