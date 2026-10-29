import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, MessageSquare, Inbox, Shield } from "lucide-react";
import { PageTitle } from "./components";
import { useAccess } from "./access";
import { Help } from "./screens/Account";
import { FeedbackPage } from "./screens/Administration";

const sections = [
  [
    "guide",
    BookOpen,
    "Guide & answers",
    "Learn the app and solve common issues.",
  ],
  [
    "feedback",
    MessageSquare,
    "Report or suggest",
    "Report a problem or share an idea.",
  ],
  [
    "submissions",
    Inbox,
    "Your submissions",
    "Check the status of your feedback.",
  ],
];
export function HelpCenter() {
  const [params] = useSearchParams();
  const requested = params.get("section");
  const active = sections.some(([id]) => id === requested)
    ? requested
    : "guide";
  const { isStaff } = useAccess();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active]);
  return (
    <div className="support-center">
      <div className="support-title-row">
        <PageTitle title="Help & feedback" />
        {isStaff && (
          <Link className="support-admin-link" to="/admin/feedback">
            <Shield size={14} />
            Admin inbox
          </Link>
        )}
      </div>
      <p className="support-lede">
        Find an answer, tell us what needs improving, or follow up on your
        feedback.
      </p>
      <nav
        className="support-navigation"
        aria-label="Help and feedback sections"
      >
        {sections.map(([id, Icon, title, copy]) => (
          <Link
            key={id}
            to={`/help?section=${id}`}
            aria-label={title}
            aria-current={active === id ? "page" : undefined}
          >
            <span className="support-nav-icon">
              <Icon size={19} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
          </Link>
        ))}
      </nav>
      <section hidden={active !== "guide"} aria-label="Guide and answers">
        <Help embedded />
      </section>
      <section
        hidden={active === "guide"}
        aria-label={
          active === "submissions"
            ? "Your feedback history"
            : "Send a report or suggestion"
        }
      >
        <FeedbackPage
          embedded
          view={active === "submissions" ? "history" : "compose"}
        />
      </section>
    </div>
  );
}
