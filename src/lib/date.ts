export function formatJST(iso: string): string {
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
  
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const weekday = get('weekday'); // 「日」など
    let hour = get('hour');
    const minute = get('minute');
  
    // hour12:false でも 0時が「24」になる環境があるため補正
    if (hour === '24') hour = '00';
  
    return `${year}/${month}/${day}(${weekday}) ${hour}:${minute}`;
  }

export function formatDateJST(dateStr: string): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateStr + 'T00:00:00+09:00'));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}

export function daysSince(startedAt: string): number {
  // 日本時間の「日付」同士で差を取る
  const toJstDate = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // "2026-06-30" の形
    return new Date(parts + 'T00:00:00Z');
  };

  const start = toJstDate(new Date(startedAt));
  const today = toJstDate(new Date());
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 開始日当日を1日目とする
}