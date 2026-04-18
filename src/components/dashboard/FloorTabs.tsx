import { Floor } from '@/types/database';

interface FloorTabsProps {
  floors: Floor[];
  selectedFloorId: number | 'ALL';
  onSelectFloor: (floorId: number | 'ALL') => void;
}

export default function FloorTabs({ floors, selectedFloorId, onSelectFloor }: FloorTabsProps) {
  return (
    <div className="flex overflow-x-auto py-4 space-x-2 hide-scrollbar">
      <button
        onClick={() => onSelectFloor('ALL')}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedFloorId === 'ALL'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
      >
        All Floors
      </button>

      {floors.map((floor) => (
        <button
          key={floor.floor_id}
          onClick={() => onSelectFloor(floor.floor_id)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedFloorId === floor.floor_id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {floor.label}
        </button>
      ))}
    </div>
  );
}
