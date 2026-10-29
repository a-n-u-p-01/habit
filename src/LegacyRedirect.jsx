import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Empty } from "./components";
import { legacyRouteTarget } from "./routing.js";

export function LegacyRedirect() {
  const location = useLocation();
  const target = legacyRouteTarget(
    location.pathname,
    location.search,
    location.hash,
  );
  // Preserve template/customization state as well as URL parameters.
  return target ? (
    <Navigate to={target} state={location.state} replace />
  ) : (
    <Empty title="Page not found">This address is not available.</Empty>
  );
}
