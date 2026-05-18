import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const getEndTime = (timeStr, type) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  
  if (type === 'exam') {
    let newM = m + 15;
    let newH = h;
    if (newM >= 60) {
      newH += 1;
      newM -= 60;
    }
    return `${newH}:${newM.toString().padStart(2, '0')}`;
  }
  
  return `${h + 1}:${m.toString().padStart(2, '0')}`;
};

export default function LookupPage() {
  const [formData, setFormData] = useState({ student_name: '', birthdate: '' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null means not searched yet
  const [isEditing, setIsEditing] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.birthdate) {
      alert('이름과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);

    // 1. 학생 정보 확인
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_name', formData.student_name)
      .eq('birthdate', formData.birthdate)
      .single();

    if (studentError || !studentData) {
      setLoading(false);
      alert('학생 정보(이름, 비밀번호)가 일치하지 않거나 등록되지 않았습니다.');
      return;
    }

    // 2. 해당 학생의 클리닉 신청 내역 조회
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('student_name', studentData.student_name)
      .eq('school', studentData.school)
      .neq('clinic_type', 'cancel_log')
      .order('clinic_date', { ascending: false });
    
    setLoading(false);
    if (!error) {
      setResults(data);
    } else {
      alert('조회 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (r) => {
    const dateObj = new Date(r.clinic_date);
    const startDate = format(startOfWeek(dateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const endDate = format(endOfWeek(dateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');

    const { count: cancelCount } = await supabase
      .from('clinics')
      .select('*', { count: 'exact', head: true })
      .eq('student_name', r.student_name)
      .eq('school', r.school)
      .eq('clinic_type', 'cancel_log')
      .gte('clinic_date', startDate)
      .lte('clinic_date', endDate);

    if (cancelCount > 0) {
      alert('경고: 한 주(일~토)에 취소는 1회만 가능합니다.\\n이미 해당 주차의 취소 횟수를 모두 사용하셨습니다.');
      return;
    }

    if (window.confirm('신청을 정말 취소하시겠습니까?\\n취소하시면 이번 주에는 더 이상 다른 예약을 취소할 수 없습니다.')) {
      const { error } = await supabase.from('clinics').delete().eq('id', r.id);
      if (!error) {
        await supabase.from('clinics').insert([{
          student_name: r.student_name,
          school: r.school,
          clinic_date: r.clinic_date,
          clinic_time: '00:00',
          clinic_type: 'cancel_log'
        }]);
        setResults(results.filter(item => item.id !== r.id));
        alert('취소되었습니다.');
      }
    }
  };

  return (
    <div className="theme-blue">
      <div className="glass-card animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 className="heading-primary">신청 내역 조회</h1>
        
        <form onSubmit={handleSearch} className="lookup-form">
        <div style={{ flex: 1 }}>
          <label className="form-label">이름</label>
          <input 
            type="text" className="form-input" 
            value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} required 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">비밀번호(부모님 전화번호 뒷 4자리)</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="예: 1234" 
            maxLength={4}
            value={formData.birthdate} 
            onChange={e => setFormData({...formData, birthdate: e.target.value})} 
            required 
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '조회중...' : '조회하기'}
        </button>
      </form>

      {results && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          {results.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>일치하는 클리닉 신청 내역이 없습니다.</p>
          ) : (
            results.map(r => (
              <div key={r.id} className="slot-card lookup-result-item">
                <div>
                  <div className="slot-name">
                    <span style={{ display: 'inline-block', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', marginRight: '8px', background: r.clinic_type === 'exam' ? '#fdf2f8' : '#fff7ed', color: r.clinic_type === 'exam' ? '#db2777' : '#ea580c', border: r.clinic_type==='exam' ? '1px solid #fbcfe8' : '1px solid #fed7aa' }}>
                      {r.clinic_type === 'exam' ? '시험' : '정규'}
                    </span>
                    {r.clinic_date} / {r.clinic_time} ~ {getEndTime(r.clinic_time, r.clinic_type)}
                  </div>
                  <div className="slot-subject">신청자: {r.student_name} ({r.school})</div>
                </div>
                <div>
                  <button onClick={() => handleDelete(r)} className="btn-danger">취소하기</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
}
