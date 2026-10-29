import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApp } from "../store";
import { dateKey } from "../domain";
import { PageTitle, Empty } from "../components";
import { HabitOrderList } from "../HabitOrderList";

export function MyHabits() {
  const app = useApp();
  const habits = app.tasks.filter((habit) => !habit.deletedDay);
  const paused = habits.filter((habit) => habit.active === false).length;
  async function toggle(habit) {
    const active = habit.active === false;
    const history = (habit.scheduleHistory || []).filter(
      (row) => row.from !== dateKey(),
    );
    history.push({ from: dateKey(), weekdays: habit.weekdays, active });
    try {
      await app.persist("tasks", habit.id, {
        ...habit,
        active,
        scheduleHistory: history,
      });
      app.setNotice(
        active ? "Habit enabled." : "Habit paused. Your past progress is kept.",
      );
    } catch (e) {
      app.setError(e.message);
    }
  }
  async function remove(habit) {
    if (
      !window.confirm(
        "Delete this habit from future days? Your past wins and sessions will remain.",
      )
    )
      return;
    try {
      await app.persist("tasks", habit.id, {
        ...habit,
        deletedDay: dateKey(),
        active: false,
      });
      app.setNotice(
        "Habit removed from future days. Your past progress is kept.",
      );
    } catch (e) {
      app.setError(e.message);
    }
  }
  return (
    <div className="my-habits-page">
      <PageTitle eyebrow="MAKE YOUR ROUTINE WORK FOR YOU" title="My habits.">
        <Link className="button" to="/tasks/new">
          <Plus size={18} /> New habit
        </Link>
      </PageTitle>
      <p className="my-habits-intro">
        Arrange, edit or pause your habits. Your past progress stays with you.
      </p>
      <div className="my-habits-counts" aria-label="Habit counts">
        <span>
          <strong>{habits.length - paused}</strong> active
        </span>
        <span>
          <strong>{paused}</strong> paused
        </span>
        <span>
          <strong>{habits.length}</strong> total
        </span>
      </div>
      {habits.length ? (
        <HabitOrderList habits={habits} onPause={toggle} onRemove={remove} />
      ) : (
        <Empty
          title="Your routine starts small"
          action={
            <Link className="button" to="/tasks/new">
              Create your first habit <Plus size={17} />
            </Link>
          }
        >
          Create a habit manually or start with a template. You can arrange it
          here anytime.
        </Empty>
      )}
    </div>
  );
}
