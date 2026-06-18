import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 'your_resend_api_key' && !apiKey.includes('your_')) {
      resendClient = new Resend(apiKey);
    }
  }
  return resendClient;
}

export async function sendSignalEmail(userEmail: string, notification: any) {
  const client = getResendClient();
  const fromEmail = process.env.FROM_EMAIL || 'alerts@onboarding.resend.dev';
  const symbol = notification.symbol?.replace('.NS', '') || 'ASSET';
  const signalText = notification.signal === 'BUY' ? 'Strong BUY' : 'SELL';
  const colorEmoji = notification.signal === 'BUY' ? '🟢' : '🔴';
  
  if (!client) {
    console.warn(`[EmailService] Resend not initialized. Email alert skipped for ${userEmail}`);
    return false;
  }

  const subject = `${colorEmoji} ${symbol} — ${signalText} Signal | PRISMX`;
  
  const entryZone = notification.entryZone || `₹${(notification.price * 0.995).toFixed(2)} - ₹${(notification.price * 1.005).toFixed(2)}`;
  const stopLoss = notification.stopLoss || (notification.price * 0.95).toFixed(2);
  const target1 = notification.target1 || (notification.price * 1.05).toFixed(2);
  const target2 = notification.target2 || (notification.price * 1.12).toFixed(2);
  const holdPeriod = notification.holdDays ? `${notification.holdDays} days` : '7-12 days';
  const riskReward = notification.riskReward || '1:2.4';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;">PRISMX AI</h1>
        <p style="color: #94a3b8; margin: 5px 0 0; font-size: 12px; font-family: monospace; text-transform: uppercase;">Smart Signal Alert</p>
      </div>
      
      <div style="background-color: ${notification.signal === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-left: 4px solid ${notification.signal === 'BUY' ? '#10b981' : '#ef4444'}; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="margin: 0; font-size: 20px; color: ${notification.signal === 'BUY' ? '#34d399' : '#f87171'};">
          ${colorEmoji} ${symbol} — ${notification.signal}
        </h2>
        <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">
          Confidence: <strong>${notification.confidence || 80}%</strong> | Conviction: <strong>${notification.conviction || 'HIGH'}</strong>
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">ENTRY ZONE</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #f1f5f9;">${entryZone}</td>
        </tr>
         <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #ea580c;">STOP LOSS</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #f87171;">₹${stopLoss}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #3b82f6;">TARGET 1</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #60a5fa;">₹${target1}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #10b981;">TARGET 2</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #34d399;">₹${target2}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">HOLD PERIOD</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #f1f5f9;">${holdPeriod}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; color: #94a3b8;">RISK:REWARD</td>
          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #f1f5f9;">${riskReward}</td>
        </tr>
      </table>
      
      <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px; color: #3b82f6; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">WHY THIS SIGNAL:</h4>
        <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
          ${notification.description || 'PRISMX scanner detected a significant price divergence breakout with increased institutional momentum backing.'}
        </p>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${process.env.APP_URL || 'https://prismx.ai'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">View Full Analysis &rarr;</a>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 11px;">
        <p style="margin: 0 0 10px;">Not financial advice. Educational tool only.</p>
        <p style="margin: 0;"><a href="${process.env.APP_URL || 'https://prismx.ai'}/settings" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a></p>
      </div>
    </div>
  `;

  try {
    const data = await client.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: subject,
      html: html,
    });
    console.log('[EmailService] Email sent successfully:', data);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Resend send failure:', err.message);
    return false;
  }
}

export async function sendDailySummaryEmail(userEmail: string, summaries: any[]) {
  const client = getResendClient();
  const fromEmail = process.env.FROM_EMAIL || 'alerts@onboarding.resend.dev';
  if (!client) {
    console.warn(`[EmailService] Resend not initialized. Daily summary email skipped for ${userEmail}`);
    return false;
  }

  const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const subject = `📊 PRISMX Daily Summary — ${todayStr}`;
  
  const setupsHtml = summaries && summaries.length > 0 
    ? summaries.slice(0, 3).map(s => `
        <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: ${s.signal === 'BUY' ? '#34d399' : s.signal === 'SELL' ? '#f87171' : '#f59e0b'};">
            ${s.symbol?.replace('.NS', '') || 'ASSET'} &mdash; ${s.signal || 'HOLD'}
          </h3>
          <p style="margin: 5px 0 0; font-size: 13px; color: #cbd5e1;">${s.description || 'Watchlist accumulation parameters setup'}</p>
        </div>
      `).join('')
    : '<p style="color: #64748b; font-style: italic;">No specific setups triggered today. Stay disciplined.</p>';

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;">PRISMX AI</h1>
        <p style="color: #94a3b8; margin: 5px 0 0; font-size: 12px; font-family: monospace; text-transform: uppercase;">Daily Markets Summary</p>
      </div>
      
      <h2 style="font-size: 18px; margin: 0 0 15px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; color: #f1f5f9;">🔥 Top Setups Summary</h2>
      ${setupsHtml}
      
      <h2 style="font-size: 18px; margin: 25px 0 15px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; color: #f1f5f9;">📈 Sector Volatility & Flows</h2>
      <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #1e293b; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
        <p style="margin: 0 0 8px;"><strong>Sector Mood:</strong> Optimistic &bull; Dynamic IT and Metal setups analyzed.</p>
        <p style="margin: 0;"><strong>FII Activity:</strong> Smart accumulate triggers active.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="${process.env.APP_URL || 'https://prismx.ai'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Open PRISMX Dashboard &rarr;</a>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 11px;">
        <p style="margin: 0 0 10px;">Not financial advice. Educational tool only.</p>
        <p style="margin: 0;"><a href="${process.env.APP_URL || 'https://prismx.ai'}/settings" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a></p>
      </div>
    </div>
  `;

  try {
    const data = await client.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: subject,
      html: html,
    });
    console.log('[EmailService] Daily summary email sent successfully:', data);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Daily summary email failure:', err.message);
    return false;
  }
}

