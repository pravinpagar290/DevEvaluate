import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import { Routes, Route, Navigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import Home from "./pages/Home.jsx";
import Problems from "./pages/Problems.jsx";

function App() {
  const { isSignedIn } = useUser();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/problems"
        element={isSignedIn ? <Problems /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;
