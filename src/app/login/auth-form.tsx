"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun } from "lucide-react";

export default function AuthForm({ error, message }: { error?: string, message?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const isLogin = mode === "login";

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="flex items-center gap-2 mb-8 text-primary">
        <Sun className="h-8 w-8" />
        <span className="text-2xl font-bold">Lumi</span>
      </div>
      
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isLogin ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? "Enter your credentials to access your day."
              : "Sign up to start organizing your schedule."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={isLogin ? login : signup} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your Name"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium bg-red-50/50 p-2.5 rounded-md border border-red-100">
                {error}
              </div>
            )}
            
            {message && (
              <div className="text-sm text-green-600 font-medium bg-green-50/50 p-2.5 rounded-md border border-green-100">
                {message}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full">
                {isLogin ? "Log in" : "Sign up"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

