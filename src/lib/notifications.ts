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

export async function sendApplicationUpdate(
  schoolEmail: string, 
  schoolName: string, 
  status: 'approved' | 'rejected', 
  reason?: string
) {
  try {
    const isApproved = status === 'approved';
    const subject = isApproved 
      ? `🎉 Congratulations! Your EduManage Pro application for ${schoolName} is Approved`
      : `Update regarding your EduManage Pro application for ${schoolName}`;

    await addDoc(collection(db, 'mail'), {
      to: schoolEmail,
      message: {
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin: 0;">EduManage Pro</h1>
            </div>
            
            <h2 style="color: #1e293b;">Hello ${schoolName},</h2>
            
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">
              ${isApproved 
                ? `We are thrilled to inform you that your application to join the EduManage Pro platform has been <strong>approved</strong>! We are excited to help you transform your school's digital management.`
                : `Thank you for your interest in EduManage Pro. After carefully reviewing your application for <strong>${schoolName}</strong>, we regret to inform you that we cannot proceed with your registration at this time.`}
            </p>

            ${!isApproved && reason ? `
              <div style="background: #fff1f2; border-left: 4px solid #f43f5e; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; font-weight: bold; color: #9f1239; font-size: 14px;">Reason for decision:</p>
                <p style="margin: 4px 0 0; color: #e11d48;">${reason}</p>
              </div>
            ` : ''}

            ${isApproved ? `
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; font-weight: bold; color: #166534;">Next Steps:</p>
                <ul style="margin: 8px 0 0; color: #15803d; padding-left: 20px;">
                  <li>Log in to your dashboard using your registered email.</li>
                  <li>Complete your school profile and campus setup.</li>
                  <li>Import your students and staff data.</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${window.location.origin}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Access Your Dashboard
                </a>
              </div>
            ` : ''}

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              If you have any questions, please reply to this email or contact support.<br>
              © ${new Date().getFullYear()} EduManage Pro. All rights reserved.
            </p>
          </div>
        `
      }
    });

    console.log(`Application update email sent to ${schoolEmail} (${status})`);
  } catch (error) {
    console.error("Error sending application update email:", error);
  }
}
