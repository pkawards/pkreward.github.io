import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildHonorReport as buildReport } from '../js/reports/honor-report.js';
const award = {
    competition: 'การแข่งขันตอบปัญหาภาษาไทย', rank: 'ชนะเลิศ', level: 'ประเทศ',
    organizer: 'โรงเรียนตัวอย่าง', students: Array.from({length: 53}, (_, i) =>
        ({prefix:'เด็กหญิง', name:'นักเรียนตัวอย่าง ลำดับ ' + (i+1), grade:'ม.3', room:'2'})),
    teachers: [{prefix:'นาง', name:'ครูตัวอย่าง'}]
};
const render = (items) => buildReport({ภาษาไทย:items}, ['ภาษาไทย'], item => item.priority || 0, () => 'วันที่ตัวอย่าง');
test('large teams continue in bounded groups with every person exactly once', () => {
    const html = render([award]);
    assert.equal((html.match(/นักเรียนตัวอย่าง ลำดับ /g) || []).length, 53);
    assert.equal((html.match(/ครูตัวอย่าง/g) || []).length, 1);
    assert.equal((html.match(/<tbody>/g) || []).length, 14);
    assert.ok([...html.matchAll(/rowspan="(\d+)"/g)].every(m => Number(m[1]) <= 4));
});
test('ranked records retain dates and escape participant input', () => {
    const html = render([{competition:'รายการที่สอง'}, {competition:'รายการแรก', priority:1, awardDate:'2026-11-19', students:[{name:'<b>&'}]}]);
    assert.ok(html.indexOf('รายการแรก') < html.indexOf('รายการที่สอง'));
    assert.ok(html.includes('&lt;b&gt;&amp;'));
    assert.ok(html.includes('วันที่ตัวอย่าง'));
});
if (process.argv[2]) writeFileSync(process.argv[2], render([award]));
