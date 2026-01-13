// Notification service for workout reminders and achievements

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'reminder' | 'achievement' | 'streak' | 'challenge';
  timestamp: Date;
  read: boolean;
  action_url?: string;
}

export class NotificationService {
  private static readonly STORAGE_KEY = 'treinai_notifications';

  // Request permission for browser notifications
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Send browser notification
  static async sendNotification(title: string, body: string, icon?: string) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200],
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  // Schedule workout reminders
  static scheduleWorkoutReminder(daysOfWeek: number[], timeOfDay: string) {
    // In production, use service worker for background notifications
    const [hours, minutes] = timeOfDay.split(':').map(Number);

    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );

    if (daysOfWeek.includes(now.getDay())) {
      const timeUntilNotification = scheduledTime.getTime() - now.getTime();

      if (timeUntilNotification > 0) {
        setTimeout(() => {
          this.sendNotification(
            '💪 Hora de treinar!',
            'Seu treino te espera. Vamos começar?'
          );
        }, timeUntilNotification);
      }
    }
  }

  // Save notification to local storage
  static saveNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const notifications = this.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    notifications.unshift(newNotification);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));

    return newNotification;
  }

  // Get all notifications
  static getNotifications(): Notification[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    return JSON.parse(stored).map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp),
    }));
  }

  // Mark notification as read
  static markAsRead(notificationId: string) {
    const notifications = this.getNotifications();
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  // Clear all notifications
  static clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Send achievement notification
  static notifyAchievement(achievement: string, message: string) {
    this.saveNotification({
      title: `🏆 ${achievement}`,
      body: message,
      type: 'achievement',
    });

    this.sendNotification(`🏆 ${achievement}`, message);
  }

  // Send streak notification
  static notifyStreak(days: number) {
    const messages = [
      { days: 3, message: 'Você está pegando o jeito! 3 dias seguidos!' },
      { days: 7, message: 'Uma semana completa! Você é incrível! 🔥' },
      { days: 14, message: '2 semanas! Você está imparável! 💪' },
      { days: 30, message: 'UM MÊS! Você é uma lenda! 🌟' },
    ];

    const milestone = messages.find(m => m.days === days);
    if (milestone) {
      this.notifyAchievement('Sequência de Treinos', milestone.message);
    }
  }
}
