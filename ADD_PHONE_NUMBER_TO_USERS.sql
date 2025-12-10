-- ==========================================
-- ADD PHONE NUMBER TO USERS TABLE
-- ==========================================
-- This migration adds phone number support for WhatsApp integration

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
