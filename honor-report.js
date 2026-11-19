function buildHonorReport(groups, sortedDepts, score, formatDate) {
    function escape(value) {
        return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }
    function awardRows(item) {
        const people = [
            ...(item.students || []),
            ...(item.teachers || []).map(t => ({ ...t, role: 'ครูที่ปรึกษา' }))
        ];
        if (!people.length) people.push({});
        let html = '';
        // Bound each merged cell so large teams can continue on the next sheet.
        for (let i = 0; i < people.length; i += 4) {
            const part = people.slice(i, i + 4);
            const summary = [escape(item.rank || '-'), escape(item.competition || '-') +
                (item.awardDate ? '<small>' + escape(formatDate(item.awardDate)) + '</small>' : '') +
                (i ? '<small>(ต่อ)</small>' : ''), escape(item.level || '-'), escape(item.organizer || '-')];
            html += '<tbody>' + part.map((p, n) => '<tr>' +
                (n === 0 ? summary.map(v => '<td rowspan="' + part.length + '">' + v + '</td>').join('') : '') +
                '<td>' + escape(p.prefix) + '</td><td>' + escape(p.name || '-') +
                (p.role ? '<small>' + escape(p.role) + '</small>' : '') + '</td><td>' +
                escape(p.grade) + '</td><td>' + escape(p.room) + '</td></tr>').join('') + '</tbody>';
        }
        return html;
    }
    const tables = sortedDepts.map(dept => {
        const items = [...groups[dept]].sort((a,b) => score(b) - score(a));
        return '<table><colgroup>' + [11,27,7,17,7,20,6,5].map(w => '<col style="width:' + w + '%">').join('') +
            '</colgroup><thead><tr><th colspan="8" class="group">' + escape(dept) + '</th></tr><tr>' +
            ['รางวัล','รายการแข่งขัน','ระดับ','หน่วยงาน','คำนำหน้า','ชื่อ–สกุล','ชั้น','ห้อง'].map(h => '<th>' + h + '</th>').join('') +
            '</tr></thead>' + items.map(awardRows).join('') + '</table>';
    }).join('');
    return `<!doctype html><html lang="th"><meta charset="utf-8"><title>รางวัลเชิดชูเกียรติ</title>
<style>
@page { size:A4 landscape; margin:12mm; }
* { box-sizing:border-box; }
body { margin:0 auto; max-width:273mm; font:10pt/1.4 Tahoma,sans-serif; color:#151515; }
h1 { text-align:center; font-size:15pt; margin:0 0 3mm; }
table { width:100%; table-layout:fixed; border-collapse:collapse; margin-bottom:3mm; }
th,td { padding:1mm; border:0.25mm solid #333; text-align:center; vertical-align:middle; overflow-wrap:anywhere; }
.group { background:#ff0; font-size:11pt; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
thead { display:table-header-group; }
tbody,tr { break-inside:avoid; }
small { display:block; font-size:8pt; }
button { margin:4mm 0; padding:2mm 5mm; }
@media print { button { display:none; } }
</style><body><button onclick="window.print()">บันทึก PDF / พิมพ์</button><h1>รางวัลเชิดชูเกียรติที่รอรับ</h1>${tables}</body></html>`;
}
if (typeof module !== 'undefined' && module.exports) module.exports = buildHonorReport;
