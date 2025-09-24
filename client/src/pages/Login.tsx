import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        const cookieMatch = document.cookie.match(
          /(?:^|; )redirect_to=([^;]+)/,
        );
        const cookieRedirect = cookieMatch
          ? decodeURIComponent(cookieMatch[1])
          : null;
        const sessionRedirect = sessionStorage.getItem("redirect_to");

        const redirectTo =
          sessionRedirect || cookieRedirect || "/Trinity/sabinas";

        sessionStorage.removeItem("redirect_to");
        document.cookie = "redirect_to=; Max-Age=0; path=/; SameSite=Lax";

        setLocation(redirectTo);
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/static/assets/intro-login.jpg"
        >
          <source src="/static/assets/intro-login.webm" type="video/webm" />
          <source src="/static/assets/intro-login.mp4" type="video/mp4" />
          {/* Fallback image if video doesn't load */}
          <img
            src="/static/assets/intro-login.jpg"
            alt="Login background"
            className="w-full h-full object-cover"
          />
        </video>
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm ">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Access Technical Fiber Optic Information Portal Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/*<div className="mt-4 text-sm defaultlegend text-center">
            Default credentials: lgutierrez@example.com / 123456789
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
