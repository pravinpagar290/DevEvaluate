import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import { Routes, Route, Navigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import HomePage from "./pages/HomePage.jsx";
import Problems from "./pages/ProblemsPage.jsx";

function App() {
  const { isSignedIn } = useUser();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/problems"
        element={isSignedIn ? <ProblemsPage /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;
