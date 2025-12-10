export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
}

class PushNotificationService {
  private serviceWorkerPath = '/service-worker.js';

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }

    return false;
  }

  async isPermissionGranted(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  async sendNotification(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        // Try to use service worker for background notifications
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            badge: options.badge,
            tag: options.tag,
            data: options.data,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Service worker notification failed:', error);
    }

    // Fallback to basic notification
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Specialized notification types
  async notifyBetWon(amount: number, odds: number): Promise<void> {
    await this.sendNotification({
      title: '🎉 Bet Won!',
      body: `You won KES ${amount.toLocaleString()}! Odds: ${odds.toFixed(2)}`,
      icon: '/favicon.ico',
      tag: 'bet-won',
    });
  }

  async notifyBetLost(stake: number): Promise<void> {
    await this.sendNotification({
      title: '❌ Bet Lost',
      body: `Your bet of KES ${stake.toLocaleString()} was unsuccessful.`,
      tag: 'bet-lost',
    });
  }

  async notifyDepositConfirmed(amount: number): Promise<void> {
    await this.sendNotification({
      title: '✅ Deposit Confirmed',
      body: `KES ${amount.toLocaleString()} has been added to your account.`,
      icon: '/favicon.ico',
      tag: 'deposit-confirmed',
      data: { type: 'deposit' },
    });
  }

  async notifyWithdrawalProcessed(amount: number): Promise<void> {
    await this.sendNotification({
      title: '✅ Withdrawal Processed',
      body: `KES ${amount.toLocaleString()} has been sent to your account.`,
      icon: '/favicon.ico',
      tag: 'withdrawal-processed',
      data: { type: 'withdrawal' },
    });
  }

  async notifyReferralEarning(amount: number, referreeName: string): Promise<void> {
    await this.sendNotification({
      title: '💰 Referral Earning!',
      body: `You earned KES ${amount.toLocaleString()} from ${referreeName}'s activity.`,
      icon: '/favicon.ico',
      tag: 'referral-earning',
      data: { type: 'referral' },
    });
  }

  async notifyMatchUpdate(homeTeam: string, awayTeam: string, score: string): Promise<void> {
    await this.sendNotification({
      title: '⚽ Match Update',
      body: `${homeTeam} vs ${awayTeam}: ${score}`,
      tag: 'match-update',
      data: { type: 'match' },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
