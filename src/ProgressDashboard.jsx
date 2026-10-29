import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Edit3, Target, CalendarDays } from "lucide-react";
import { useApp } from "./store";
import { dateKey, parseDate, daysBack, dayStatus } from "./domain";
import { CategoryIcon, PageTitle, Tier } from "./components";
import {
  activityCalendar,
  activityLabel,
  progressSummary,
} from "./analytics.js";
const shortDate = (day) =>
  parseDate(day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
export function ProgressDashboard() {
  const { tasks, progress } = useApp();
  const [period, setPeriod] = useState(30);
  const [habitSort, setHabitSort] = useState("lowest");
  const today = dateKey(),
    keys = daysBack(period);
  const current = progressSummary(tasks, progress, keys, today);
  const end = parseDate(keys[0]);
  end.setDate(end.getDate() - 1);
  const previous = progressSummary(
    tasks,
    progress,
    daysBack(period, end),
    today,
  );
  const todayStatus = dayStatus(tasks, progress, today);
  const remaining = Math.max(0, todayStatus.total - todayStatus.won);
  const calendar = activityCalendar(today);
  const [selected, setSelected] = useState(today);
  const heat = useRef(null);
  const selectedStatus = dayStatus(tasks, progress, selected);
  const delta = current.daysWon - previous.daysWon;
  const habits = [...current.habits].sort(
    (a, b) =>
      (habitSort === "highest"
        ? b.percent - a.percent
        : a.percent - b.percent) || a.name.localeCompare(b.name),
  );
  function moveDay(event, index) {
    const last = calendar.findIndex((cell) => cell.day === today);
    const moves = {
      ArrowRight: index + 7,
      ArrowLeft: index - 7,
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      Home: Math.floor(index / 7) * 7,
      End: Math.floor(index / 7) * 7 + 6,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const target = calendar[Math.min(last, Math.max(0, moves[event.key]))].day;
    setSelected(target);
    heat.current?.querySelector(`[data-day="${target}"]`)?.focus();
  }
  return (
    <div className="progress-dashboard">
      <PageTitle title="My progress">
        <select
          aria-label="Progress period"
          value={period}
          onChange={(event) => setPeriod(Number(event.target.value))}
        >
          {[7, 30, 90].map((value) => (
            <option key={value} value={value}>
              Last {value} days
            </option>
          ))}
        </select>
      </PageTitle>
      <div className="progress-range">
        {shortDate(keys[0])} — {shortDate(today)}
      </div>
      <div className="progress-summary" aria-label="Selected period summary">
        {[
          [current.daysWon, "Days won"],
          [current.completed, "Habit completions"],
          [current.rate === null ? "—" : `${current.rate}%`, "Completion rate"],
        ].map(([value, label]) => (
          <div className="panel" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-dashboard-grid">
        <section className="panel progress-panel progress-today">
          <header>
            <h2>Today’s minimum</h2>
            {todayStatus.dayWon && (
              <span className="progress-won-label">
                <Check size={13} />
                Day won
              </span>
            )}
          </header>
          <div className="progress-today-count">
            <strong>
              {todayStatus.won}
              <small> / {todayStatus.total}</small>
            </strong>
            <span>habits completed</span>
          </div>
          <div
            className="progress-meter"
            role="progressbar"
            aria-label="Today's scheduled habits completed"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, todayStatus.total)}
            aria-valuenow={todayStatus.won}
          >
            <i
              style={{
                width: `${todayStatus.total ? (todayStatus.won / todayStatus.total) * 100 : 0}%`,
              }}
            />
          </div>
          <footer>
            <span>
              {todayStatus.total
                ? remaining
                  ? `${remaining} remaining`
                  : "All scheduled minimums complete"
                : "No habits scheduled today"}
            </span>
            <Link
              className="button compact"
              to={todayStatus.total ? "/" : "/habits"}
            >
              {todayStatus.total
                ? remaining
                  ? "Continue today"
                  : "View today"
                : "Manage habits"}
              <ArrowRight size={14} />
            </Link>
          </footer>
        </section>
        <section className="panel progress-panel">
          <header>
            <h2>Days won</h2>
            <small>{current.eligible} scheduled days</small>
          </header>
          <div className="progress-win-overview">
            <div
              className="progress-ring"
              role="img"
              aria-label={
                current.eligible
                  ? `${current.daysWon} of ${current.eligible} scheduled days won`
                  : "No scheduled days in this period"
              }
              style={{ "--angle": `${(current.winRate || 0) * 3.6}deg` }}
            >
              <div>
                <strong>
                  {current.winRate === null ? "—" : `${current.winRate}%`}
                </strong>
                <span>days won</span>
              </div>
            </div>
            <div>
              <strong>
                {current.daysWon} / {current.eligible}
              </strong>
              <p>All scheduled habits completed.</p>
              {previous.eligible > 0 && (
                <small className="progress-comparison">
                  {delta === 0
                    ? "Same number as the previous period"
                    : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "day" : "days"} vs previous ${period} days`}
                </small>
              )}
            </div>
          </div>
        </section>
        <section className="panel progress-panel">
          <header>
            <h2>Daily activity</h2>
            <small>Last 12 weeks</small>
          </header>
          <div className="progress-calendar-layout">
            <div className="progress-weekday-labels" aria-hidden="true">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div
              className="progress-heatmap"
              ref={heat}
              role="group"
              aria-label="Daily activity. Use arrow keys to move between days."
            >
              {calendar.map((cell, index) => {
                const status = dayStatus(tasks, progress, cell.day);
                const label = activityLabel(status, cell.future);
                return (
                  <button
                    type="button"
                    data-day={cell.day}
                    key={cell.day}
                    disabled={cell.future}
                    tabIndex={selected === cell.day ? 0 : -1}
                    className={`progress-heat-cell ${cell.future ? "is-future" : !status.total ? "is-rest" : status.dayWon ? "is-won" : status.won ? "is-partial" : "is-empty"}${selected === cell.day ? " is-selected" : ""}`}
                    title={`${shortDate(cell.day)}: ${label}${status.total ? `, ${status.won}/${status.total} completed` : ""}`}
                    aria-label={`${cell.day}: ${label}${status.total ? `, ${status.won} of ${status.total} habits completed` : ""}`}
                    aria-pressed={selected === cell.day}
                    onClick={() => setSelected(cell.day)}
                    onFocus={() => setSelected(cell.day)}
                    onKeyDown={(event) => moveDay(event, index)}
                  />
                );
              })}
            </div>
          </div>
          <div className="progress-activity-detail" role="status">
            <time dateTime={selected}>{shortDate(selected)}</time>
            <span>
              {activityLabel(selectedStatus)}
              {selectedStatus.total
                ? ` · ${selectedStatus.won}/${selectedStatus.total}`
                : ""}
            </span>
          </div>
          <div className="progress-heat-legend">
            <span>
              <i className="is-empty" />
              Not completed
            </span>
            <span>
              <i className="is-partial" />
              Some
            </span>
            <span>
              <i className="is-won" />
              Won
            </span>
            <span>
              <i className="is-rest" />
              Rest
            </span>
          </div>
        </section>
        <section className="panel progress-panel">
          <header>
            <h2>Highest tier reached</h2>
            <small>Per completed habit-day</small>
          </header>
          <div className="progress-tier-distribution">
            {current.distribution.map((value, index) => (
              <div key={index}>
                <Tier level={index + 1} />
                <div className="progress-tier-track" aria-hidden="true">
                  <i
                    className={`t${index + 1}`}
                    style={{
                      width: `${current.completed ? (value / current.completed) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="progress-panel-note">
            T1 counts as a completion. T2 and T3 are optional.
          </p>
        </section>
        <section className="panel progress-panel progress-consistency-panel">
          <header>
            <h2>Habit consistency</h2>
            <select
              aria-label="Sort habit consistency"
              value={habitSort}
              onChange={(event) => setHabitSort(event.target.value)}
            >
              <option value="lowest">Lowest first</option>
              <option value="highest">Highest first</option>
            </select>
          </header>
          <p className="progress-panel-note">
            Completed / scheduled habit-days in this period.
          </p>
          {habits.length ? (
            <div className="progress-habit-list">
              {habits.map((habit) => (
                <div className="progress-habit-row" key={habit.id}>
                  <CategoryIcon category={habit.category} />
                  <div>
                    <strong title={habit.name}>{habit.name}</strong>
                    <div
                      className="progress-habit-meter"
                      role="progressbar"
                      aria-label={`${habit.name}: ${habit.completed} of ${habit.total} completed`}
                      aria-valuemin={0}
                      aria-valuemax={habit.total}
                      aria-valuenow={habit.completed}
                    >
                      <i style={{ width: `${habit.percent}%` }} />
                    </div>
                    <small>
                      {habit.completed}/{habit.total} completed
                    </small>
                  </div>
                  <span>{habit.percent}%</span>
                  {habit.editable ? (
                    <Link
                      className="icon-button"
                      aria-label={`Edit ${habit.name}`}
                      title="Edit habit"
                      to={`/habits/${habit.id}/edit`}
                    >
                      <Edit3 size={16} />
                    </Link>
                  ) : (
                    <span className="progress-history-label">Past</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="progress-empty">
              <Target size={24} />
              <p>No scheduled habit activity in this period.</p>
              <Link className="help-inline-link" to="/habits">
                Manage habits
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
          {current.focus && (
            <div className="progress-focus">
              <div>
                <strong>Review your minimum: {current.focus.name}</strong>
                <p>
                  {current.focus.pastDone}/{current.focus.pastTotal} past
                  scheduled days completed. Consider a smaller T1 or a different
                  schedule.
                </p>
              </div>
              <Link
                className="button secondary compact"
                to={`/habits/${current.focus.id}/edit`}
              >
                Adjust habit
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <div className="progress-footer-links">
        <Link to="/week">
          <CalendarDays size={15} />
          Weekly progress
          <ArrowRight size={13} />
        </Link>
        <Link to="/week/review">
          Weekly reflection
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
