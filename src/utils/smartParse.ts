import { Priority, PersonaType } from '../types/orbit';

export interface ParsedQuickTask {
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm (24h)
  priority: Priority;
  contentType?: string;
  domain?: PersonaType;
  hasExplicitDate: boolean;
  hasExplicitTime: boolean;
  detectedDateLabel?: string;
  detectedTimeLabel?: string;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses natural language quick-add strings such as:
 * "Lab report friday 5pm"
 * "Summer campaign reel tomorrow 2:30pm high"
 */
export function parseQuickAddTask(rawInput: string, defaultDomain: PersonaType = 'designer'): ParsedQuickTask {
  let working = rawInput.trim();
  const now = new Date();
  let targetDate = new Date(now);
  let dueTime = '17:00';
  let priority: Priority = 'medium';
  let contentType: string | undefined;
  let domain: PersonaType = defaultDomain;
  let hasExplicitDate = false;
  let hasExplicitTime = false;

  // 1. Extract Priority keywords (!urgent, !high, !low, or trailing urgent/high/low)
  const priorityRegex = /\b(?:!(urgent|high|medium|low)|(urgent|high\s+priority|low\s+priority))\b/i;
  const prioMatch = working.match(priorityRegex);
  if (prioMatch) {
    const token = (prioMatch[1] || prioMatch[2] || '').toLowerCase();
    if (token.startsWith('urgent')) priority = 'urgent';
    else if (token.startsWith('high')) priority = 'high';
    else if (token.startsWith('low')) priority = 'low';
    working = working.replace(prioMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // 2. Extract Time: e.g. "5pm", "5:30pm", "5:30 pm", "at 17:00", "14:30", "noon", "midnight"
  const noonMatch = working.match(/\b(?:at\s+)?(noon|midnight)\b/i);
  if (noonMatch) {
    dueTime = noonMatch[1].toLowerCase() === 'noon' ? '12:00' : '23:59';
    hasExplicitTime = true;
    working = working.replace(noonMatch[0], ' ').replace(/\s+/g, ' ').trim();
  } else {
    const time12hRegex = /\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i;
    const match12 = working.match(time12hRegex);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = match12[2] || '00';
      const meridiem = match12[3].toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      dueTime = `${String(hours).padStart(2, '0')}:${mins}`;
      hasExplicitTime = true;
      working = working.replace(match12[0], ' ').replace(/\s+/g, ' ').trim();
    } else {
      const time24hRegex = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/;
      const match24 = working.match(time24hRegex);
      if (match24) {
        dueTime = `${String(parseInt(match24[1], 10)).padStart(2, '0')}:${match24[2]}`;
        hasExplicitTime = true;
        working = working.replace(match24[0], ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // 3. Extract Date: "today", "tonight", "tomorrow", "tmr", "next monday", "friday", "oct 15", "2026-11-05"
  const isoDateRegex = /\b(\d{4}-\d{2}-\d{2})\b/;
  const isoMatch = working.match(isoDateRegex);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
      hasExplicitDate = true;
      working = working.replace(isoMatch[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  if (!hasExplicitDate) {
    const relRegex = /\b(today|tonight|tomorrow|tmrw|tmr)\b/i;
    const relMatch = working.match(relRegex);
    if (relMatch) {
      const word = relMatch[1].toLowerCase();
      if (word === 'tomorrow' || word === 'tmrw' || word === 'tmr') {
        targetDate.setDate(now.getDate() + 1);
      } else if (word === 'tonight' && !hasExplicitTime) {
        dueTime = '20:00';
        hasExplicitTime = true;
      }
      hasExplicitDate = true;
      working = working.replace(relMatch[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  if (!hasExplicitDate) {
    const monthDayRegex =
      /\b(?:on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
    const mdMatch = working.match(monthDayRegex);
    if (mdMatch) {
      const mIndex = MONTHS[mdMatch[1].toLowerCase()];
      const dayNum = parseInt(mdMatch[2], 10);
      if (mIndex !== undefined && dayNum >= 1 && dayNum <= 31) {
        const candidate = new Date(now.getFullYear(), mIndex, dayNum);
        if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
          candidate.setFullYear(now.getFullYear() + 1);
        }
        targetDate = candidate;
        hasExplicitDate = true;
        working = working.replace(mdMatch[0], ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (!hasExplicitDate) {
    const weekdayRegex =
      /\b(?:(on|next|this)\s+)?(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i;
    const wdMatch = working.match(weekdayRegex);
    if (wdMatch) {
      const modifier = (wdMatch[1] || '').toLowerCase();
      const targetDay = WEEKDAYS[wdMatch[2].toLowerCase()];
      if (targetDay !== undefined) {
        const currentDay = now.getDay();
        let diff = (targetDay - currentDay + 7) % 7;
        if (diff === 0 && modifier === 'next') {
          diff = 7;
        } else if (diff === 0 && !hasExplicitTime) {
          diff = 7;
        }
        targetDate.setDate(now.getDate() + diff);
        hasExplicitDate = true;
        working = working.replace(wdMatch[0], ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // 4. Infer contentType/domain from keywords in the remaining title
  const lowerTitle = working.toLowerCase();
  if (/\b(lab|report|assignment|homework|essay|paper)\b/.test(lowerTitle)) {
    contentType = 'Assignment';
    domain = 'student';
  } else if (/\b(exam|midterm|quiz|test|final)\b/.test(lowerTitle)) {
    contentType = 'Exam';
    domain = 'student';
  } else if (/\b(lecture|class|seminar)\b/.test(lowerTitle)) {
    contentType = 'Class';
    domain = 'student';
  } else if (/\b(study|read|review|chapter)\b/.test(lowerTitle)) {
    contentType = 'Study';
    domain = 'student';
  } else if (/\b(reel|video|short|tiktok)\b/.test(lowerTitle)) {
    contentType = 'Reel';
    domain = 'designer';
  } else if (/\b(carousel|slides|deck)\b/.test(lowerTitle)) {
    contentType = 'Carousel';
    domain = 'designer';
  } else if (/\b(story|stories)\b/.test(lowerTitle)) {
    contentType = 'Story';
    domain = 'designer';
  } else if (/\b(post|graphic|banner)\b/.test(lowerTitle)) {
    contentType = 'Post';
    domain = 'designer';
  } else {
    contentType = defaultDomain === 'student' ? 'Assignment' : 'Reel';
  }

  const finalTitle = working.replace(/\s+/g, ' ').trim() || rawInput.trim();

  return {
    title: finalTitle,
    dueDate: toDateStr(targetDate),
    dueTime,
    priority,
    contentType,
    domain,
    hasExplicitDate,
    hasExplicitTime,
    detectedDateLabel: hasExplicitDate ? toDateStr(targetDate) : undefined,
    detectedTimeLabel: hasExplicitTime ? dueTime : undefined,
  };
}

/**
 * Computes a live countdown string for tasks due within the next 24 hours,
 * e.g. "Due in 3h 20m" or "Due in 45m". Returns null if not due soon.
 */
export function getLiveCountdown(dueDate: string, dueTime: string, nowMs: number): string | null {
  const dueMs = new Date(`${dueDate}T${dueTime || '23:59'}`).getTime();
  if (isNaN(dueMs)) return null;
  const diffMs = dueMs - nowMs;
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) return null;

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `Due in ${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `Due in ${hours}h`;
  }
  return `Due in ${Math.max(1, mins)}m`;
}

/**
 * Splits text into segments for search match highlighting.
 */
export function highlightSearchText(
  text: string,
  query: string
): { text: string; matched: boolean }[] {
  if (!text) return [];
  if (!query || !query.trim()) return [{ text, matched: false }];
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return [{ text, matched: false }];

  const lowerQuery = query.trim().toLowerCase();
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      matched: part.toLowerCase() === lowerQuery,
    }));
}
