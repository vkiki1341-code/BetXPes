import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationPermissionPrompt() {
  const { permissionGranted, requestPermission } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if user hasn't granted permission
    const timer = setTimeout(() => {
      if (!permissionGranted && !localStorage.getItem('notification_prompt_dismissed')) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [permissionGranted]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPrompt(false);
      localStorage.setItem('notification_prompt_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification_prompt_dismissed', 'true');
  };

  if (!showPrompt || permissionGranted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-card border border-border rounded-lg shadow-lg p-4 w-full max-w-xs animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-foreground mb-1">Stay Updated</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get notifications for bet results, deposits, and withdrawals.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRequestPermission} className="bg-primary hover:bg-primary/90">
                Enable
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Not Now
              </Button>
            </div>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
