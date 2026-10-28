import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
} from "lucide-react";
import { CategoryIcon, cx } from "./components";
import { WEEKDAYS, moveHabit } from "./domain";
import { useApp } from "./store";

function HabitRow({
  habit,
  index,
  count,
  disabled,
  onMove,
  onPause,
  onRemove,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id, disabled });
  return (
    <div
      ref={setNodeRef}
      role="listitem"
      data-habit-id={habit.id}
      className={cx(
        "panel",
        "manage-task",
        "habit-sortable",
        isDragging && "is-dragging",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <button
        type="button"
        className="icon-button habit-drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${habit.name}`}
        title="Drag to reorder. Or press Space, then use arrow keys."
        disabled={disabled}
      >
        <GripVertical size={22} />
      </button>
      <CategoryIcon category={habit.category} />
      <div className="habit-row-copy">
        <h3>{habit.name}</h3>
        <small>
          {habit.active === false
            ? "Paused"
            : habit.weekdays.map((d) => WEEKDAYS[d]).join(" · ")}
        </small>
      </div>
      <div className="habit-row-actions">
        <div className="habit-move-buttons">
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${habit.name} up`}
            disabled={disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <ChevronUp size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${habit.name} down`}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <ChevronDown size={19} />
          </button>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => onPause(habit)}
        >
          {habit.active === false ? "Enable" : "Pause"}
        </button>
        <Link
          className="icon-button"
          aria-label={`Edit ${habit.name}`}
          to={`/tasks/${habit.id}/edit`}
        >
          <Edit3 size={17} />
        </Link>
        <button
          type="button"
          className="icon-button danger"
          aria-label={`Delete ${habit.name}`}
          disabled={disabled}
          onClick={() => onRemove(habit)}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

export function HabitOrderList({ habits, onPause, onRemove }) {
  const app = useApp();
  const [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = habits.map((h) => h.id);
  async function move(from, to) {
    if (saving || app.reordering || from === to) return;
    setSaving(true);
    setMessage("");
    try {
      await app.reorderHabits(moveHabit(ids, from, to));
      setMessage(
        "Habit order saved. The same order is used throughout the app.",
      );
    } catch (e) {
      setMessage(`Could not save the order. ${e.message}`);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="habit-order-section" aria-label="Arrange my habits">
      <p className="habit-order-hint">
        Drag the grip to arrange your habits. You can also use the up/down
        buttons. Paused habits keep their place.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            move(ids.indexOf(active.id), ids.indexOf(over.id));
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Press Space to pick up a habit. Use the arrow keys to move it. Press Space to drop, or Escape to cancel.",
          },
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div
            className="habit-order-list"
            role="list"
            aria-label="My habits in preferred order"
            aria-busy={saving || app.reordering}
          >
            {habits.map((habit, index) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                index={index}
                count={habits.length}
                disabled={saving || app.reordering}
                onMove={move}
                onPause={onPause}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="habit-order-status" role="status" aria-live="polite">
        {saving ? "Saving order…" : message}
      </p>
    </section>
  );
}
