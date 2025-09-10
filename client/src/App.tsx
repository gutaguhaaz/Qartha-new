import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PublicList from "@/pages/PublicList";
import PublicDetail from "@/pages/PublicDetail";
import CmsUpload from "@/pages/CmsUpload";
import Navbar from "@/components/Navbar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicList cluster="trk" project="trinity" />} />
      <Route path="/:cluster/:project" component={PublicList} />
      <Route path="/:cluster/:project/idf/:code" component={PublicDetail} />
      <Route path="/:cluster/:project/cms" component={CmsUpload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <Navbar />
          <main className="flex-1">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
