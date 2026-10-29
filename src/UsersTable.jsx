import React, { useState } from "react";
import {
  Search,
  Users,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  SlidersHorizontal,
  Shield,
  LockKeyhole,
} from "lucide-react";
import { ROLE_LABELS } from "./access-labels.js";
import {
  joinedMillis,
  paginateUsers,
  selectUsers,
  templateCounts,
  userRole,
} from "./users.js";

const safePhoto = (value) =>
  typeof value === "string" &&
  value.length <= 2000 &&
  /^https:\/\/[A-Za-z0-9.-]+\.googleusercontent\.com\//.test(value)
    ? value
    : "";
function UserPhoto({ row }) {
  const [failed, setFailed] = useState(false);
  const photo = safePhoto(row.photoURL);
  const initials = (row.displayName || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="users-avatar"
      aria-label={`Profile image for ${row.displayName || "unnamed user"}`}
    >
      {photo && !failed ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
function RoleControl({ row, role, canEdit, disabled, busy, onChange }) {
  const [draft, setDraft] = useState(role);
  return (
    <div className="users-role-action">
      <select
        aria-label={`Role for ${row.displayName || row.id}`}
        value={draft}
        disabled={!canEdit || disabled}
        onChange={(event) => setDraft(event.target.value)}
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        className="users-change"
        disabled={!canEdit || disabled || role === draft}
        onClick={() => onChange(row.id, draft)}
        aria-label={`Change role for ${row.displayName || row.id}`}
      >
        {busy ? "Saving…" : "Change role"}
      </button>
    </div>
  );
}
export function UsersTable({
  users,
  roles,
  templates,
  currentUserId,
  isSuperAdmin,
  online,
  busy,
  onChangeRole,
  setNotice,
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copied, setCopied] = useState("");
  const roleMap = Object.fromEntries(
    roles.rows.map((row) => [row.id, row.role]),
  );
  const counts = templateCounts(templates.rows);
  const filtered = selectUsers(users.rows, roleMap, counts, {
    search,
    role: roleFilter,
    sort,
  });
  const pagination = paginateUsers(filtered, page, pageSize);
  const loading = users.loading || roles.loading;
  const staffCount = users.rows.filter(
    (row) => userRole(roleMap, row.id) !== "user",
  ).length;
  const reset = () => {
    setSearch("");
    setRoleFilter("all");
    setSort("name");
    setPage(1);
  };
  async function copyId(id) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setNotice("User ID copied.");
    } catch {
      setNotice("Could not copy. Select the user ID to copy it manually.");
    }
  }
  const stats = [
    [
      Users,
      "Total users",
      users.rows.length,
      "Everyone in your community",
      users.loading || !!users.error,
    ],
    [
      ShieldCheck,
      "Team members",
      staffCount,
      "Admins & super admins",
      loading || !!users.error || !!roles.error,
    ],
    [
      Layers,
      "Templates posted",
      templates.rows.length,
      "Currently published templates",
      templates.loading || !!templates.error,
    ],
  ];
  return (
    <>
      <div className="users-summary">
        {stats.map(([Icon, label, value, caption, unavailable]) => (
          <div className="users-stat" key={label}>
            <span className="users-stat-icon">
              <Icon size={19} />
            </span>
            <span className="users-stat-label">{label}</span>
            <strong>{unavailable ? "—" : value.toLocaleString()}</strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>
      <section className="panel users-directory" aria-label="User directory">
        <div className="users-directory-heading">
          <div>
            <h2>
              All users{" "}
              <span>
                {users.loading || users.error ? "—" : users.rows.length}
              </span>
            </h2>
            <p>People, permissions, and community contributions.</p>
          </div>
          <span className="users-access-note">
            <LockKeyhole size={14} />
            {isSuperAdmin ? "Role management enabled" : "Read-only access"}
          </span>
        </div>
        <div className="users-filters">
          <label className="users-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search by name or user ID…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="users-select">
            <SlidersHorizontal size={16} />
            <span className="visually-hidden">Filter by role</span>
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="users-select">
            <span className="visually-hidden">Sort users</span>
            <select
              aria-label="Sort users"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              <option value="name">Name: A–Z</option>
              <option value="newest">Newest joined</option>
              <option value="templates">Most templates</option>
            </select>
          </label>
        </div>
        <div
          className="users-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Users table, scroll horizontally for all columns"
        >
          <table className="users-table" aria-busy={loading}>
            <caption className="visually-hidden">
              Users with profile, ID, role, join date, public template count,
              profile status and role controls.
            </caption>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">User ID</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col" className="users-number">
                  Templates posted
                </th>
                <th scope="col">Profile status</th>
                <th scope="col">Role management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <p className="users-table-empty" role="status">
                      Loading users…
                    </p>
                  </td>
                </tr>
              ) : users.error ? (
                <tr>
                  <td colSpan={7}>
                    <p className="users-table-empty">
                      The user directory is unavailable. Check the error above.
                    </p>
                  </td>
                </tr>
              ) : (
                pagination.rows.map((row) => {
                  const role = userRole(roleMap, row.id);
                  const isSelf = row.id === currentUserId;
                  const joined = joinedMillis(row.createdAt);
                  return (
                    <tr key={row.id} className={isSelf ? "users-self" : ""}>
                      <td>
                        <div className="users-person">
                          <UserPhoto key={row.photoURL} row={row} />
                          <div>
                            <h3>
                              {row.displayName || "Unnamed user"}
                              {isSelf && <span className="users-you">You</span>}
                            </h3>
                            <span className="users-person-sub">
                              {row.nameConfirmed === true
                                ? "Community member"
                                : "Profile setup pending"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="users-id">
                          <code title={row.id}>{row.id}</code>
                          <button
                            className="users-copy"
                            aria-label={`Copy ID for ${row.displayName || row.id}`}
                            onClick={() => copyId(row.id)}
                          >
                            {copied === row.id ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`users-role-badge ${role}`}>
                          {role !== "user" && <Shield size={12} />}{" "}
                          {roles.error ? "Unavailable" : ROLE_LABELS[role]}
                        </span>
                      </td>
                      <td>
                        {joined ? (
                          <time dateTime={new Date(joined).toISOString()}>
                            {new Date(joined).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                        ) : (
                          <span
                            className="users-unknown"
                            title="This account predates join-date tracking."
                          >
                            Not recorded
                          </span>
                        )}
                      </td>
                      <td className="users-number">
                        <span className="users-template-count">
                          {templates.loading || templates.error
                            ? "—"
                            : counts[row.id] || 0}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`users-profile-status ${row.nameConfirmed === true ? "complete" : "pending"}`}
                        >
                          <i />
                          {row.nameConfirmed === true
                            ? "Complete"
                            : "Pending setup"}
                        </span>
                      </td>
                      <td>
                        {isSuperAdmin ? (
                          <>
                            <RoleControl
                              key={`${row.id}:${role}`}
                              row={row}
                              role={role}
                              canEdit={!isSelf}
                              disabled={
                                !!busy ||
                                !online ||
                                !!roles.error ||
                                roles.loading
                              }
                              busy={busy === row.id}
                              onChange={onChangeRole}
                            />
                            {isSelf && (
                              <small className="users-self-note">
                                You can’t change your own role
                              </small>
                            )}
                          </>
                        ) : (
                          <span className="users-unknown">
                            Super admin only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && !users.error && !filtered.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="users-table-empty">
                      <Search size={26} />
                      <h3>No users found</h3>
                      <p>Try a different name, user ID, or role.</p>
                      <button className="text-button" onClick={reset}>
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="users-pagination">
          <p role="status" aria-live="polite">
            {loading ? (
              "Loading directory…"
            ) : users.error ? (
              "Directory unavailable"
            ) : (
              <>
                Showing{" "}
                <strong>
                  {pagination.start}–{pagination.end}
                </strong>{" "}
                of <strong>{filtered.length}</strong> users
              </>
            )}
          </p>
          <div className="users-page-controls">
            <label>
              Rows per page
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="users-page-buttons">
              <button
                aria-label="First page"
                disabled={loading || pagination.page === 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                aria-label="Previous page"
                disabled={loading || pagination.page === 1}
                onClick={() => setPage(pagination.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                aria-label="Next page"
                disabled={loading || pagination.page === pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                aria-label="Last page"
                disabled={loading || pagination.page === pagination.totalPages}
                onClick={() => setPage(pagination.totalPages)}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
      <p className="users-footnote">
        <ShieldCheck size={15} />
        Only super admins can change roles. Private habits and private templates
        stay private.
      </p>
    </>
  );
}
