import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'bet_placed' | 'bet_outcome';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const UserNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayNotifications, setDisplayNotifications] = useState<Notification[]>([]);
  const [dismissPending, setDismissPending] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data);
        // Show only the newest unread notifications (max 3)
        setDisplayNotifications(data.slice(0, 3));
      }
    };

    loadNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setDisplayNotifications(prev => [newNotification, ...prev.slice(0, 2)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setDisplayNotifications(prev => prev.filter(n => n.id !== notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
    return error;
  };

  const handleDismiss = async (notificationId: string) => {
    // Optimistically remove the notification from UI, disable the button while updating,
    // and revert if the backend update fails.
    const prevDisplay = displayNotifications;
    const prevAll = notifications;

    // Remove immediately for responsive UX
    setDisplayNotifications(prev => prev.filter(n => n.id !== notificationId));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Track in-progress dismissals to disable buttons
    setDismissPending(prev => new Set(prev).add(notificationId));

    const err = await handleMarkAsRead(notificationId);

    // Remove from pending
    setDismissPending(prev => {
      const copy = new Set(prev);
      copy.delete(notificationId);
      return copy;
    });

    if (err) {
      // Revert UI and inform the user
      setDisplayNotifications(prevDisplay);
      setNotifications(prevAll);
      toast({
        title: 'Could not dismiss notification',
        description: err.message || 'An error occurred while dismissing the notification.'
      });
    }
  };

  // Track dismiss-in-progress IDs to disable controls (state is declared at top)

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit_approved':
      case 'withdrawal_approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'deposit_rejected':
      case 'withdrawal_rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'bet_placed':
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
      case 'bet_outcome':
        return <CheckCircle className="w-5 h-5 text-purple-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'deposit_approved':
        return 'from-green-500/20 via-green-500/10 to-transparent';
      case 'deposit_rejected':
        return 'from-red-500/20 via-red-500/10 to-transparent';
      case 'withdrawal_approved':
        return 'from-blue-500/20 via-blue-500/10 to-transparent';
      case 'withdrawal_rejected':
        return 'from-orange-500/20 via-orange-500/10 to-transparent';
      case 'bet_placed':
        return 'from-blue-500/20 via-blue-500/10 to-transparent';
      case 'bet_outcome':
        return 'from-purple-500/20 via-purple-500/10 to-transparent';
      default:
        return 'from-yellow-500/20 via-yellow-500/10 to-transparent';
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'deposit_approved':
        return 'border-l-green-500';
      case 'deposit_rejected':
        return 'border-l-red-500';
      case 'withdrawal_approved':
        return 'border-l-blue-500';
      case 'withdrawal_rejected':
        return 'border-l-orange-500';
      case 'bet_placed':
        return 'border-l-blue-500';
      case 'bet_outcome':
        return 'border-l-purple-500';
      default:
        return 'border-l-yellow-500';
    }
  };

  if (displayNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {displayNotifications.map(notification => (
        <div
          key={notification.id}
          className={`bg-gradient-to-r ${getGradient(notification.type)} backdrop-blur-xl rounded-lg border border-white/10 ${getBorderColor(notification.type)} border-l-4 shadow-2xl overflow-hidden`}
        >
          <div className="p-4 flex gap-3 items-start">
            <div className="flex-shrink-0 mt-1">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm mb-1">
                {notification.title}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                {notification.message}
              </p>
              <p className="text-white/50 text-xs mt-2">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(notification.id)}
              aria-label={`Dismiss notification ${notification.title}`}
              disabled={dismissPending.has(notification.id)}
              aria-busy={dismissPending.has(notification.id)}
              className={`flex-shrink-0 text-white/60 hover:text-white transition-colors ${dismissPending.has(notification.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-1 bg-gradient-to-r opacity-50" />
        </div>
      ))}
      {notifications.length > 3 && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/20 hover:bg-white/10"
            onClick={() => {
              toast({
                title: "All Notifications",
                description: `You have ${notifications.length} unread notifications.`
              });
            }}
          >
            View All ({notifications.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserNotifications;
