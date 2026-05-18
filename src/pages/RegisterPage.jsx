import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    student_name: '',
    school: '',
    grade: '',
    birthdate: ''
  });
  
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('student_name', { ascending: true });
    
    if (error) {
      console.error(error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.school || !formData.grade || !formData.birthdate) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('students')
      .insert([formData]);

    setLoading(false);
    
    if (error) {
      console.error(error);
      alert('학생 등록 중 오류가 발생했습니다.');
    } else {
      alert('학생이 등록되었습니다.');
      setFormData({ student_name: '', school: '', grade: '', birthdate: '' });
      fetchStudents();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    setLoading(false);
    
    if (error) {
      console.error(error);
      alert('삭제 중 오류가 발생했습니다.');
    } else {
      fetchStudents();
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      alert('엑셀 데이터를 붙여넣어 주세요.');
      return;
    }

    const lines = bulkData.trim().split('\n');
    const newStudents = [];

    for (const line of lines) {
      // 엑셀에서 복사하면 보통 탭(\t)으로 분리됨. 쉼표(,)도 지원.
      const parts = line.split(/[\t,]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        newStudents.push({
          student_name: parts[0],
          school: parts[1],
          grade: parts[2],
          birthdate: parts[3]
        });
      }
    }

    if (newStudents.length === 0) {
      alert('유효한 데이터가 없습니다. (이름, 학교, 학년, 부모님 전화번호 뒷 4자리 순서인지 확인해주세요)');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('students')
      .insert(newStudents);

    setLoading(false);

    if (error) {
      console.error(error);
      alert('일괄 등록 중 오류가 발생했습니다. 중복된 데이터가 있는지 확인해주세요.');
    } else {
      alert(`${newStudents.length}명의 학생이 일괄 등록되었습니다.`);
      setBulkData('');
      fetchStudents();
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="heading-primary" style={{ color: '#10b981' }}>학생 명단 관리</h1>
      
      <div className="grid-cols-2" style={{ gap: '30px' }}>
        {/* 단일 학생 등록 폼 */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--primary)' }}>개별 학생 등록</h2>
          <form onSubmit={handleAddStudent}>
            <div className="form-group">
              <label className="form-label">이름</label>
              <input type="text" name="student_name" className="form-input" value={formData.student_name} onChange={handleChange} placeholder="예: 홍길동" />
            </div>
            <div className="form-group">
              <label className="form-label">학교</label>
              <input type="text" name="school" className="form-input" value={formData.school} onChange={handleChange} placeholder="예: 한영고" />
            </div>
            <div className="form-group">
              <label className="form-label">학년</label>
              <input type="text" name="grade" className="form-input" value={formData.grade} onChange={handleChange} placeholder="예: 1학년" />
            </div>
            <div className="form-group">
              <label className="form-label">부모님 전화번호 뒷 4자리</label>
              <input type="text" name="birthdate" className="form-input" value={formData.birthdate} onChange={handleChange} placeholder="예: 1234" maxLength={4} />
            </div>
            <button type="submit" className="btn-primary" style={{ background: '#10b981' }} disabled={loading}>
              {loading ? '처리 중...' : '등록하기'}
            </button>
          </form>
        </div>

        {/* 일괄 학생 등록 폼 (엑셀 복붙) */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#8b5cf6' }}>엑셀 일괄 등록</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            엑셀에서 <b>[이름, 학교, 학년, 부모님 전화번호 뒷 4자리]</b> 열을 선택 후 복사하여 아래에 붙여넣어 주세요. (이름 | 학교 | 1학년 | 1234)
          </p>
          <div className="form-group">
            <textarea 
              className="form-input" 
              style={{ height: '150px', resize: 'vertical' }}
              placeholder="홍길동	한영고	1학년	1234&#10;김철수	선사고	2학년	5678"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
            ></textarea>
          </div>
          <button type="button" className="btn-primary" style={{ background: '#8b5cf6' }} onClick={handleBulkUpload} disabled={loading}>
            {loading ? '처리 중...' : '일괄 등록하기'}
          </button>
        </div>
      </div>

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text-color)' }}>등록된 학생 목록 (총 {students.length}명)</h2>
      
      {loading && students.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '20px' }}>로딩 중...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '12px', color: '#4b5563' }}>이름</th>
                <th style={{ padding: '12px', color: '#4b5563' }}>학교</th>
                <th style={{ padding: '12px', color: '#4b5563' }}>학년</th>
                <th style={{ padding: '12px', color: '#4b5563' }}>부모님 전화번호(뒷4자리)</th>
                <th style={{ padding: '12px', color: '#4b5563', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{st.student_name}</td>
                  <td style={{ padding: '12px' }}>{st.school}</td>
                  <td style={{ padding: '12px' }}>{st.grade}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{st.birthdate}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDelete(st.id)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    등록된 학생이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
