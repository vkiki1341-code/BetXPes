import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { supabase } from './supabaseClient';

export async function submitDepositRequest(userId: string, amount: number) {
  return supabase.from('deposit_requests').insert([{ user_id: userId, amount, status: 'pending' }]);
}

export async function submitWithdrawRequest(userId: string, amount: number) {
  return supabase.from('withdraw_requests').insert([{ user_id: userId, amount, status: 'pending' }]);
}

export async function getDepositRequests() {
  return supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
}

export async function getWithdrawRequests() {
  return supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
}

export async function updateDepositRequest(id: number, status: string) {
  return supabase.from('deposit_requests').update({ status }).eq('id', id);
}

export async function updateWithdrawRequest(id: number, status: string) {
  return supabase.from('withdraw_requests').update({ status }).eq('id', id);
}

// Helper function to fetch user's current balance from Supabase
export async function getUserBalance(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user balance:', error);
      return 0;
    }
    
    return data?.balance || 0;
  } catch (error) {
    console.error('Exception fetching user balance:', error);
    return 0;
  }
}

