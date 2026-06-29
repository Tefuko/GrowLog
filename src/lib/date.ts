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