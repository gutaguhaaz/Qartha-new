import { Route, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import Navbar from "./components/Navbar";
import ClusterDirectory from "./pages/ClusterDirectory";
import PublicList from "./pages/PublicList";
import PublicDetail from "./pages/PublicDetail";
import CmsUpload from "./pages/CmsUpload";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/not-found";
import { AuthProvider } from "./contexts/AuthContext";
const queryClient = new QueryClient();

function App() {
  const currentYear = new Date().getFullYear();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-background">
              <Navbar />
              <main className="flex-1">
                <Route path="/login" component={Login} />
                <Route path="/403" component={() => <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Access Denied - Admin required</div></div>} />
                <Route path="/" component={ClusterDirectory} />
                <Route path="/:cluster/:project/idf/:code">
                  {(params) => (
                    <ProtectedRoute>
                      <PublicDetail
                        params={
                          params as {
                            cluster: string;
                            project: string;
                            code: string;
                          }
                        }
                      />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/:cluster/:project">
                  {() => (
                    <ProtectedRoute>
                      <PublicList />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/:cluster/:project/cms">
                  {() => (
                    <ProtectedRoute requireAdmin>
                      <CmsUpload />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route component={NotFound} />
              </main>
              <footer className="border-t border-border bg-background py-4 text-center text-xs text-muted-foreground sm:text-sm">
                ©{currentYear}. Inpro Telecom, Rk Squared. All Rights Reserved.
              </footer>
            </div>
            <Toaster />
          </Router>
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;