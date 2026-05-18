import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { getWeekOfMonth, startOfWeek, addDays, subWeeks, addWeeks, format } from 'date-fns';

export default function AdminPage() {
  const [loadings, setLoadings] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [showUnbookedModal, setShowUnbookedModal] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const attendanceInputRef = useRef(null);

  const [clinicConfig, setClinicConfig] = useState({ days: [3, 4, 5], startTime: '15:00', endTime: '20:00', interval: 60, capacity: 10 });
  const [examConfig, setExamConfig] = useState({ days: [3, 4, 5], startTime: '15:00', endTime: '21:30', interval: 15, capacity: 2 });
  const [regTimes, setRegTimes] = useState(['15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
  const [exTimes, setExTimes] = useState(["15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00", "21:15", "21:30"]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const weekDates = Array.from({ length: 7 }).map((_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '1234';

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
      fetchConfig();
      fetchStudents();
    }
  }, [isAuthenticated]);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('student_name', { ascending: true });
    if (!error && data) {
      setStudents(data);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // DB에서 비밀번호 조회
    const { data, error } = await supabase
      .from('settings')
      .select('admin_password')
      .eq('id', 1)
      .single();

    const dbPassword = data?.admin_password || ADMIN_PASSWORD;

    if (passwordInput === dbPassword) {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 일치하지 않습니다.');
      setPasswordInput('');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      alert('새 비밀번호를 입력해주세요.');
      return;
    }
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, admin_password: newPassword });
      
    if (error) {
      alert('비밀번호 변경 중 오류가 발생했습니다.');
      console.error(error);
    } else {
      alert('관리자 비밀번호가 성공적으로 변경되었습니다!');
      setNewPassword('');
    }
  };

  const generateTimes = (config) => {
    const newTimes = [];
    let [h, m] = config.startTime.split(':').map(Number);
    const [eh, em] = config.endTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const endMins = eh * 60 + em;
    
    for (let mins = startMins; mins <= endMins; mins += config.interval) {
      const hh = Math.floor(mins / 60).toString().padStart(2, '0');
      const mm = (mins % 60).toString().padStart(2, '0');
      newTimes.push(`${hh}:${mm}`);
    }
    return newTimes;
  };

  const fetchConfig = async () => {
    const { data, error } = await supabase.from('settings').select('clinic_config, exam_config').eq('id', 1).single();
    if (!error && data) {
      if (data.clinic_config) {
        setClinicConfig(data.clinic_config);
        setRegTimes(generateTimes(data.clinic_config));
      }
      if (data.exam_config) {
        setExamConfig(data.exam_config);
        setExTimes(generateTimes(data.exam_config));
      }
    }
  };

  const fetchBookings = async () => {
    setLoadings(true);
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .neq('clinic_type', 'cancel_log')
      .order('clinic_date', { ascending: true })
      .order('clinic_time', { ascending: true });

    if (!error && data) {
      setBookings(data);
    }
    setLoadings(false);
  };

  const grouped = bookings.reduce((acc, b) => {
    if (!acc[b.clinic_date]) acc[b.clinic_date] = [];
    acc[b.clinic_date].push(b);
    return acc;
  }, {});

  const onDragStart = (e, id, type) => {
    e.dataTransfer.setData('id', id);
    e.dataTransfer.setData('type', type); // Track regular vs exam drag
    setTimeout(() => setDragActive(true), 0);
  };

  const onDragEnd = () => {
    setDragActive(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = async (e, targetDate, targetTime, targetType) => {
    e.preventDefault();
    setDragActive(false);
    const draggedId = e.dataTransfer.getData('id');
    const draggedType = e.dataTransfer.getData('type');
    if (!draggedId) return;

    if (targetDate === 'TRASH') {
      if (confirm('선택하신 예약을 삭제/취소 하시겠습니까?')) {
        await supabase.from('clinics').delete().eq('id', draggedId);
        fetchBookings();
      }
      return;
    }

    if(targetType && draggedType !== targetType) {
        // e.g., dropping a regular student into an exam box
        if(!confirm(`신청의 모드(정규 <-> 시험)가 다릅니다. 이 블록에 등록할 경우 ${targetType === 'exam' ? '시험기간' : '정규'} 신청으로 변경됩니다. 변경하시겠습니까?`)) {
            return;
        }
    }

    const mode = targetType || draggedType || 'regular';
    const limit = mode === 'exam' ? examConfig.capacity : clinicConfig.capacity;
    
    // Check capacity first before moving
    const { count } = await supabase.from('clinics').select('*', { count: 'exact', head: true })
      .eq('clinic_date', targetDate).eq('clinic_time', targetTime).eq('clinic_type', mode);
      
    if(count >= limit) {
      alert(`[${mode==='exam'?'시험':'정규'}] 해당 시간은 이미 ${limit}명의 정원이 모두 찼습니다.`);
      return;
    }

    // Update
    await supabase.from('clinics').update({ clinic_date: targetDate, clinic_time: targetTime, clinic_type: mode }).eq('id', draggedId);
    fetchBookings();
  };

  const handleAttendanceSync = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('현재 사용중인 출석부 양식(엑셀 원본)을 업로드하면, 학생들의 현재 사이트 예약 내역(예: 수 3시)을 해당 엑셀의 [클리닉 신청] 칸에 자동으로 채워서 새 파일로 다운로드 해줍니다.\n진행하시겠습니까?')) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    
    try {
      const dataBuffer = await file.arrayBuffer();
      const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const range = XLSX.utils.decode_range(ws['!ref']);
      const rowOffset = range.s.r; // This accounts for sheets that start with empty rows at the top
      
      if (!data || data.length < 1) {
        throw new Error('엑셀 시트에 데이터가 없습니다.');
      }

      const headerRow = data[0] || [];
      const normalize = str => (str || '').toString().replace(/\s/g, '');
      const normalizedHeaders = headerRow.map(normalize);
      
      const schoolIdx = normalizedHeaders.findIndex(h => h && h.includes('학교') && !h.includes('학년'));
      const nameIdx = normalizedHeaders.findIndex(h => h && h.includes('이름'));
      const clinicIdx = normalizedHeaders.findIndex(h => h && (h.includes('클리닉신청') || h.includes('클리닉')));

      if (schoolIdx === -1 || nameIdx === -1 || clinicIdx === -1) {
        alert('엑셀 상단(첫 줄)에 "학교", "이름", "클리닉 신청" 이라는 열 이름이 모두 존재해야 합니다!\n\n현재 읽힌 첫 줄: ' + headerRow.join(', '));
        setIsUploading(false);
        if (attendanceInputRef.current) attendanceInputRef.current.value = '';
        return;
      }

      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const getShortTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = String(timeStr).split(':');
        const hour = parseInt(h, 10);
        if (isNaN(hour)) return timeStr;
        const displayHour = hour > 12 ? hour - 12 : hour;
        const displayMin = m === '00' ? '' : (m === '30' ? '반' : ` ${m}분`);
        return `${displayHour}시${displayMin}`;
      };

      const bookingMap = {};
      const parseSchool = (s) => (String(s || '').split(/[\/\(\-]/)[0] || '').replace(/\s/g, '');
      bookings.forEach(b => {
        if (!b.clinic_date || !b.clinic_time) return;
        const d = new Date(b.clinic_date);
        if (isNaN(d.getTime())) return;
        
        const dayName = dayNames[d.getDay()]; // '수'
        const timeName = getShortTime(b.clinic_time); // '3시'
        
        const key = (parseSchool(b.school) + '_' + (b.student_name || '')).replace(/\s/g, '');
        const text = `${dayName} ${timeName}`;
        
        if (bookingMap[key]) {
            if(!bookingMap[key].includes(text)) {
                bookingMap[key] += `, ${text}`;
            }
        } else {
            bookingMap[key] = text;
        }
      });

      for (let i = 1; i < data.length; i++) {
        if (!data[i]) continue;
        const rowSchool = data[i][schoolIdx];
        const rowName = data[i][nameIdx];
        
        if (rowSchool && rowName) {
          const key = (parseSchool(rowSchool) + '_' + String(rowName)).replace(/\s/g, '');
          if (bookingMap[key]) {
            // 정확한 엑셀 물리적 행(Row) 위치로 맵핑: 데이터배열 인덱스(i) + 시트의 시작행 오프셋(rowOffset)
            const cellRef = XLSX.utils.encode_cell({c: clinicIdx, r: i + rowOffset});
            if (!ws[cellRef]) {
                ws[cellRef] = { t: 's', v: bookingMap[key] };
            } else {
                ws[cellRef].v = bookingMap[key];
            }
          }
        }
      }
      
      const now = new Date();
      const monthNum = now.getMonth() + 1;
      const weekNum = getWeekOfMonth(now);
      const outputFileName = `${monthNum}월 ${weekNum}주차 출석부.xlsx`;
      
      XLSX.writeFile(wb, outputFileName);
      alert('출석부에 성공적으로 클리닉 일정이 기록되었습니다!\n[' + outputFileName + '] 파일을 확인해주세요.');

    } catch (err) {
      console.error(err);
      alert('엑셀 변환 중 오류가 발생했습니다.\n에러 내용: ' + (err.message || String(err)));
    }
    
    setIsUploading(false);
    if (attendanceInputRef.current) attendanceInputRef.current.value = '';
  };

  if (!isAuthenticated) {
    return (
      <div className="glass-card animate-fade-in" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
        <h2 className="heading-primary" style={{ fontSize: '1.8rem' }}>관리자 로그인</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input type="password" placeholder="비밀번호" className="form-input" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">접속하기</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in">
      <h1 className="heading-primary" style={{marginBottom:'10px'}}>선생님 통합 스케줄</h1>
      <p style={{textAlign:'center', color:'var(--text-muted)', marginBottom:'30px'}}>
        아래 신청 카드를 드래그하여 다른 시간에 끼워 넣으세요. 취소 칸으로 밀면 삭제됩니다.
      </p>

      {/* Admin Settings Panel */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           {/* Attendance Sync Button */}
           <input 
             type="file" 
             accept=".xlsx, .xls" 
             style={{ display: 'none' }} 
             ref={attendanceInputRef}
             onChange={handleAttendanceSync}
           />
           <button 
             onClick={() => attendanceInputRef.current.click()} 
             style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
             disabled={isUploading}
           >
             {isUploading ? '작업 중...' : '📋 기존 출석부에 신청내역 기록하기'}
           </button>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <span style={{ fontSize: '0.9rem', color: '#64748b' }}>⚙️ 비밀번호 변경:</span>
           <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="새 비밀번호 입력" 
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', marginBottom: 0, border: '1px solid #cbd5e1' }} 
           />
           <button onClick={handleChangePassword} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>저장</button>
         </div>
      </div>


      
      {loadings ? (
        <p style={{ textAlign: 'center', marginTop: '30px' }}>스케줄을 불러오고 통합하는 중...</p>
      ) : (
        <>
          {/* Week Navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px', marginBottom: '20px' }}>
            <button onClick={handlePrevWeek} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>◀ 이전 주</button>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#334155' }}>
              {format(currentWeekStart, 'yyyy년 M월')} {getWeekOfMonth(currentWeekStart)}주차
            </h2>
            <button onClick={handleNextWeek} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>다음 주 ▶</button>
            <button onClick={handleThisWeek} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}>오늘</button>
          </div>

          {/* Calculate Booking Stats for Current Week */}
          {(() => {
            const bookedStudents = new Set();
            weekDates.forEach(date => {
              (grouped[date] || []).forEach(b => {
                bookedStudents.add(`${b.student_name}_${b.school}`);
              });
            });
            const unbookedStudents = students.filter(s => !bookedStudents.has(`${s.student_name}_${s.school}`));

            return (
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <button 
                  onClick={() => setShowUnbookedModal(true)} 
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                  onMouseOut={(e) => e.target.style.background = '#f8fafc'}
                >
                   📊 이번 주 신청 인원: <span style={{color:'#3b82f6'}}>{bookedStudents.size}명</span> / 전체 {students.length}명 <span style={{fontSize:'0.85rem', marginLeft:'10px', color:'#94a3b8'}}>(클릭하여 미신청자 명단 보기)</span>
                </button>
                
                {showUnbookedModal && createPortal(
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowUnbookedModal(false)}>
                    <div className="glass-card animate-fade-in" style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto', background: 'white' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>이번 주 미신청자 명단 ({unbookedStudents.length}명)</h2>
                        <button onClick={() => setShowUnbookedModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                      </div>
                      {unbookedStudents.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', padding: '20px 0' }}>🎉 모든 학생이 신청을 완료했습니다!</p>
                      ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {unbookedStudents.map(s => (
                            <li key={s.id} style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 'bold', color: '#334155' }}>{s.student_name}</span> 
                              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{s.school}{s.grade ? ` ${s.grade}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {weekDates.map(date => {
              const dateBookings = grouped[date] || [];
              const regularBookings = dateBookings.filter(b => b.clinic_type !== 'exam');
              const examBookings = dateBookings.filter(b => b.clinic_type === 'exam');

              const isToday = format(new Date(), 'yyyy-MM-dd') === date;
              const dayName = new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' });

              return (
                <div key={date} style={{ border: isToday ? '2px solid #3b82f6' : '1px solid var(--border-color)', borderRadius: '15px', padding: '20px', background: isToday ? '#eff6ff' : '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.4rem' }}>
                      📆 {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ({dayName})
                      {isToday && <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'white', background: '#3b82f6', padding: '3px 8px', borderRadius: '12px' }}>오늘</span>}
                    </h2>
                    <div 
                      style={{ padding: '8px 16px', border: '2px dashed #ef4444', background: dragActive ? '#fee2e2' : '#fef2f2', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '150px', textAlign: 'center', transition: 'all 0.2s', opacity: dragActive ? 1 : 0.6 }}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, 'TRASH', null, null)}
                    >
                      🗑️ 학생 드래그하여 삭제
                    </div>
                  </div>
                  
                  {/* Regular Clinics Grid */}
              <div style={{marginTop: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #fed7aa', borderLeft: '8px solid #ea580c'}}>
                <h3 style={{color: '#ea580c', marginTop: 0}}>정규 클리닉 ({clinicConfig.interval}분 단위 / {clinicConfig.capacity}명 제한)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                  {regTimes.map(time => {
                    const slotsForTime = regularBookings.filter(b => b.clinic_time === time);
                    return (
                      <div 
                        key={'reg'+time} 
                        className={`drop-zone ${dragActive ? 'active' : ''}`}
                        style={{minHeight: '100px', padding: '10px', background: '#fff7ed', borderColor: '#fed7aa'}}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, date, time, 'regular')}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#c2410c' }}>{time} <span style={{opacity:0.6}}>({slotsForTime.length}/{clinicConfig.capacity})</span></div>
                        {slotsForTime.map(b => (
                          <div 
                            key={b.id} 
                            className="slot-card"
                            style={{padding: '8px', borderLeftColor: '#ea580c'}}
                            draggable="true"
                            onDragStart={(e) => onDragStart(e, b.id, 'regular')}
                            onDragEnd={onDragEnd}
                          >
                            <div className="slot-name" style={{fontSize: '0.9rem'}}>{b.student_name}</div>
                            <div className="slot-subject" style={{fontSize: '0.75rem'}}>{b.school}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Exam Clinics Grid */}
              <div className="theme-pink" style={{marginTop: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #fbcfe8', borderLeft: '8px solid #db2777'}}>
                <h3 style={{color: '#db2777', marginTop: 0}}>시험기간 클리닉 ({examConfig.interval}분 단위 / {examConfig.capacity}명 제한)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {exTimes.map(time => {
                    const slotsForTime = examBookings.filter(b => b.clinic_time === time);
                    // Hide empty 15min slots unless Admin is dragging something right now, to save massive vertical space
                    // Wait, if dragging, show all blocks so admin can drop anywhere. If not dragging, show only blocks with data!
                    if(!dragActive && slotsForTime.length === 0) return null;
                    
                    return (
                      <div 
                        key={'exam'+time} 
                        className={`drop-zone ${dragActive ? 'active' : ''}`}
                        style={{minHeight: '100px', padding: '10px', background: '#fdf2f8', borderColor: '#fbcfe8'}}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, date, time, 'exam')}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#be185d' }}>{time} <span style={{opacity:0.6}}>({slotsForTime.length}/{examConfig.capacity})</span></div>
                        {slotsForTime.map(b => (
                          <div 
                            key={b.id} 
                            className="slot-card"
                            style={{padding: '8px', borderLeftColor: '#db2777'}}
                            draggable="true"
                            onDragStart={(e) => onDragStart(e, b.id, 'exam')}
                            onDragEnd={onDragEnd}
                          >
                            <div className="slot-name" style={{fontSize: '0.9rem'}}>{b.student_name}</div>
                            <div className="slot-subject" style={{fontSize: '0.75rem'}}>{b.school}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          );
        })}
          </div>
        </>
      )}
    </div>
  );
}
