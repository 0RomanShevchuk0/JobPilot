import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

// a data router, for ScrollRestoration (App); the pages' routes stay in App, under one route for all
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <QueryClientProvider client={queryClient}>
         <RouterProvider router={router} />
      </QueryClientProvider>
   </StrictMode>,
);
