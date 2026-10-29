import { Navigate, Outlet, useRoutes } from "react-router-dom";
import { routesDefinition } from "./routesDefinition";
import Layout from "@/layout/wrapper";
import { PropsWithChildren } from "react";
import { useQlik } from "@cluster-data-experience/qlik-modules";
import { DisconnectionDialog } from "@/components/DisconnectionDialog/DisconnectionDialog";
import { ExtrairObjetos } from "@/pages/ExtrairObjetos/ExtrairObjetos";

// Connection guard component
const ConnectionGuard = ({ children }: PropsWithChildren) => {
  const { sessionState, loading } = useQlik();

  // "disconnected" é também o estado inicial da lib: só conta depois de conectar (loading false),
  // quando significa que o socket fechou (rede caiu, máquina dormiu) e a lib não religa sozinha
  const desconectado = sessionState === "timedOut" || (sessionState === "disconnected" && !loading);
  return (
    <>
      {children}
      <DisconnectionDialog disconnected={desconectado} />
    </>
  );
};

const Routes = () => {
  const defaultPath = routesDefinition[0].href;

  return useRoutes([
    {
      path: "/",
      element: <Navigate to={defaultPath} replace />,
    },
    {
      path: "/",
      element: (
        <ConnectionGuard>
          <Layout>
            <Outlet />
          </Layout>
        </ConnectionGuard>
      ),
      children: [
        ...routesDefinition.map(({ href, element }) => ({ path: href, element })),
        // Só no npm run dev: extração das definições dos objetos do mashup antigo
        ...(import.meta.env.DEV ? [{ path: "/extrair-objetos", element: <ExtrairObjetos /> }] : []),
      ],
    },
    {
      path: "*",
      element: <Navigate to={defaultPath} replace />,
    },
  ]);
};

export default Routes;
