// Compatibility targets for old bookmarks. Never rewrite unrelated routes.
export function legacyRouteTarget(pathname, search = "", hash = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  let destination;
  if (path === "/tasks/new") destination = "/habits/new";
  else if (path === "/tasks/new/manual") destination = "/habits/new/manual";
  else if (/^\/tasks\/[^/]+\/edit$/.test(path))
    destination = path.replace(/^\/tasks\//, "/habits/");
  else if (/^\/task\/[^/]+$/.test(path))
    destination = path.replace(/^\/task\//, "/habits/");
  else if (path === "/review") destination = "/week/review";
  else if (path === "/profile") destination = "/settings";
  else if (path === "/feedback") {
    const params = new URLSearchParams(search);
    params.set("section", "feedback");
    return `/help?${params.toString()}${hash}`;
  } else return null;
  return `${destination}${search}${hash}`;
}
export function isHabitCreationPath(pathname) {
  const path = pathname.replace(/\/+$/, "");
  return path === "/habits/new" || path.startsWith("/habits/new/");
}
