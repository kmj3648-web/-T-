import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_CLINIC_CONFIG = { days: [3, 4, 5], startTime: '15:00', endTime: '20:00', interval: 60, capacity: 10, teacherName: '' };
const DEFAULT_EXAM_CONFIG = { days: [3, 4, 5], startTime: '15:00', endTime: '21:30', interval: 15, capacity: 2 };

export default function DevPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [clinicConfig, setClinicConfig] = useState(DEFAULT_CLINIC_CONFIG);
  const [examConfig, setExamConfig] = useState(DEFAULT_EXAM_CONFIG);
  const [loading, setLoading] = useState(true);

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '1234';

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfig();
    }
  }, [isAuthenticated]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('clinic_config, exam_config')
      .eq('id', 1)
      .single();

    if (!error && data) {
      if (data.clinic_config) setClinicConfig(data.clinic_config);
      if (data.exam_config) setExamConfig(data.exam_config);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
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

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('settings')
      .update({
        clinic_config: clinicConfig,
        exam_config: examConfig
      })
      .eq('id', 1);
      
    setLoading(false);
    if (error) {
      alert(`설정 저장 중 오류가 발생했습니다: ${error.message || error.details || JSON.stringify(error)}`);
      console.error(error);
    } else {
      alert('설정이 성공적으로 저장되었습니다!');
    }
  };

  const toggleDay = (configType, dayIndex) => {
    if (configType === 'clinic') {
      const newDays = clinicConfig.days.includes(dayIndex)
        ? clinicConfig.days.filter(d => d !== dayIndex)
        : [...clinicConfig.days, dayIndex].sort();
      setClinicConfig({ ...clinicConfig, days: newDays });
    } else {
      const newDays = examConfig.days.includes(dayIndex)
        ? examConfig.days.filter(d => d !== dayIndex)
        : [...examConfig.days, dayIndex].sort();
      setExamConfig({ ...examConfig, days: newDays });
    }
  };

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  if (!isAuthenticated) {
    return (
      <div className="glass-card animate-fade-in" style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
        <h2 className="heading-primary" style={{ fontSize: '1.8rem' }}>Dev 로그인</h2>
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
    <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="heading-primary">초기 설정 페이지 (Dev)</h1>
      <p style={{textAlign:'center', color:'var(--text-muted)', marginBottom:'30px'}}>
        클리닉 신청과 시험기간 신청의 기본 요일, 시간, 정원을 설정합니다.
      </p>

      {loading ? (
        <p style={{ textAlign: 'center' }}>설정을 불러오는 중...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* 사이트 일반 설정 */}
          <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', borderLeft: '8px solid #22c55e' }}>
            <h2 style={{ color: '#16a34a', marginTop: 0, marginBottom: '20px' }}>사이트 일반 설정</h2>
            <div className="form-group">
              <label className="form-label">선생님 이름 (예: 민정)</label>
              <input type="text" className="form-input" value={clinicConfig.teacherName || ''} onChange={e => setClinicConfig({...clinicConfig, teacherName: e.target.value})} placeholder="예: 민정" />
              <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px'}}>입력하신 이름으로 사이트 제목이 변경됩니다. (예: 민정T 클리닉 신청 사이트)</p>
            </div>
          </div>
          
          {/* 정규 클리닉 설정 */}
          <div style={{ padding: '20px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #fed7aa', borderLeft: '8px solid #ea580c' }}>
            <h2 style={{ color: '#ea580c', marginTop: 0, marginBottom: '20px' }}>정규 클리닉 설정</h2>
            
            <div className="form-group">
              <label className="form-label">오픈 요일</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {daysOfWeek.map((day, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: clinicConfig.days.includes(idx) ? '#ea580c' : '#fff', color: clinicConfig.days.includes(idx) ? '#fff' : '#333', padding: '5px 10px', border: '1px solid #ea580c', borderRadius: '5px' }}>
                    <input 
                      type="checkbox" 
                      checked={clinicConfig.days.includes(idx)}
                      onChange={() => toggleDay('clinic', idx)}
                      style={{ display: 'none' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">첫 타임 시작 시간</label>
                <input type="time" className="form-input" value={clinicConfig.startTime} onChange={e => setClinicConfig({...clinicConfig, startTime: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">마지막 타임 시작 시간</label>
                <input type="time" className="form-input" value={clinicConfig.endTime} onChange={e => setClinicConfig({...clinicConfig, endTime: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">시간 간격 (분)</label>
                <input type="number" className="form-input" value={clinicConfig.interval} onChange={e => setClinicConfig({...clinicConfig, interval: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">시간당 수용 인원</label>
                <input type="number" className="form-input" value={clinicConfig.capacity} onChange={e => setClinicConfig({...clinicConfig, capacity: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>

          {/* 시험기간 클리닉 설정 */}
          <div className="theme-pink" style={{ padding: '20px', background: '#fdf2f8', borderRadius: '12px', border: '1px solid #fbcfe8', borderLeft: '8px solid #db2777' }}>
            <h2 style={{ color: '#db2777', marginTop: 0, marginBottom: '20px' }}>시험기간 클리닉 설정</h2>
            
            <div className="form-group">
              <label className="form-label">오픈 요일</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {daysOfWeek.map((day, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: examConfig.days.includes(idx) ? '#db2777' : '#fff', color: examConfig.days.includes(idx) ? '#fff' : '#333', padding: '5px 10px', border: '1px solid #db2777', borderRadius: '5px' }}>
                    <input 
                      type="checkbox" 
                      checked={examConfig.days.includes(idx)}
                      onChange={() => toggleDay('exam', idx)}
                      style={{ display: 'none' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">첫 타임 시작 시간</label>
                <input type="time" className="form-input" value={examConfig.startTime} onChange={e => setExamConfig({...examConfig, startTime: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">마지막 타임 시작 시간</label>
                <input type="time" className="form-input" value={examConfig.endTime} onChange={e => setExamConfig({...examConfig, endTime: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">시간 간격 (분)</label>
                <input type="number" className="form-input" value={examConfig.interval} onChange={e => setExamConfig({...examConfig, interval: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">시간당 수용 인원</label>
                <input type="number" className="form-input" value={examConfig.capacity} onChange={e => setExamConfig({...examConfig, capacity: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary" style={{ width: '100%', fontSize: '1.2rem', padding: '15px' }}>설정 저장하기</button>
        </div>
      )}
    </div>
  );
}
