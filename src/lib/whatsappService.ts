/**
 * WhatsApp Integration Service
 * Saves user phone numbers and integrates with WhatsApp
 */

import { supabase } from './supabaseClient';

export interface WhatsAppUserData {
  user_id: string;
  phone_number: string;
  email: string;
}

/**
 * Save user phone number to database
 * Phone number should be in format: +254XXXXXXXXX (with country code)
 */
export async function saveUserPhoneNumber(
  userId: string,
  phoneNumber: string,
  email: string
): Promise<boolean> {
  try {
    // Validate phone number format (basic validation)
    if (!phoneNumber || phoneNumber.length < 10) {
      console.error('Invalid phone number format');
      return false;
    }

    // Ensure phone number starts with +
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      // If it starts with 0, replace with +254
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
    }

    const { error } = await supabase
      .from('users')
      .update({
        phone_number: formattedPhone,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving phone number:', error);
      return false;
    }

    console.log('✅ Phone number saved:', formattedPhone);

    // Save to WhatsApp integration (send welcome message)
    await sendWhatsAppWelcomeMessage(formattedPhone, email);

    return true;
  } catch (err) {
    console.error('Exception saving phone number:', err);
    return false;
  }
}

/**
 * Send WhatsApp welcome message
 * This integrates with WhatsApp Business API
 */
export async function sendWhatsAppWelcomeMessage(
  phoneNumber: string,
  userEmail: string
): Promise<boolean> {
  try {
    // This would integrate with WhatsApp Business API
    // For now, we'll log the action
    console.log(
      `📱 WhatsApp welcome message queued for ${phoneNumber} (${userEmail})`
    );

    // Example: Send welcome message via WhatsApp API
    // In production, you would call your WhatsApp Business API endpoint
    const whatsappMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: `Welcome to KenyaPesa! 🎉\n\nYour account has been created successfully. You can now start placing bets!\n\nFor support, reply to this message or visit our website.`,
      },
      recipient_type: 'individual',
    };

    console.log('📤 WhatsApp message payload:', whatsappMessage);

    // TODO: Call WhatsApp Business API here
    // const response = await fetch('YOUR_WHATSAPP_API_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.VITE_WHATSAPP_API_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(whatsappMessage),
    // });

    return true;
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    return false;
  }
}

/**
 * Get user phone number
 */
export async function getUserPhoneNumber(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('phone_number')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching phone number:', error);
      return null;
    }

    return data?.phone_number || null;
  } catch (err) {
    console.error('Exception fetching phone number:', err);
    return null;
  }
}

/**
 * Send WhatsApp notification to user
 * Use this to send transactional messages (bet confirmation, withdrawal, etc.)
 */
export async function sendWhatsAppNotification(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const whatsappMessage = {
      to: phoneNumber,
      type: 'text',
      text: {
        body: message,
      },
      recipient_type: 'individual',
    };

    console.log('📤 Sending WhatsApp notification:', whatsappMessage);

    // TODO: Call WhatsApp Business API here
    // const response = await fetch('YOUR_WHATSAPP_API_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.VITE_WHATSAPP_API_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(whatsappMessage),
    // });

    return true;
  } catch (err) {
    console.error('Error sending WhatsApp notification:', err);
    return false;
  }
}
