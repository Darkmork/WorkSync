import type { ScheduleBlock, ScheduleState } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";

const stateClasses: Record<ScheduleState, string> = {
  free: "bg-status-free/75 hover:bg-status-free",
  preferred: "bg-status-preferred/75 hover:bg-status-preferred",
  occupied: "bg-status-occupied/75 hover:bg-status-occupied",
  avoid: "bg-status-avoid/80 hover:bg-status-avoid",
};

interface ScheduleGridProps {
  blocks: ScheduleBlock[];
  activeState?: ScheduleState;
  editable?: boolean;
  onChange?: (blocks: ScheduleBlock[]) => void;
}

export function ScheduleGrid({ blocks, activeState = "free", editable = false, onChange }: ScheduleGridProps) {
  const stateFor = (day: string, hour: string) =>
    blocks.find((block) => block.day === day && block.hour === hour)?.state ?? "free";

  const paint = (day: ScheduleBlock["day"], hour: string) => {
    if (!editable || !onChange) return;
    onChange(blocks.map((block) => (block.day === day && block.hour === hour ? { ...block, state: activeState } : block)));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-soft">
      <div className="grid grid-cols-[92px_repeat(7,minmax(82px,1fr))] overflow-x-auto border-b border-border-subtle bg-surface-container-low">
        <div className="h-12 border-r border-border-subtle" />
        {days.map((day) => (
          <div key={day.key} className="flex h-12 min-w-20 flex-col items-center justify-center border-r border-border-subtle font-mono text-xs last:border-r-0">
            <span className="text-on-surface-variant">{day.short}</span>
            <span className="font-bold text-primary">{day.label.slice(0, 3)}</span>
          </div>
        ))}
      </div>
      <div className="custom-scrollbar max-h-[650px] overflow-auto">
        <div className="grid min-w-[780px] grid-cols-[92px_repeat(7,minmax(82px,1fr))] gap-px bg-border-subtle">
          {timeSlots.map((slot) => (
            <div className="contents" key={slot.start}>
              <div className="flex h-12 flex-col items-center justify-center bg-white px-1 text-center font-mono text-[10px] leading-tight text-outline">
                <span>{slot.label}</span>
                {slot.kind === "lunch" && <span className="mt-0.5 rounded-full bg-status-avoid/30 px-1.5 text-[9px] text-on-surface-variant">13:35 - 14:10</span>}
              </div>
              {days.map((day) => {
                const state = stateFor(day.key, slot.start);
                return (
                  <button
                    key={`${day.key}-${slot.start}`}
                    type="button"
                    onClick={() => paint(day.key, slot.start)}
                    className={`h-12 min-w-20 transition ${stateClasses[state]}`}
                    aria-label={`${day.label} ${slot.label} ${state}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
