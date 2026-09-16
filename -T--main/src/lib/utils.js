/**
 * 시간대 목록 생성 함수 (시작시간, 종료시간, 간격분)
 * 예: generateTimeSlots("15:00", "20:00", 60) => ["15:00", "16:00", "17:00", ...]
 */
export function generateTimeSlots(startTime = '15:00', endTime = '20:00', interval = 60) {
  if (!startTime || !endTime || !interval) return [];
  const times = [];
  let [h, m] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = h * 60 + m;
  const endMins = eh * 60 + em;

  for (let mins = startMins; mins <= endMins; mins += interval) {
    const hh = Math.floor(mins / 60).toString().padStart(2, '0');
    const mm = (mins % 60).toString().padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
}

/**
 * HH:mm 시간 표기를 "오후 3:00" 형태의 한글 시간 문자열로 변환
 */
export function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const displayH = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? '오후' : '오전';
  return `${ampm} ${displayH}:${m.toString().padStart(2, '0')}`;
}
