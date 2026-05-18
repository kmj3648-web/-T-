const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'dummy_data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const roster = [
    { 이름: '김철수', 학교: '선사고', 학년: '1학년' },
    { 이름: '이영희', 학교: '선사고', 학년: '1학년' },
    { 이름: '박지민', 학교: '선사고', 학년: '2학년' },
    { 이름: '최우혁', 학교: '한영고', 학년: '1학년' },
    { 이름: '정다은', 학교: '한영고', 학년: '1학년' },
    { 이름: '강태석', 학교: '예비고1', 학년: '1학년' }
];

const wbMaster = XLSX.utils.book_new();
const wsMaster = XLSX.utils.json_to_sheet(roster);
XLSX.utils.book_append_sheet(wbMaster, wsMaster, 'Sheet1');
XLSX.writeFile(wbMaster, path.join(outputDir, '샘플_출석부_마스터.xlsx'));

for (let w = 1; w <= 6; w++) {
    const weekData = roster.map((student, idx) => {
        const baseHw = 120;
        const hwProgression = Math.min(150, baseHw + (w * 5) + (Math.random() * 10));
        
        const baseScore = 12;
        const scoreProgression = Math.min(20, baseScore + (w * 1.5) + (Math.random() * 2));
        
        return {
            학교: student.학교,
            이름: student.이름,
            숙제: Math.round(hwProgression), // 120 -> ~150
            시험점수: Math.round(scoreProgression), // 12 -> ~20
            클리닉_신청: ''
        };
    });
    
    const wbWeek = XLSX.utils.book_new();
    const wsWeek = XLSX.utils.json_to_sheet(weekData);
    XLSX.utils.book_append_sheet(wbWeek, wsWeek, 'Sheet1');
    XLSX.writeFile(wbWeek, path.join(outputDir, `내신_${w}주차.xlsx`));
}

console.log('Successfully generated 1 master roster and 6 weekly attendance dummy files in ./dummy_data');
