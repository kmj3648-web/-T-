import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const [loadings, setLoadings] = useState(true);
  const [bookings, setBookings] = useState([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '1234';

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

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

  const fetchBookings = async () => {
    setLoadings(true);
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
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

  const REGULAR_TIMES = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const EXAM_TIMES = ["15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00", "21:15", "21:30"];

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
    const limit = mode === 'exam' ? 2 : 10;
    
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
        아래 신청 카드를 드래그하여 다른 시간에 끼워 넣으시라. 취소 칸으로 밀면 삭제됩니다.
      </p>

      {/* Admin Settings Panel */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
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

      {/* Trash Drop Zone */}
      <div 
        className={`trash-zone ${dragActive ? 'active' : ''}`}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, 'TRASH', null, null)}
      >
        여기로 학생 카드를 드래그하여 예약 취소 (삭제) 처리
      </div>
      
      {loadings ? (
        <p style={{ textAlign: 'center', marginTop: '30px' }}>스케줄을 불러오고 통합하는 중...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop:'30px' }}>현재 신청 내역이 없습니다.</p>
      ) : (
        Object.keys(grouped).map(date => {
          const regularBookings = grouped[date].filter(b => b.clinic_type !== 'exam');
          const examBookings = grouped[date].filter(b => b.clinic_type === 'exam');

          return (
            <div key={date} style={{ marginTop: '50px', border: '1px solid var(--border-color)', borderRadius: '15px', padding: '20px', background: '#fafafa' }}>
              <h2 style={{ color: '#1f2937', paddingBottom: '10px', fontSize: '1.4rem' }}>
                📆 {new Date(date).toLocaleDateString('ko-KR', { weekday: 'short', month: 'long', day: 'numeric' })}
              </h2>
              
              {/* Regular Clinics Grid */}
              <div style={{marginTop: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #fed7aa', borderLeft: '8px solid #ea580c'}}>
                <h3 style={{color: '#ea580c', marginTop: 0}}>정규 클리닉 (1시간 단위 / 10명 제한)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                  {REGULAR_TIMES.map(time => {
                    const slotsForTime = regularBookings.filter(b => b.clinic_time === time);
                    return (
                      <div 
                        key={'reg'+time} 
                        className={`drop-zone ${dragActive ? 'active' : ''}`}
                        style={{minHeight: '100px', padding: '10px', background: '#fff7ed', borderColor: '#fed7aa'}}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, date, time, 'regular')}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#c2410c' }}>{time} <span style={{opacity:0.6}}>({slotsForTime.length}/10)</span></div>
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
                <h3 style={{color: '#db2777', marginTop: 0}}>시험기간 클리닉 (15분 단위 / 2명 제한)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {EXAM_TIMES.map(time => {
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
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#be185d' }}>{time} <span style={{opacity:0.6}}>({slotsForTime.length}/2)</span></div>
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
        })
      )}
    </div>
  );
}
