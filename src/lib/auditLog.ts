import { supabase } from '@/lib/supabaseClient';

export interface AuditAction {
  action: string;
  details?: Record<string, any>;
  status?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
}

export async function logAuditAction(userId: string, auditAction: AuditAction) {
  try {
    // Get client IP and user agent
    const userAgent = navigator.userAgent;

    // Insert audit log into Supabase
    const { error } = await supabase
      .from('user_actions')
      .insert({
        user_id: userId,
        action: auditAction.action,
        details: auditAction.details || {},
        user_agent: userAgent,
        status: auditAction.status || 'success',
        error_message: auditAction.errorMessage || null,
      });

    if (error) {
      console.error('Failed to log audit action:', error);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}

export async function getUserActions(userId: string, limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('user_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch user actions:', err);
    return [];
  }
}

export async function getActionsByType(userId: string, actionType: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('user_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('action', actionType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch actions by type:', err);
    return [];
  }
}

export async function getAuditStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_actions')
      .select('action, status')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      totalActions: data?.length || 0,
      byAction: {} as Record<string, number>,
      byStatus: { success: 0, failed: 0, pending: 0 },
    };

    data?.forEach((item) => {
      stats.byAction[item.action] = (stats.byAction[item.action] || 0) + 1;
      if (item.status) {
        stats.byStatus[item.status]++;
      }
    });

    return stats;
  } catch (err) {
    console.error('Failed to fetch audit stats:', err);
    return null;
  }
}
