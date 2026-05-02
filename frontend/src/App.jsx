import { useUser } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";

// Code Splitting for Performance
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProblemPage = lazy(() => import("./pages/ProblemPage"));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage"));
const SessionPage = lazy(() => import("./pages/SessionPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));

// Loading Fallback
const ScreenLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-base-100">
    <span className="loading loading-spinner loading-lg text-primary"></span>
  </div>
);

function App() {
  const { isSignedIn, isLoaded } = useUser();

  // this will get rid of the flickering effect
  if (!isLoaded) return <ScreenLoader />;

  return (
    <>
      <Suspense fallback={<ScreenLoader />}>
        <Routes>
          <Route
            path="/"
            element={!isSignedIn ? <HomePage /> : <Navigate to={"/dashboard"} />}
          />
          <Route
            path="/dashboard"
            element={isSignedIn ? <DashboardPage /> : <Navigate to={"/"} />}
          />

          <Route
            path="/problems"
            element={isSignedIn ? <ProblemsPage /> : <Navigate to={"/"} />}
          />
          <Route
            path="/problem/:id"
            element={isSignedIn ? <ProblemPage /> : <Navigate to={"/"} />}
          />
          <Route
            path="/session/:id"
            element={isSignedIn ? <SessionPage /> : <Navigate to={"/"} />}
          />
          <Route
            path="/session/:id/analysis"
            element={isSignedIn ? <AnalysisPage /> : <Navigate to={"/"} />}
          />
        </Routes>
      </Suspense>

      <Toaster toastOptions={{ duration: 3000 }} />
    </>
  );
}

export default App;
