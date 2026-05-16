import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function sendSystemNotification(type: 'registration' | 'complaint' | 'issue', data: any) {
  try {
    // 1. Log to system notifications for Master Dashboard
    await addDoc(collection(db, 'system_notifications'), {
      type,
      ...data,
      status: 'new',
      createdAt: serverTimestamp()
    });

    // 2. Prepare email trigger (assuming "Trigger Email from Firestore" extension is used)
    // We add to a 'mail' collection which an extension or cloud function can process
    await addDoc(collection(db, 'mail'), {
      to: 'qaisarabbas6496@gmail.com',
      message: {
        subject: `[EduManage] New ${type.charAt(0).toUpperCase() + type.slice(1)}: ${data.schoolName || 'Unknown School'}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #4f46e5;">New ${type} received</h2>
            <p><strong>School:</strong> ${data.schoolName || 'N/A'}</p>
            <p><strong>From:</strong> ${data.email || 'N/A'}</p>
            <p><strong>Details:</strong></p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              ${type === 'registration' ? `
                Plan: ${data.plan}<br>
                Phone: ${data.phone}<br>
                Address: ${data.address}
              ` : `
                Subject: ${data.subject}<br>
                Message: ${data.message}
              `}
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              This is an automated notification from EduManage Pro.
            </p>
          </div>
        `
      }
    });

    console.log(`System notification sent for ${type}`);
  } catch (error) {
    console.error("Error sending system notification:", error);
  }
}
