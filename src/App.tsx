import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inspections from "./pages/Inspections";
import InspectionDetail from "./pages/InspectionDetail";
import CreateInspection from "./pages/CreateInspection";
import Products from "./pages/Products";
import ProductSpecifications from "./pages/ProductSpecifications";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Dashboard Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inspections" element={<Inspections />} />
                <Route path="/inspections/new" element={<CreateInspection />} />
                <Route path="/inspections/:id" element={<InspectionDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id/specifications" element={<ProductSpecifications />} />
                <Route path="/users" element={<Users />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
