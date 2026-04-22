import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [formData, setFormData] = useState({ student_name: '', school: '예비고1' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null means not searched yet
  const [isEditing, setIsEditing] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('student_name', formData.student_name)
      .eq('school', formData.school)
      .order('clinic_date', { ascending: false });
    
    setLoading(false);
    if (!error) {
      setResults(data);
    } else {
      alert('조회 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('신청을 정말 취소하시겠습니까?')) {
      const { error } = await supabase.from('clinics').delete().eq('id', id);
      if (!error) {
        setResults(results.filter(r => r.id !== id));
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
          <label className="form-label">학교</label>
          <select className="form-select" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})}>
            <option value="예비고1">예비고1</option>
            <option value="선사고">선사고</option>
            <option value="한영고">한영고</option>
          </select>
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
                  <button onClick={() => handleDelete(r.id)} className="btn-danger">취소하기</button>
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
