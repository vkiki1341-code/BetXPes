import { useEffect, useState } from 'react';
import { pushNotificationService } from '@/lib/pushNotificationService';

export function usePushNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const granted = await pushNotificationService.isPermissionGranted();
    setPermissionGranted(granted);
    setPermissionRequested(true);
  };

  const requestPermission = async () => {
    const granted = await pushNotificationService.requestPermission();
    setPermissionGranted(granted);
    setPermissionRequested(true);

    if (granted) {
      // Show welcome notification
      await pushNotificationService.sendNotification({
        title: '🔔 Notifications Enabled',
        body: 'You will receive updates about your bets and account activity.',
      });
    }

    return granted;
  };

  return {
    permissionGranted,
    permissionRequested,
    requestPermission,
    notifyBetWon: pushNotificationService.notifyBetWon,
    notifyBetLost: pushNotificationService.notifyBetLost,
    notifyDepositConfirmed: pushNotificationService.notifyDepositConfirmed,
    notifyWithdrawalProcessed: pushNotificationService.notifyWithdrawalProcessed,
    notifyReferralEarning: pushNotificationService.notifyReferralEarning,
    notifyMatchUpdate: pushNotificationService.notifyMatchUpdate,
  };
}
