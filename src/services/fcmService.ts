import { getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export async function sendPushNotification(
  fcmToken: string, 
  title: string, 
  body: string,
  data: object = {}
) {
  try {
    // Ensure firebase admin is initialized safely
    if (getApps().length === 0) {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'prismlocal';
      initializeApp({ projectId });
    }
    
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String((data as any)[key]);
        return acc;
      }, {} as Record<string, string>),
      android: {
        priority: 'high' as const,
        notification: { sound: 'default' }
      },
      apns: {
        payload: { aps: { sound: 'default' } }
      }
    };
    
    const messageId = await getMessaging().send(message);
    console.log('[FCM] Push sent successfully, messageId:', messageId);
    return true;
  } catch (err: any) {
    console.warn('[FCM] Push failed or not configured:', err.message);
    return false;
  }
}
