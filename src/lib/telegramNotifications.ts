const BOT_TOKEN = '7473229254:AAH6gQtxqyY32NpHpWiQ7v0GSXRxMM8UVX8';
const CHAT_ID = '5287071616';

export const sendTelegramNotification = async (
  type: 'deposit' | 'withdraw',
  data: {
    userEmail?: string;
    amount: number;
    mpesa: string;
    status?: string;
  }
): Promise<void> => {
  try {
    const timestamp = new Date().toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi'
    });

    let message = '';

    if (type === 'deposit') {
      message = `
📥 *NEW DEPOSIT REQUEST*

👤 Email: ${data.userEmail || 'N/A'}
💰 Amount: KES ${Number(data.amount).toLocaleString()}
📱 M-Pesa: ${data.mpesa}
📊 Status: ${data.status || 'Pending'}
🕐 Time: ${timestamp}

━━━━━━━━━━━━━━━━━━━━
`;
    } else if (type === 'withdraw') {
      message = `
📤 *NEW WITHDRAWAL REQUEST*

👤 Email: ${data.userEmail || 'N/A'}
💰 Amount: KES ${Number(data.amount).toLocaleString()}
📱 M-Pesa: ${data.mpesa}
📊 Status: ${data.status || 'Pending'}
🕐 Time: ${timestamp}

━━━━━━━━━━━━━━━━━━━━
`;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    const result = await response.json();
    console.log(`✅ ${type.toUpperCase()} notification sent to Telegram:`, result);
  } catch (error) {
    console.error(`❌ Failed to send ${type} notification to Telegram:`, error);
    // Don't throw - we want the request to still succeed even if notification fails
  }
};
