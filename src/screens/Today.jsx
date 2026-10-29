import React from "react";
import { TodayTaskCard } from "../TodayTaskCard";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowRight,
  Check,
  Calendar,
  Layers,
  Trophy,
} from "lucide-react";
import { useApp } from "../store";
import {
  WEEKDAYS,
  dateKey,
  weekDates,
  scheduled,
  dayStatus,
  achieved,
  parseDate,
} from "../domain";
import { cx, Empty, PageTitle } from "../components";

export function Today() {
  const { tasks, progress, user } = useApp();
  const key = dateKey();
  const todayTasks = tasks.filter(
    (t) =>
      scheduled(t, key) ||
      progress.some((p) => p.taskId === t.id && p.date === key && p.scheduled),
  );
  const status = dayStatus(tasks, progress, key);
  const remaining = status.total - status.won;
  const progressByTask = new Map(
    progress.filter((p) => p.date === key).map((p) => [p.taskId, p]),
  );
  const nextHabitId = todayTasks.find(
    (t) => achieved(progressByTask.get(t.id)) === 0,
  )?.id;
  const hasHabits = tasks.some((t) => !t.deletedDay);
  const week = weekDates().map((day) => ({
    day,
    won: dayStatus(tasks, progress, day).dayWon,
  }));
  const daysWon = week.filter((day) => day.won).length;
  const name = user?.displayName;
  const hour = new Date().getHours();

  return (
    <div className="today-focus">
      <PageTitle
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}${name ? `, ${name}` : "."}`}
      >
        <nav className="today-shortcuts" aria-label="Habit shortcuts">
          <Link to="/week">
            <Calendar size={16} /> This week
          </Link>
          <Link to="/habits/new">
            <Plus size={16} /> New habit
          </Link>
          <Link to="/templates">
            <Layers size={16} /> Templates
          </Link>
        </nav>
      </PageTitle>

      <div className="today-overview">
        <section className="panel today-summary" aria-label="Today's progress">
          <span className="eyebrow">TODAY'S MINIMUMS</span>
          <div className="today-summary-line">
            <h2>
              {status.total ? (
                <>
                  <strong>
                    {status.won}/{status.total}
                  </strong>{" "}
                  minimums done
                </>
              ) : hasHabits ? (
                "Rest day"
              ) : (
                "No habits scheduled"
              )}
            </h2>
            {status.total > 0 && (
              <span>
                {remaining ? (
                  `${remaining} remaining`
                ) : (
                  <>
                    <Check size={16} /> Day won
                  </>
                )}
              </span>
            )}
          </div>
          <progress
            aria-label="Today's minimums completed"
            max={Math.max(1, status.total)}
            value={status.won}
          />
          <p>
            {status.dayWon
              ? "You can stop here. Anything extra is optional."
              : status.won > 0
                ? `${status.won} ${status.won === 1 ? "minimum" : "minimums"} done. Keep going at your own pace.`
                : status.total
                  ? "Start with one small action. T1 is enough."
                  : hasHabits
                    ? "No minimums scheduled. Rest is part of consistency."
                    : "Start with a minimum you can manage on a difficult day."}
          </p>
        </section>

        <section className="panel today-week" aria-label="This week's progress">
          <div className="today-week-heading">
            <h2>
              <Link to="/week" aria-label="View this week">
                This week <ArrowRight size={16} />
              </Link>
            </h2>
            <span>
              {daysWon} {daysWon === 1 ? "day" : "days"} won
            </span>
          </div>
          <div className="week-strip">
            {week.map(({ day, won }) => (
              <div
                key={day}
                className={cx(day === key && "is-today")}
                aria-current={day === key ? "date" : undefined}
                aria-label={`${parseDate(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}${won ? ", day won" : ""}${day === key ? ", today" : ""}`}
              >
                <small>{WEEKDAYS[parseDate(day).getDay()].slice(0, 1)}</small>
                <span className={cx("day-circle", won && "won")}>
                  {won ? <Check size={15} /> : parseDate(day).getDate()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="today-habits" aria-labelledby="today-habits-heading">
        <div className="section-heading">
          <h2 id="today-habits-heading">
            Today's habits <span>{todayTasks.length}</span>
          </h2>
        </div>
        <div className="task-list">
          {todayTasks.map((t) => (
            <TodayTaskCard
              key={t.id}
              task={t}
              progress={progressByTask.get(t.id)}
              day={key}
              suggested={t.id === nextHabitId}
            />
          ))}
          {!todayTasks.length && (
            <Empty
              title={
                hasHabits
                  ? "Nothing scheduled today"
                  : "Make room for a small win"
              }
              action={
                hasHabits ? (
                  <Link className="button secondary" to="/week">
                    View your week <ArrowRight size={17} />
                  </Link>
                ) : (
                  <Link className="button" to="/habits/new">
                    Create your first habit <Plus size={17} />
                  </Link>
                )
              }
            >
              {hasHabits
                ? "Enjoy your rest day. Your next scheduled habits will be here when it is time."
                : "Choose one small habit to begin. You can build from there."}
            </Empty>
          )}
        </div>
        {status.dayWon && (
          <div className="day-won panel">
            <Trophy size={28} />
            <div>
              <span className="eyebrow">DAY WON</span>
              <h2>You kept your promises today.</h2>
              <p>
                Your scheduled minimums are done. Come back on your next habit
                day.
              </p>
            </div>
            <Link to="/week" className="button secondary">
              See my week <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
