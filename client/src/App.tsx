import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "@/pages/not-found";
import PublicList from "@/pages/PublicList";
import PublicDetail from "@/pages/PublicDetail";
import CmsUpload from "@/pages/CmsUpload";
import Navbar from "@/components/Navbar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicList params={{ cluster: "trk", project: "trinity" }} />} />
      <Route path="/:cluster/:project" component={({ params }: any) => <PublicList params={params} />} />
      <Route path="/:cluster/:project/idf/:code" component={({ params }: any) => <PublicDetail params={params} />} />
      <Route path="/:cluster/:project/admin" component={({ params }: any) => <CmsUpload params={params} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
