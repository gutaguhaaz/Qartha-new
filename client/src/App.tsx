import { Route, Router, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import Navbar from "./components/Navbar";
import PublicList from "./pages/PublicList";
import PublicDetail from "./pages/PublicDetail";
import CmsUpload from "./pages/CmsUpload";
import NotFound from "./pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient();

function RouteHandler() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    // If user is at root or just cluster/project without trailing slash, redirect to list
    const pathParts = location.split("/").filter(Boolean);

    // Handle root path
    if (location === "/") {
      navigate("/Trinity/Sabinas");
      return;
    }

    // Handle cluster/project path without specific route
    if (pathParts.length === 2 && !location.includes("/idf/") && !location.includes("/admin")) {
      // Already at the correct path for PublicList
      return;
    }
  }, [location, navigate]);

  return (
    <>
      <Route path="/" component={PublicList} />
      <Route path="/:cluster/:project" component={PublicList} />
      <Route path="/:cluster/:project/idf/:code" component={PublicDetail} />
      <Route path="/:cluster/:project/admin" component={CmsUpload} />
      <Route component={NotFound} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Router>
          <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <main className="flex-1">
              <RouteHandler />
            </main>
          </div>
          <Toaster />
        </Router>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;