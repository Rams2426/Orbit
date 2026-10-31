import { Task } from '../types/orbit';

let audioCtx: AudioContext | null = null;

function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    // Two-tone bell alert
    [659.25, 880].forEach((freq, i) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.45);
    });
  } catch (e) {
    console.warn('Audio alert not permitted or blocked', e);
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendBrowserNotification(task: Task) {
  playAlertChime();

  // 1. Browser Native Notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const dueDisplay = task.dueTime ? `at ${task.dueTime}` : 'soon';
      const notification = new Notification(`Orbit Deadline Alert`, {
        body: `"${task.title}" is due within 1 hour (${dueDisplay})!`,
        tag: `orbit-${task.id}`,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.warn('Failed to dispatch native browser notification:', err);
    }
  }

  // 2. Dispatch custom in-app event for guaranteed visibility in iframes
  window.dispatchEvent(
    new CustomEvent('orbit-deadline-alert', {
      detail: task,
    })
  );
}

export function getNotifiedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem('orbit_notified_task_ids');
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markTaskAsNotified(taskId: string) {
  try {
    const current = getNotifiedTaskIds();
    current.add(taskId);
    localStorage.setItem('orbit_notified_task_ids', JSON.stringify(Array.from(current)));
  } catch (err) {
    console.warn('Failed saving notified task ID:', err);
  }
}
