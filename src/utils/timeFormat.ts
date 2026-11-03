import { Task, TeamRole, TimeFormat } from '../types/orbit';

export function formatTimeDisplay(timeStr?: string, format: TimeFormat = '12h'): string {
  if (!timeStr) return '';
  if (format === '24h') {
    return timeStr;
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Shared confetti burst coordinates used when completing the final daily task.
 */
export const CONFETTI_DOTS = [
  { tx: '-18px', ty: '-16px', color: '#10B981' },
  { tx: '18px', ty: '-14px', color: '#8B7BFF' },
  { tx: '-20px', ty: '12px', color: '#F59E0B' },
  { tx: '16px', ty: '15px', color: '#EC4899' },
  { tx: '0px', ty: '-22px', color: '#3B82F6' },
  { tx: '22px', ty: '2px', color: '#10B981' },
] as const;

/**
 * Shared permission helper determining whether the current user can delete a task.
 */
export function canUserDeleteTask(
  task: Task,
  currentUserUid?: string | null,
  userTeamRole?: TeamRole | null
): boolean {
  if (task.teamId) {
    return (
      userTeamRole === 'owner' ||
      userTeamRole === 'admin' ||
      task.createdBy === currentUserUid
    );
  }
  if (task.pairId) {
    return task.createdBy === currentUserUid || task.userId === currentUserUid;
  }
  return true;
}

