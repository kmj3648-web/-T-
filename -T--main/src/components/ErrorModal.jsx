import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Supabase 또는 일반 JS 에러를 구체적인 사용자 안내 모달 정보로 변환하는 파서
 */
export function parseError(error, defaultTitle = '오류가 발생했습니다') {
  if (!error) return null;

  let title = defaultTitle;
  let message = typeof error === 'string' ? error : (error.message || '알 수 없는 오류가 발생했습니다.');
  let code = error.code || '';
  let details = error.details || error.hint || '';
  let suggestion = '';

  const msgLower = message.toLowerCase();

  if (code === '42501' || msgLower.includes('row-level security') || msgLower.includes('policy')) {
    title = '🔒 Supabase 보안 정책(RLS) 오류';
    suggestion = 'Supabase 대시보드 -> SQL Editor에서 RLS를 비활성화하거나 정책을 허용해 주세요.\n예: ALTER TABLE students DISABLE ROW LEVEL SECURITY;\nALTER TABLE clinics DISABLE ROW LEVEL SECURITY;';
  } else if (code === '23505' || msgLower.includes('unique constraint') || msgLower.includes('duplicate')) {
    title = '⚠️ 중복 데이터 오류';
    suggestion = '이미 동일한 정보(이름과 부모님 전화번호 뒷 4자리)를 가진 데이터가 존재합니다.';
  } else if (code === '42P01' || (msgLower.includes('relation') && msgLower.includes('does not exist'))) {
    title = '📦 Supabase 테이블 미생성 오류';
    suggestion = 'Supabase 데이터베이스에 해당 테이블이 존재하지 않습니다. Supabase 대시보드 -> SQL Editor에서 테이블 생성 쿼리를 실행해 주세요.';
  } else if (msgLower.includes('failed to fetch') || msgLower.includes('networkerror') || msgLower.includes('your_supabase_url')) {
    title = '🌐 Supabase 연결 실패';
    suggestion = 'Vercel 환경 변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 없거나 올바르지 않습니다. Vercel 프로젝트 설정에서 환경 변수를 등록하고 [Redeploy(재배포)]를 해주세요.';
  } else if (code === 'PGRST116') {
    title = '🔍 데이터 검색 오류';
    suggestion = '해당 조건에 해당하는 데이터가 존재하지 않거나, 중복 데이터가 2개 이상 선택되었습니다.';
  }

  return { title, message, code, details, suggestion };
}

/**
 * 상세 오류 팝업 모달 컴포넌트
 */
export default function ErrorModal({ errorInfo, onClose }) {
  if (!errorInfo) return null;

  const { title, message, code, details, suggestion } = typeof errorInfo === 'object' && errorInfo.title 
    ? errorInfo 
    : parseError(errorInfo);

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #fee2e2',
          padding: '24px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🚨</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#dc2626', fontWeight: 800 }}>
              {title || '오류 발생'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Main Error Message Box */}
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '10px', 
            padding: '12px 16px', 
            color: '#991b1b',
            fontSize: '0.95rem',
            wordBreak: 'break-word',
            lineHeight: 1.5
          }}>
            <strong>원인:</strong> {message}
          </div>

          {/* Optional Code & Details */}
          {(code || details) && (
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '10px 14px', 
              fontSize: '0.85rem', 
              color: '#475569',
              fontFamily: 'monospace'
            }}>
              {code && <div><strong>Error Code:</strong> {code}</div>}
              {details && <div style={{ marginTop: code ? '4px' : '0' }}><strong>Details:</strong> {details}</div>}
            </div>
          )}

          {/* Actionable Suggestion / Solution Tip */}
          {suggestion && (
            <div style={{ 
              background: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '10px', 
              padding: '12px 16px', 
              color: '#1e40af',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-line'
            }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>💡 해결 가이드:</strong>
              {suggestion}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'background 0.2s'
            }}
          >
            확인 (닫기)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