export async function sendEarningsAlertEmail(userEmail: string, event: any) {
  const client = getResendClient();
  const fromEmail = process.env.FROM_EMAIL || 'alerts@onboarding.resend.dev';
  if (!client) {
    console.warn(`[EmailService] Resend not initialized. Earnings email skipped for ${userEmail}`);
    return false;
  }

  const symbol = event.symbol?.replace('.NS', '') || 'ASSET';
  const companyName = event.companyName || 'Watchlist Company';
  const eventDateStr = event.date || 'Soon';
  const subject = `⚠️ ${symbol} results in ${event.daysAway || 2} days | PRISMX`;
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px;">PRISMX AI</h1>
        <p style="color: #94a3b8; margin: 5px 0 0; font-size: 12px; font-family: monospace; text-transform: uppercase;">Upcoming Volatility Event</p>
      </div>
      
      <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="margin: 0; font-size: 20px; color: #fbbf24;">
          ⚠️ ${symbol} results in ${event.daysAway || 2} days
        </h2>
        <p style="margin: 5px 0 0; color: #cbd5e1; font-size: 14px;">
          <strong>${companyName}</strong> &mdash; Quarterly results event scheduled on ${eventDateStr}.
        </p>
      </div>
      
      <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 30px; font-size: 14px;">
        <p style="margin: 0 0 10px;"><strong>Expected Volatility:</strong> <span style="color: #f87171;">HIGH</span></p>
        <p style="margin: 0;"><strong>Recommendation:</strong> Widen stops or reduce current position sizes to navigate the upcoming volatility shock safely.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="${process.env.APP_URL || 'https://prism.ai'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">Review Positions &rarr;</a>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 11px;">
        <p style="margin: 0 0 10px;">Not financial advice. Educational tool only.</p>
        <p style="margin: 0;"><a href="${process.env.APP_URL || 'https://prism.ai'}/settings" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a></p>
      </div>
    </div>
  `;

  try {
    const data = await client.emails.send({
      from: fromEmail,
      to: [userEmail],
      subject: subject,
      html: html,
    });
    console.log('[EmailService] Earnings alert email sent successfully:', data);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Earnings email failure:', err.message);
    return false;
  }
}
