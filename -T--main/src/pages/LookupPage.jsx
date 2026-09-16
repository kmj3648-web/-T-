import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import ErrorModal, { parseError } from '../components/ErrorModal';

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
  const [errorModal, setErrorModal] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const studentName = formData.student_name.trim();
    const birthDate = formData.birthdate.trim();

    if (!studentName || !birthDate) {
      alert('이름과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);

    // 1. 학생 정보 확인
    const { data: studentDataList, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_name', studentName)
      .eq('birthdate', birthDate);

    if (studentError) {
      setLoading(false);
      setErrorModal(parseError(studentError, '학생 정보 조회 실패'));
      return;
    }

    if (!studentDataList || studentDataList.length === 0) {
      setLoading(false);
      setErrorModal({
        title: '학생 미등록 안내',
        message: '입력하신 이름과 비밀번호(부모님 전화번호 뒷 4자리)에 일치하는 학생이 없습니다.',
        suggestion: '이름과 비밀번호를 다시 확인하시거나 [학생 명단 관리] 탭에서 학생 등록 여부를 확인해 주세요.'
      });
      return;
    }

    const studentData = studentDataList[0];

    // 2. 해당 학생의 클리닉 신청 내역 조회
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('student_name', studentData.student_name)
      .eq('school', studentData.school)
      .order('clinic_date', { ascending: false });
    
    setLoading(false);
    if (!error) {
      setResults(data ? data.filter(item => !['cancel_log', 'cancel_log_regular', 'cancel_log_exam'].includes(item.clinic_type)) : []);
    } else {
      console.error(error);
      setErrorModal(parseError(error, '신청 내역 조회 중 오류 발생'));
    }
  };

  const handleDelete = async (r) => {
    const dateObj = new Date(r.clinic_date);
    const startDate = format(startOfWeek(dateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const endDate = format(endOfWeek(dateObj, { weekStartsOn: 0 }), 'yyyy-MM-dd');

    const isExam = r.clinic_type === 'exam';
    const logType = isExam ? 'cancel_log_exam' : 'cancel_log_regular';
    const typeLabel = isExam ? '시험기간' : '정규';

    const { data: cancelLogs, error: cancelError } = await supabase
      .from('clinics')
      .select('*')
      .eq('student_name', r.student_name)
      .eq('school', r.school)
      .gte('clinic_date', startDate)
      .lte('clinic_date', endDate);

    if (cancelError) {
      setErrorModal(parseError(cancelError, '취소 이력 조회 중 오류 발생'));
      return;
    }

    const cancelCount = cancelLogs
      ? cancelLogs.filter(b => isExam ? b.clinic_type === 'cancel_log_exam' : ['cancel_log', 'cancel_log_regular'].includes(b.clinic_type)).length
      : 0;

    if (cancelCount >= 2) {
      alert(`경고: 한 주(일~토)에 ${typeLabel} 클리닉 취소는 최대 2회만 가능합니다.\n이미 해당 주차의 취소 횟수를 모두 사용하셨습니다.`);
      return;
    }

    if (window.confirm(`${typeLabel} 클리닉 신청을 정말 취소하시겠습니까?\n취소하시면 이번 주에는 해당 유형의 클리닉을 최대 2회까지만 취소할 수 있습니다. (현재 취소 횟수: ${cancelCount}/2)`)) {
      const { error } = await supabase.from('clinics').delete().eq('id', r.id);
      if (!error) {
        await supabase.from('clinics').insert([{
          student_name: r.student_name,
          school: r.school,
          clinic_date: r.clinic_date,
          clinic_time: '00:00',
          clinic_type: logType
        }]);
        setResults(results.filter(item => item.id !== r.id));
        alert('취소되었습니다.');
      } else {
        setErrorModal(parseError(error, '신청 취소 실패'));
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

      {/* Error Modal */}
      <ErrorModal errorInfo={errorModal} onClose={() => setErrorModal(null)} />
    </div>
  );
}
