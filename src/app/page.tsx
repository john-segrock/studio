"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Server, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    withCredentials: true,
});

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes

type Status = "idle" | "running" | "success" | "error";

function StatusIndicator({ status }: { status: Status }) {
  const config: Record<Status, { text: string; className: string }> = {
    idle: { text: "Idle. Waiting for next run.", className: "bg-muted-foreground" },
    running: { text: "Running keep-alive task...", className: "bg-primary animate-pulse" },
    success: { text: "Last run successful.", className: "bg-primary" },
    error: { text: "Last run failed.", className: "bg-destructive" },
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={cn("h-3 w-3 rounded-full flex-shrink-0", config[status].className)} />
      <p className="text-sm text-muted-foreground">{config[status].text}</p>
    </div>
  );
}


export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }, []);

  const keepAlive = useCallback(async () => {
    setStatus("running");
    addLog("🚀 Starting keep-alive sequence...");

    const email = process.env.NEXT_PUBLIC_KEEP_ALIVE_EMAIL;
    const password = process.env.NEXT_PUBLIC_KEEP_ALIVE_PASSWORD;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!baseUrl || !email || !password || baseUrl === 'https://your-backend-url.com') {
        const errorMsg = "Configuration error: Missing or default environment variables. Please update your .env.local file.";
        addLog(`❌ ${errorMsg}`);
        setStatus("error");
        setNextRun(new Date(Date.now() + KEEP_ALIVE_INTERVAL));
        return;
    }
    
    try {
        addLog("1/3: Attempting to log in...");
        await api.post("/api/auth/login", { email, password });
        addLog("✅ Login successful.");

        addLog("2/3: Verifying session...");
        const meResponse = await api.get("/api/auth/me");
        addLog(`✅ Session verified for user: ${meResponse.data.email || 'N/A'}`);

        addLog("3/3: Logging out...");
        await api.post("/api/auth/logout");
        addLog("✅ Logout successful.");

        addLog("🎉 Keep-alive sequence completed successfully.");
        setStatus("success");
        setLastRun(new Date());

    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
        addLog(`❌ Error during sequence: ${errorMessage}`);
        if (error.response) {
            addLog(`Status: ${error.response.status} - ${error.response.statusText}`);
        }
        setStatus("error");
    } finally {
        const next = new Date(Date.now() + KEEP_ALIVE_INTERVAL);
        setNextRun(next);
        addLog(`Next run scheduled for ${next.toLocaleTimeString()}.`);
    }
  }, [addLog]);

  useEffect(() => {
    if (!isClient) return;

    if (!process.env.NEXT_PUBLIC_API_BASE_URL || !process.env.NEXT_PUBLIC_KEEP_ALIVE_EMAIL || !process.env.NEXT_PUBLIC_KEEP_ALIVE_PASSWORD || process.env.NEXT_PUBLIC_API_BASE_URL === 'https://your-backend-url.com') {
        addLog("⚠️ Warning: Environment variables are not set or are default. Please create and configure a .env.local file.");
        setStatus("error");
    }

    keepAlive(); 
    const intervalId = setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isClient, keepAlive, addLog]);

  useEffect(() => {
    if (!isClient) return;

    const countdownInterval = setInterval(() => {
      if (nextRun) {
        const now = Date.now();
        const diff = nextRun.getTime() - now;

        if (diff <= 0) {
          setCountdown("00:00");
          return;
        }

        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isClient, nextRun]);
  

  if (!isClient) {
    return null;
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl shadow-2xl shadow-primary/10">
        <CardHeader>
          <div className="flex items-center space-x-4">
             <div className="bg-primary/10 p-3 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
             </div>
            <div>
                <CardTitle className="text-2xl font-headline">Backend Guardian</CardTitle>
                <CardDescription>Keeping your backend service awake and responsive.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground"/>
                    <div>
                        <p className="text-sm font-medium text-foreground/80">Status</p>
                        <StatusIndicator status={status} />
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground"/>
                    <div>
                        <p className="text-sm font-medium text-foreground/80">Next Run In</p>
                        <p className="text-lg font-semibold font-mono">{countdown || "--:--"}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground"/>
                    <div>
                        <p className="text-sm font-medium text-foreground/80">Last Success</p>
                        <p className="text-sm text-muted-foreground">{lastRun ? lastRun.toLocaleString() : "N/A"}</p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-2">
                <h3 className="font-semibold">Activity Log</h3>
                <ScrollArea className="h-64 w-full rounded-md border">
                    <div className="p-4">
                        {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity yet. Waiting for the first run...</p>}
                        {logs.map((log, index) => (
                          <p key={index} className="text-sm font-mono text-muted-foreground whitespace-pre-wrap pb-1">
                              {log}
                          </p>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">This page automatically runs the keep-alive task every 14 minutes.</p>
        </CardFooter>
      </Card>
    </main>
  );
}
