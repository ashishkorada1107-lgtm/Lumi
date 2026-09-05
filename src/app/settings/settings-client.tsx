"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePushSubscription, removePushSubscription, sendTestNotification, saveProfile } from "./actions";
import { logout } from "../login/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsClient({ userEmail, initialName, vapidPublicKey }: { userEmail: string, initialName: string, vapidPublicKey: string }) {
  const [displayName, setDisplayName] = useState(initialName);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [briefingEnabled, setBriefingEnabled] = useState(false);
  const [briefingTime, setBriefingTime] = useState("07:00");
  const [timezone, setTimezone] = useState("");
  const [permissionState, setPermissionState] = useState<string>("default");
  const [subStatus, setSubStatus] = useState<string>("Checking...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const getDeviceId = () => {
    let id = localStorage.getItem("lumi_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("lumi_device_id", id);
    }
    return id;
  };

  // Load from local storage
  useEffect(() => {
    const savedTime = localStorage.getItem("lumi_briefing_time") || "07:00";
    setBriefingTime(savedTime);
    
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setTimezone(tz);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      setSubStatus("Notifications unsupported");
      return;
    }
    
    const checkState = async () => {
      const perm = Notification.permission;
      setPermissionState(perm);
      
      if (perm === "denied") {
        setSubStatus("Permission denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Force sync to Supabase on load so we never have a ghost subscription
          const subJSON = JSON.parse(JSON.stringify(sub));
          let deviceId = getDeviceId();
          let res = await savePushSubscription(deviceId, subJSON, tz, savedTime, true);
          
          if (res.error && res.error.includes("row-level security policy")) {
            deviceId = crypto.randomUUID();
            localStorage.setItem("lumi_device_id", deviceId);
            res = await savePushSubscription(deviceId, subJSON, tz, savedTime, true);
          }

          if (res.error) {
            setSubStatus("Subscription failed");
            setErrorMsg("Failed to sync subscription to database.");
            setBriefingEnabled(false);
          } else {
            setSubStatus("Device subscribed");
            setBriefingEnabled(true);
          }
        } else {
          if (perm === "granted") {
            setSubStatus("Permission granted, subscription not created");
          } else {
            setSubStatus("Permission not granted");
          }
          setBriefingEnabled(false);
        }
      } catch (err: any) {
        console.error("SW check error:", err);
        setSubStatus("Service worker unavailable");
      }
    };
    
    checkState();
  }, []);

  const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBriefingTime(val);
    localStorage.setItem("lumi_briefing_time", val);
    
    // Sync with DB if currently enabled
    if (briefingEnabled) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const subJSON = JSON.parse(JSON.stringify(sub));
          let deviceId = getDeviceId();
          let res = await savePushSubscription(deviceId, subJSON, timezone, val, true);
          
          if (res.error && res.error.includes("row-level security policy")) {
            deviceId = crypto.randomUUID();
            localStorage.setItem("lumi_device_id", deviceId);
            await savePushSubscription(deviceId, subJSON, timezone, val, true);
          }
        }
      } catch (err) {
        console.error("Failed to sync new time", err);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setProfileMessage({ type: 'error', text: 'Name cannot be empty' });
      return;
    }
    setProfileMessage(null);
    const res = await saveProfile(displayName.trim());
    if (res.error) {
      setProfileMessage({ type: 'error', text: res.error });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
    }
  };

  const handleToggle = async (checked: boolean) => {
    setErrorMsg(null);
    if (!isSupported) {
      setErrorMsg("Push notifications are not supported in this browser.");
      return;
    }

    if (checked) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
        if (perm !== "granted") {
          setSubStatus("Permission denied");
          setErrorMsg("Notification permission denied. Please allow it in browser settings.");
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        
        // Unsubscribe from any existing subscription to clear old VAPID keys
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey.replace(/['"]/g, '').trim())
        });

        const subJSON = JSON.parse(JSON.stringify(sub));
        let deviceId = getDeviceId();
        let res = await savePushSubscription(deviceId, subJSON, timezone, briefingTime, true);
        
        if (res.error && res.error.includes("row-level security policy")) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("lumi_device_id", deviceId);
          res = await savePushSubscription(deviceId, subJSON, timezone, briefingTime, true);
        }

        if (res.error) throw new Error(res.error);
        
        setSubStatus("Device subscribed");
        setBriefingEnabled(true);
      } catch (err: any) {
        console.error(err);
        setSubStatus("Subscription failed");
        setErrorMsg(err.message || "Failed to subscribe to push notifications");
        setBriefingEnabled(false);
      }
    } else {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            // Unsubscribe from browser
            await sub.unsubscribe();
        }
        
        await removePushSubscription(getDeviceId());
        setSubStatus("Permission granted, subscription not created");
        setBriefingEnabled(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to unsubscribe");
      }
    }
  };

  const handleTest = async () => {
    setErrorMsg(null);
    try {
      const res = await sendTestNotification(getDeviceId());
      if (res?.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Test failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-6">
      <div className="px-1 md:px-0">
        <p className="text-[11px] md:text-xs font-semibold md:font-medium text-zinc-500 uppercase tracking-[0.18em] md:tracking-widest mb-2 md:mb-1">Preferences</p>
        <h1 className="text-3xl md:text-2xl font-bold md:font-semibold text-zinc-50 md:text-zinc-100 tracking-tight leading-none md:leading-normal">Settings</h1>
      </div>

      <Card className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl md:rounded-xl">
        <CardHeader className="px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-lg md:text-base font-semibold md:font-medium text-zinc-100">Profile</CardTitle>
          <CardDescription className="text-sm md:text-xs text-zinc-500">Manage your public profile details.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6 space-y-5 md:space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs font-medium uppercase tracking-wider text-zinc-400">Name</Label>
            <Input 
              id="displayName"
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="Your Name"
              className="h-11 md:h-9 bg-zinc-800/80 border-zinc-700/60 text-zinc-100 focus:border-indigo-500"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Email</Label>
            <div className="flex min-h-11 md:min-h-0 items-center text-sm px-3 py-2 border border-zinc-800 rounded-lg md:rounded-md bg-zinc-800/40 text-zinc-400 break-all">
              {userEmail}
            </div>
          </div>

          {profileMessage && (
            <div className={`p-3 rounded-lg md:rounded-md text-sm font-medium ${profileMessage.type === 'error' ? 'bg-red-950/40 text-red-400 border border-red-800/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'}`}>
              {profileMessage.text}
            </div>
          )}

          <Button onClick={handleSaveProfile} className="w-full h-11 md:h-9 rounded-xl md:rounded-md bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none">
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl md:rounded-xl">
        <CardHeader className="px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-lg md:text-base font-semibold md:font-medium text-zinc-100">Account</CardTitle>
          <CardDescription className="text-sm md:text-xs text-zinc-500">Manage your DailyFlow session.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
          <Button variant="outline" onClick={() => {
            localStorage.removeItem("lumi_device_id");
            logout();
          }} className="w-full h-11 md:h-9 rounded-xl md:rounded-md border-red-900/50 bg-red-950/20 text-red-300 hover:text-red-200 hover:bg-red-950/40 md:border-zinc-700/60 md:bg-zinc-950 md:text-zinc-300 md:hover:text-white md:hover:bg-zinc-800/60">
            Log out
          </Button>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl md:rounded-xl">
        <CardHeader className="px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-lg md:text-base font-semibold md:font-medium text-zinc-100">Notifications</CardTitle>
          <CardDescription className="text-sm md:text-xs text-zinc-500">Configure your daily morning briefing.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6 space-y-6 md:space-y-5">
          {errorMsg && (
            <div className="bg-red-950/30 text-red-400 border border-red-800/40 p-3 rounded-xl md:rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}
          
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-zinc-200">Enable Morning Briefing</Label>
              <p className="text-sm md:text-xs text-zinc-500 leading-relaxed">
                Receive a push notification every morning with your day at a glance.
              </p>
              <p className="text-[11px] font-medium text-zinc-400 mt-1">
                Status: {subStatus}
              </p>
            </div>
            <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-end">
              <Switch
                checked={briefingEnabled}
                onCheckedChange={handleToggle}
                disabled={!isSupported || permissionState === "denied"}
              />
            </div>
          </div>

          <div className="flex min-h-11 items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-zinc-200">Morning briefing time</Label>
              <p className="text-sm md:text-xs text-zinc-500 leading-relaxed">
                The time you&apos;ll receive your notification.
              </p>
              <p className="text-[11px] font-medium text-zinc-400 mt-1">
                Timezone: {timezone}
              </p>
            </div>
            <Input 
              type="time" 
              value={briefingTime} 
              onChange={handleTimeChange} 
              className="h-11 md:h-9 w-32 shrink-0 bg-zinc-800/80 border-zinc-700/60 text-zinc-100"
            />
          </div>

          <div className="pt-5 md:pt-4 border-t border-zinc-800/80">
            <Button variant="outline" onClick={handleTest} disabled={!briefingEnabled} className="h-11 md:h-9 w-full sm:w-auto rounded-xl md:rounded-md border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800/60">
              Send Test Notification
            </Button>
            <p className="text-[11px] text-zinc-500 mt-2">
              Development only. This immediately triggers a briefing notification using today&apos;s data.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl md:rounded-xl">
        <CardHeader className="px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">Important Deployment Note</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
          <p className="text-xs text-zinc-500 leading-relaxed mb-3">
            Push notifications are enabled using the standard Web Push API. To receive notifications <strong>automatically every morning without the app being open</strong>, a backend Cron Job is required.
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            In production on Vercel, the Cron Job triggers the secure API endpoint daily to send the generated briefing directly to subscribed devices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
