import { useLocation, matchPath } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { routesDefinition } from "@/routes/routesDefinition";

export const useSyncRouteWithSelections = () => {
  const { app } = useQlikApp();
  const location = useLocation();

  const currentRoute = useMemo(() => {
    return routesDefinition.find((route) =>
      matchPath({ path: route.href, end: false }, location.pathname),
    );
  }, [location.pathname]);

  useEffect(() => {
    if (currentRoute && app) {
      app.abortModal(false);
    }
  }, [app, currentRoute, location]);

  return { currentRoute };
};
