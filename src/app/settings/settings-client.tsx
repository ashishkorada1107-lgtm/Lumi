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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your public profile details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input 
              id="displayName"
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="Your Name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="text-sm px-3 py-2 border rounded-md bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500">
              {userEmail}
            </div>
          </div>

          {profileMessage && (
            <div className={`p-2.5 rounded-md text-sm font-medium ${profileMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
              {profileMessage.text}
            </div>
          )}

          <Button onClick={handleSaveProfile} className="w-full">
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your Lumi account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => {
            localStorage.removeItem("lumi_device_id");
            logout();
          }} className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure your daily morning briefing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Morning Briefing</Label>
              <p className="text-sm text-zinc-500">
                Receive a push notification every morning with your day at a glance.
              </p>
              <p className="text-xs font-medium text-zinc-400 mt-1">
                Status: {subStatus}
              </p>
            </div>
            <Switch
              checked={briefingEnabled}
              onCheckedChange={handleToggle}
              disabled={!isSupported || permissionState === "denied"}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Morning briefing time</Label>
              <p className="text-sm text-zinc-500">
                The time you'll receive your notification.
              </p>
              <p className="text-xs font-medium text-zinc-400 mt-1">
                Timezone: {timezone}
              </p>
            </div>
            <Input 
              type="time" 
              value={briefingTime} 
              onChange={handleTimeChange} 
              className="w-32"
            />
          </div>

          <div className="pt-4 border-t dark:border-zinc-800">
            <Button variant="outline" onClick={handleTest} disabled={!briefingEnabled}>
              Send Test Notification
            </Button>
            <p className="text-xs text-zinc-500 mt-2">
              Development only. This immediately triggers a briefing notification using today's data.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Important Deployment Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Push notifications are now enabled using the standard Web Push API. However, to receive the notification <strong>automatically every morning without the app being open</strong>, a backend Cron Job is required.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            When you deploy Lumi to Vercel or your preferred platform, you will need to set up a Cron Job (e.g., Vercel Cron) that hits a secure API endpoint daily. That API endpoint should query the `push_subscriptions` table, check the user's saved briefing time, and use the `web-push` library to send the generated briefing directly to their device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
