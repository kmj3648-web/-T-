import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, LabelList } from 'recharts';
import html2canvas from 'html2canvas';

export default function ManagementPage() {
  const [filesData, setFilesData] = useState([]);
  const [settings, setSettings] = useState({});
  const [step, setStep] = useState(1); // 1: Upload, 2: Settings, 3: Report
  
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  const [selectedStudentKey, setSelectedStudentKey] = useState('');
  const [comment, setComment] = useState('');
  const reportRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const parsedFiles = [];
    for (let file of files) {
      const dataBuffer = await file.arrayBuffer();
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      let headerIdx = -1;
      for(let i=0; i<Math.min(10, data.length); i++) {
        const row = data[i] || [];
        if(row.some(c => typeof c === 'string' && c.includes('이름'))) {
          headerIdx = i;
          break;
        }
      }
      
      if(headerIdx !== -1) {
        const headers = data[headerIdx].map(h => (h||'').toString().replace(/\s/g, ''));
        const nameIdx = headers.findIndex(h => h.includes('이름'));
        const schoolIdx = headers.findIndex(h => h.includes('학교'));
        const gradeIdx = headers.findIndex(h => h.includes('학년'));
        const clinicResultIdx = headers.findIndex(h => h.includes('클리닉') && h.includes('결과'));
        const rankIdx = headers.findIndex(h => h.includes('등수'));
        const hwIdx = headers.findIndex(h => h.includes('숙제'));
        const noteIdx = headers.findIndex(h => h.includes('특이사항'));
        
        const fallbackClinicResultIdx = clinicResultIdx === -1 ? headers.findIndex(h => h.includes('맞춘')) : clinicResultIdx;
        const fallbackHwIdx = hwIdx === -1 ? headers.findIndex(h => h.includes('숙제')) : hwIdx;

        const rows = [];
        for(let i=headerIdx+1; i<data.length; i++) {
          const row = data[i];
          if(!row || !row[nameIdx]) continue;
          
          const parseNum = (val) => {
            if (val === undefined || val === null) return 0;
            const match = String(val).match(/[\d.]+/);
            return match ? parseFloat(match[0]) : 0;
          };

          rows.push({
            school: schoolIdx >= 0 ? String(row[schoolIdx] || '').trim() : '',
            grade: gradeIdx >= 0 ? String(row[gradeIdx] || '').trim() : '',
            name: String(row[nameIdx] || '').trim(),
            clinicResult: fallbackClinicResultIdx >= 0 ? parseNum(row[fallbackClinicResultIdx]) : 0,
            rank: 0, // 나중에 직접 계산
            homework: fallbackHwIdx >= 0 ? parseNum(row[fallbackHwIdx]) : 0,
            note: noteIdx >= 0 ? (row[noteIdx] || '') : ''
          });
        }

        // 직접 등수 계산 로직 (학교/학년별로 그룹지어 등수 계산)
        const groupedRows = {};
        rows.forEach(r => {
          const key = `${r.school}_${r.grade}`;
          if (!groupedRows[key]) groupedRows[key] = [];
          groupedRows[key].push(r);
        });

        const rankedRows = [];
        Object.keys(groupedRows).forEach(key => {
          const group = groupedRows[key];
          // 시험 점수(clinicResult) 기준 내림차순 정렬
          group.sort((a, b) => b.clinicResult - a.clinicResult);
          
          let currentRank = 1;
          for (let i = 0; i < group.length; i++) {
            if (i > 0 && group[i].clinicResult < group[i - 1].clinicResult) {
              currentRank = i + 1;
            }
            group[i].rank = currentRank;
            rankedRows.push(group[i]);
          }
        });

        parsedFiles.push({ fileName: file.name, data: rankedRows });
      }
    }
    
    if (parsedFiles.length === 0) {
      alert('올바른 형식의 출석부를 찾을 수 없습니다.');
      return;
    }

    setFilesData(parsedFiles);
    
    const initialSettings = {};
    parsedFiles.forEach(f => {
      initialSettings[f.fileName] = {};
      const uniqueGroups = new Set(f.data.map(d => `${d.school}_${d.grade}`));
      uniqueGroups.forEach(g => {
        initialSettings[f.fileName][g] = { maxHomework: 150, maxClinic: 30 };
      });
    });
    setSettings(initialSettings);
    setStep(2);
    setCurrentFileIndex(0);
  };

  const handleSettingChange = (fileName, group, field, value) => {
    setSettings(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [group]: {
          ...prev[fileName][group],
          [field]: Number(value) || 0
        }
      }
    }));
  };

  const allStudents = useMemo(() => {
    const students = new Set();
    filesData.forEach(f => {
      f.data.forEach(d => {
        students.add(`${d.school}_${d.grade}_${d.name}`);
      });
    });
    return Array.from(students).sort();
  }, [filesData]);

  const studentReportData = useMemo(() => {
    if (!selectedStudentKey) return [];
    const [school, grade, name] = selectedStudentKey.split('_');
    
    return filesData.map((f, index) => {
      const studentRow = f.data.find(d => d.school === school && d.grade === grade && d.name === name);
      const groupKey = `${school}_${grade}`;
      const config = settings[f.fileName]?.[groupKey] || { maxHomework: 150, maxClinic: 30 };
      
      const fileNameShort = `내신 ${index + 1}주차`;
      
      if (!studentRow) {
        return {
          name: fileNameShort,
          homework: 0,
          maxHomework: config.maxHomework,
          hwRate: 0,
          clinicResult: 0,
          maxClinic: config.maxClinic,
          rank: 0,
          note: ''
        };
      }
      
      return {
        name: fileNameShort,
        homework: studentRow.homework,
        maxHomework: config.maxHomework,
        hwRate: config.maxHomework > 0 ? (studentRow.homework / config.maxHomework) * 100 : 0,
        clinicResult: studentRow.clinicResult,
        maxClinic: config.maxClinic,
        rank: studentRow.rank,
        note: studentRow.note
      };
    });
  }, [filesData, settings, selectedStudentKey]);

  const exportAsPNG = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${selectedStudentKey.replace(/_/g, ' ')}_분석리포트.png`;
      link.href = url;
      link.click();
    } catch (err) {
      alert('PNG 저장 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 학생 데이터 중 숙제 최대값(수행한 갯수 또는 전체 갯수) 확인 (기본 150)
  const actualMaxHw = studentReportData.length > 0 
    ? Math.max(150, ...studentReportData.map(d => d.homework || 0), ...studentReportData.map(d => d.maxHomework || 150))
    : 150;
  // 30단위로 올림
  const chartMaxHw = Math.ceil(actualMaxHw / 30) * 30;
  // 30단위 틱 배열 생성
  const hwTicks = Array.from({ length: (chartMaxHw / 30) + 1 }, (_, i) => i * 30);

  return (
    <div className="theme-blue">
      <div className="glass-card animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', minHeight: '600px' }}>
        <h1 className="heading-primary">성적 및 출석 리포트 생성</h1>
        
        {/* STEP 1: Upload */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              출석부 엑셀 파일들을 선택해주세요. (다중 선택 가능)<br/>
              <span style={{ fontSize: '0.85rem' }}>양식: 학교 / 학년 / 이름 / 클리닉결과(맞춘갯수) / 등수 / 숙제결과 / 특이사항</span>
            </p>
            <input 
              type="file" 
              multiple 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* STEP 2: Settings */}
        {step === 2 && filesData.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>2단계: 출석부별 기준치 설정</h2>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))}
                  disabled={currentFileIndex === 0}
                >&lt; 이전 파일</button>
                <h3 style={{ margin: 0, color: '#334155' }}>
                  내신 {currentFileIndex + 1}주차 <span style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal'}}>({filesData[currentFileIndex].fileName})</span>
                </h3>
                <button 
                  className="btn-secondary" 
                  onClick={() => setCurrentFileIndex(Math.min(filesData.length - 1, currentFileIndex + 1))}
                  disabled={currentFileIndex === filesData.length - 1}
                >다음 파일 &gt;</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {Object.keys(settings[filesData[currentFileIndex].fileName] || {}).map(group => {
                  const config = settings[filesData[currentFileIndex].fileName][group];
                  const [sch, grd] = group.split('_');
                  return (
                    <div key={group} style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 'bold', width: '120px' }}>{sch || '(학교없음)'} {grd}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.9rem' }}>총 숙제 갯수:</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px', marginBottom: 0, padding: '4px' }} 
                          value={config.maxHomework}
                          onChange={e => handleSettingChange(filesData[currentFileIndex].fileName, group, 'maxHomework', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.9rem' }}>총 시험 문제수:</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px', marginBottom: 0, padding: '4px' }} 
                          value={config.maxClinic}
                          onChange={e => handleSettingChange(filesData[currentFileIndex].fileName, group, 'maxClinic', e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button className="btn-primary" onClick={() => setStep(3)}>설정 완료 및 리포트 보기</button>
            </div>
          </div>
        )}

        {/* STEP 3: Report */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => setStep(2)}>⬅ 설정으로 돌아가기</button>
                <button className="btn-primary" onClick={exportAsPNG} disabled={!selectedStudentKey}>📸 PNG 저장</button>
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>리포트를 조회할 학생 선택</label>
                <select 
                  className="form-select" 
                  style={{ marginBottom: 0 }}
                  value={selectedStudentKey}
                  onChange={e => setSelectedStudentKey(e.target.value)}
                >
                  <option value="">학생을 선택하세요</option>
                  {allStudents.map(s => {
                    const [sch, grd, nm] = s.split('_');
                    return <option key={s} value={s}>{sch} {grd} {nm}</option>
                  })}
                </select>
              </div>
            </div>

            {selectedStudentKey && (
              <div ref={reportRef} style={{ background: 'white', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                {(() => {
                  const [sch, grd, nm] = selectedStudentKey.split('_');
                  return (
                    <div style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '10px', marginBottom: '20px' }}>
                      <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem' }}>{nm} 학생 종합 리포트</h2>
                      <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>{sch} {grd}</p>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Chart 1: Homework */}
                  <div>
                    <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '15px' }}>📘 숙제 제출 현황</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer>
                        <BarChart data={studentReportData} layout="vertical" margin={{ top: 20, right: 60, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, chartMaxHw]} ticks={hwTicks} label={{ value: '숙제 갯수', position: 'insideBottom', offset: -10 }} />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Legend verticalAlign="top" />
                          <Bar dataKey="homework" name="수행한 숙제" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            <LabelList content={(props) => {
                              const { x, y, width, height, index } = props;
                              const d = studentReportData[index];
                              if (!d) return null;
                              return (
                                <text x={x + width + 8} y={y + height / 2} fill="#3b82f6" fontSize={13} textAnchor="start" dominantBaseline="central" fontWeight="bold">
                                  ({d.homework}/{d.maxHomework})
                                </text>
                              );
                            }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Clinic & Exam */}
                  <div>
                    <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '15px' }}>📈 클리닉(시험) 등수 추이</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer>
                        <LineChart data={studentReportData} margin={{ top: 30, right: 50, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis reversed={true} domain={[1, 'dataMax + 5']} label={{ value: '등수', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            formatter={(value, name, props) => {
                              const d = props.payload;
                              return [`${value}등 (${d.clinicResult}/${d.maxClinic})`, '상세 기록'];
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rank" 
                            name="등수" 
                            stroke="#ef4444" 
                            strokeWidth={3} 
                            dot={{r:5, fill:'#ef4444'}}
                            label={(props) => {
                              const { x, y, stroke, index } = props;
                              const d = studentReportData[index];
                              if (!d || d.rank === 0) return null;
                              return (
                                <text x={x} y={y - 12} fill={stroke} fontSize={12} textAnchor="middle" fontWeight="bold">
                                  {d.rank}등 ({d.clinicResult}/{d.maxClinic})
                                </text>
                              );
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Notes / Special Remarks */}
                  <div>
                    <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '10px' }}>📝 주차별 특이사항</h3>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {studentReportData.filter(d => d.note).length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569' }}>
                          {studentReportData.filter(d => d.note).map((d, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>
                              <strong>[{d.name}]</strong> {d.note}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>특이사항 없음</span>
                      )}
                    </div>
                  </div>

                  {/* Teacher's Comment */}
                  <div style={{ marginTop: '10px' }}>
                    <h3 style={{ color: '#334155', fontSize: '1.2rem', marginBottom: '10px' }}>👩‍🏫 선생님 코멘트</h3>
                    <textarea 
                      className="form-input" 
                      style={{ 
                        minHeight: '100px', 
                        resize: 'none', 
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        width: '100%'
                      }} 
                      placeholder="학부모님/학생에게 전달할 코멘트를 작성하세요. (PNG에 함께 출력됩니다)"
                      value={comment}
                      onChange={e => {
                        setComment(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = (e.target.scrollHeight) + 'px';
                      }}
                      onFocus={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = (e.target.scrollHeight) + 'px';
                      }}
                    ></textarea>
                  </div>
                  
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
