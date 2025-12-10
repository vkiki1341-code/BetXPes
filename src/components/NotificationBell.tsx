import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, X, Loader } from 'lucide-react';

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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

    // Quick load from cache first
    setIsLoading(true);
    const loadNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(50); // Limit to 50 notifications

        if (data) {
          setNotifications(data);
          setUnreadCount(data.length);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Set up real-time subscription for instant updates
    const channel = supabase
      .channel(`notif-bell:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.filter(n => n.id !== payload.new.id));
            setMarkingAsRead(prev => {
              const next = new Set(prev);
              next.delete(payload.new.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    // Optimistic UI update
    setMarkingAsRead(prev => new Set(prev).add(notificationId));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Background update
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      setMarkingAsRead(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic UI update
    const prevNotifications = notifications;
    setNotifications([]);
    setUnreadCount(0);

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Revert on error
      setNotifications(prevNotifications);
      setUnreadCount(prevNotifications.length);
    }
  }, [notifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  // Keyboard support (Escape to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPanel) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showPanel]);

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'deposit_approved':
      case 'bet_placed':
        return 'border-l-green-500 bg-green-500/5';
      case 'deposit_rejected':
        return 'border-l-red-500 bg-red-500/5';
      case 'withdrawal_approved':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'withdrawal_rejected':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'bet_outcome':
        return 'border-l-purple-500 bg-purple-500/5';
      default:
        return 'border-l-yellow-500 bg-yellow-500/5';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-200 active:scale-95"
        title={`${unreadCount} unread notifications`}
      >
        <Bell className={`w-6 h-6 text-slate-300 hover:text-white transition-all duration-200 ${showPanel ? 'text-white scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel - Enhanced Animations */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute right-0 top-12 w-96 max-h-96 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Notifications {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-slate-400 text-sm">({unreadCount})</span>
              )}
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded"
              title="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`p-3 border-l-4 ${getNotificationColor(notification.type)} border-b border-slate-700/30 hover:bg-slate-800/50 transition-all duration-150 cursor-pointer active:bg-slate-800 animate-in fade-in slide-in-from-left-4 duration-300`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start gap-2 opacity-100">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(notification.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {markingAsRead.has(notification.id) && (
                      <Loader className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Loader className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-slate-400 text-sm">No unread notifications</p>
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-700/50 bg-slate-800/30 flex-shrink-0">
              <button
                onClick={handleMarkAllAsRead}
                disabled={isLoading || notifications.length === 0}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all duration-150 active:scale-95"
              >
                Mark All as Read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
