// client/src/shared/utils/notificationSimulator.ts

export interface SimulatedNotification {
  title: string;
  body: string;
  type: string;
}

export function simulateChannels(notification: SimulatedNotification) {
  try {
    const userStr = localStorage.getItem('user');
    const profileStr = localStorage.getItem('profile');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const profile = profileStr ? JSON.parse(profileStr) : null;
    const userId = user.id;

    // Load preferences
    const prefsStr = localStorage.getItem(`homi_notification_preferences_${userId}`);
    const prefs = prefsStr ? JSON.parse(prefsStr) : {};

    const typeKey = notification.type.toLowerCase();
    const pref = prefs[typeKey] || { email: false, sms: false };

    const email = user.email || 'mohym3205@gmail.com';
    const phone = profile?.phoneNumber || '01021816300';

    // Simulated email dispatch
    if (pref.email) {
      showToast('email', email, notification.title, notification.body);
    }
    // Simulated SMS dispatch
    if (pref.sms) {
      showToast('sms', phone, notification.title, notification.body);
    }
  } catch (err) {
    console.error('Simulation error:', err);
  }
}

function showToast(channel: 'email' | 'sms', destination: string, title: string, body: string) {
  let container = document.getElementById('homi-simulator-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'homi-simulator-toasts';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '99999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.pointerEvents = 'auto';
  toast.style.background = channel === 'email' 
    ? 'rgba(239, 246, 255, 0.95)' 
    : 'rgba(255, 251, 235, 0.95)';
  toast.style.border = channel === 'email' 
    ? '1px solid rgba(191, 219, 254, 0.7)' 
    : '1px solid rgba(253, 230, 138, 0.7)';
  toast.style.borderLeft = channel === 'email' 
    ? '5px solid #3b82f6' 
    : '5px solid #f59e0b';
  toast.style.color = '#1e293b';
  toast.style.padding = '16px 20px';
  toast.style.borderRadius = '16px';
  toast.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.08)';
  toast.style.backdropFilter = 'blur(8px)';
  toast.style.width = '360px';
  toast.style.fontFamily = '"Plus Jakarta Sans", "Inter", sans-serif';
  toast.style.fontSize = '14px';
  toast.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(30px)';

  const icon = channel === 'email' ? '📧' : '📱';
  const label = channel === 'email' ? 'Email Notification Sent' : 'SMS Message Dispatched';
  const destLabel = channel === 'email' ? 'Recipient Gmail:' : 'SMS Destination:';
  const colorTheme = channel === 'email' ? '#2563eb' : '#d97706';

  toast.innerHTML = `
    <div style="display: flex; gap: 12px; align-items: flex-start; position: relative;">
      <div style="font-size: 24px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.05));">${icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 800; font-size: 11px; color: ${colorTheme}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">
          ${label}
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${destLabel} <span style="color: #0f172a; font-weight: 700;">${destination}</span>
        </div>
        ${channel === 'email' ? `<div style="font-weight: 700; margin-bottom: 6px; font-size: 13px; color: #1e293b;">Subject: ${title}</div>` : ''}
        <div style="font-size: 12px; color: #475569; line-height: 1.5; background: rgba(255,255,255,0.4); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.02);">${body}</div>
      </div>
      <button style="background: none; border: none; font-size: 18px; cursor: pointer; color: #94a3b8; padding: 0 0 0 8px; line-height: 1;" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 8000);
}
