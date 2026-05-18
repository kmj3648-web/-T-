import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ExamBookingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    student_name: '',
    birthdate: '',
    clinic_date: '',
    clinic_time: '15:00'
  });
  
  const [loading, setLoading] = useState(false);
  const [slotCount, setSlotCount] = useState(0);

  const [config, setConfig] = useState({ days: [3, 4, 5], startTime: '15:00', endTime: '21:30', interval: 15, capacity: 2, teacherName: '' });
  const [times, setTimes] = useState(["15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00", "21:15", "21:30"]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from('settings').select('exam_config, clinic_config').eq('id', 1).single();
    if (data?.exam_config) {
      const teacherName = data.clinic_config?.teacherName || '';
      setConfig({ ...data.exam_config, teacherName });
      if (teacherName) {
        document.title = `${teacherName}T 시험기간 클리닉 신청 사이트`;
      }
      const start = data.exam_config.startTime;
      const end = data.exam_config.endTime;
      const interval = data.exam_config.interval;
      
      const newTimes = [];
      let [h, m] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = eh * 60 + em;
      
      for (let mins = startMins; mins <= endMins; mins += interval) {
        const hh = Math.floor(mins / 60).toString().padStart(2, '0');
        const mm = (mins % 60).toString().padStart(2, '0');
        newTimes.push(`${hh}:${mm}`);
      }
      setTimes(newTimes);
      setFormData(prev => ({ ...prev, clinic_time: newTimes[0] || '15:00' }));
    }
  };

  // Week Picker State
  const [currentWeekTop, setCurrentWeekTop] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeekTop, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeekTop, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthString = format(weekStart, 'M월', { locale: ko });
  const weekNumber = getWeekOfMonth(weekStart);

  useEffect(() => {
    if (formData.clinic_date && formData.clinic_time) {
      checkCapacity();
    } else {
      setSlotCount(0);
    }
  }, [formData.clinic_date, formData.clinic_time]);

  const checkCapacity = async () => {
    const { count, error } = await supabase
      .from('clinics')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_date', formData.clinic_date)
      .eq('clinic_time', formData.clinic_time)
      .eq('clinic_type', 'exam');
    
    if (!error) {
      setSlotCount(count || 0);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFull = slotCount >= config.capacity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.clinic_date) {
      alert('이름과 날짜를 입력해주세요.');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (formData.clinic_date < todayStr) {
      alert('이미 지난 날짜는 신청할 수 없습니다.');
      return;
    }

    if (isFull) {
      alert(`선택하신 시험기간 시간대에는 이미 ${config.capacity}명의 신청이 마감되었습니다. 다른 시간을 선택해주세요.`);
      return;
    }

    setLoading(true);

    // 제출 직전에 다시 한번 신청 인원을 확인하여 동시 접속에 의한 초과 예약(Race Condition) 방지
    const { count: currentCapacity, error: capacityError } = await supabase
      .from('clinics')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_date', formData.clinic_date)
      .eq('clinic_time', formData.clinic_time)
      .eq('clinic_type', 'exam');

    if (capacityError) {
      setLoading(false);
      alert('예약 현황 확인 중 오류가 발생했습니다.');
      return;
    }

    if (currentCapacity >= config.capacity) {
      setLoading(false);
      alert('앗! 방금 전 다른 학생이 신청하여 마감되었습니다. 다른 시간을 선택해주세요.');
      setSlotCount(currentCapacity); // 화면 업데이트
      return;
    }

    // 학생 정보 확인
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('school')
      .eq('student_name', formData.student_name)
      .eq('birthdate', formData.birthdate)
      .single();

    if (studentError || !student) {
      setLoading(false);
      alert('등록되지 않은 학생입니다. 이름과 부모님 전화번호 뒷 4자리를 다시 확인해주세요.');
      return;
    }

    // 한 주(일~토) 당 1회 신청 제한 확인
    const selectedDateObj = new Date(formData.clinic_date);
    const startDate = format(startOfWeek(selectedDateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const endDate = format(endOfWeek(selectedDateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');

    const { count: weekCount } = await supabase
      .from('clinics')
      .select('*', { count: 'exact', head: true })
      .eq('student_name', formData.student_name)
      .eq('school', student.school)
      .gte('clinic_date', startDate)
      .lte('clinic_date', endDate)
      .neq('clinic_type', 'cancel_log');

    if (weekCount > 0) {
      setLoading(false);
      alert('한 주(일~토)에 하나의 클리닉만 신청할 수 있습니다. 이미 이번 주에 신청한 내역이 있습니다.');
      return;
    }

    const { error } = await supabase
      .from('clinics')
      .insert([{
        student_name: formData.student_name,
        school: student.school,
        clinic_date: formData.clinic_date,
        clinic_time: formData.clinic_time,
        clinic_type: 'exam'
      }]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert('신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else {
      alert('시험기간 클리닉 신청이 완료되었습니다!');
      navigate('/lookup');
    }
  };



  return (
    <div className="theme-pink">
      <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="heading-primary">{config.teacherName ? `${config.teacherName}T ` : ''}클리닉 신청(시험기간)</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">학생 이름</label>
              <input 
                type="text" 
                name="student_name"
                className="form-input" 
                placeholder="홍길동"
                value={formData.student_name}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">부모님 전화번호 뒷 4자리</label>
              <input 
                type="text" 
                name="birthdate"
                className="form-input" 
                placeholder="예: 1234"
                maxLength={4}
                value={formData.birthdate}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">날짜 선택</label>
            <div className="week-picker">
              <div className="week-header">
                <button type="button" className="week-nav-btn" onClick={() => setCurrentWeekTop(subWeeks(currentWeekTop, 1))}>&lt; 이전 주</button>
                <span style={{color: 'var(--primary)', fontSize: '1.2rem'}}>{monthString} {weekNumber}주차</span>
                <button type="button" className="week-nav-btn" onClick={() => setCurrentWeekTop(addWeeks(currentWeekTop, 1))}>다음 주 &gt;</button>
              </div>
              <div className="week-days-grid">
                {daysInWeek.map(day => {
                  const dayValue = day.getDay();
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const isPast = dateStr < todayStr;
                  const isAvailable = config.days.includes(dayValue) && !isPast;
                  const isSelected = formData.clinic_date === dateStr;
                  
                  let cardClass = 'day-card ';
                  if (!isAvailable) cardClass += 'disabled ';
                  else if (isSelected) cardClass += 'selected ';
                  else cardClass += 'available ';

                  return (
                    <div 
                      key={dateStr}
                      className={cardClass}
                      onClick={() => {
                        if (isAvailable) {
                          setFormData(prev => ({ ...prev, clinic_date: dateStr }));
                        }
                      }}
                    >
                      <div className="day-card-name" style={{color: isSelected ? 'white' : (isAvailable ? 'var(--primary)' : 'var(--text-muted)')}}>{format(day, 'E', { locale: ko })}</div>
                      <div className="day-card-number">{format(day, 'd')}</div>
                    </div>
                  );
                })}
              </div>
              {!formData.clinic_date && <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px'}}>달력에서 원하는 오픈 요일을 클릭해 주세요.</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">시간 ({config.interval}분 단위)</label>
            <select 
              name="clinic_time"
              className="form-select" 
              value={formData.clinic_time}
              onChange={handleChange}
            >
              {times.map(t => {
                const [h, m] = t.split(':').map(Number);
                const displayH = h > 12 ? h - 12 : h;
                const ampm = h >= 12 ? '오후' : '오전';
                return <option key={t} value={t}>{ampm} {displayH}:{m.toString().padStart(2, '0')}</option>;
              })}
            </select>
          </div>

          {formData.clinic_date && formData.clinic_time && (
            <div style={{ padding: '15px', background: isFull ? '#fee2e2' : '#fdf2f8', border: isFull ? '1px solid #ef4444' : '1px solid #fbcfe8', borderRadius: '10px', marginBottom: '20px', fontWeight: 'bold', color: isFull ? '#ef4444' : '#db2777', textAlign: 'center' }}>
              해당 시간 신청 내역: {slotCount}명 / 최대 {config.capacity}명 {isFull && '(예약 마감)'}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || isFull}>
            {loading ? '신청 중...' : (isFull ? '해당 시간 마감' : '시험기간 클리닉 신청하기')}
          </button>
        </form>
      </div>
    </div>
  );
}
