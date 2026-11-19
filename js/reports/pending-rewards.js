import { getLevelWeight, getRankWeight, normalizeDate } from '../domain/awards.js';
import { groupPendingRewards } from '../domain/reward-groups.js';
import { showToast } from '../ui/modal.js';

export function buildPendingRewardsPrintHTML(items, printedAt = new Date()) {
    const { groups, sortedDepts } = groupPendingRewards(items);

    let rows = '';
    let num = 1;
    sortedDepts.forEach(dept => {
        rows += `<tr class="dept-row"><td colspan="7">${dept}</td></tr>`;
        groups[dept].sort((a, b) => {
            const wA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const wB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
            return wB - wA;
        });
        groups[dept].forEach(item => {
            const stdStr = (item.students || []).map(s => `${s.prefix || ''}${s.name} (${s.grade}/${s.room})`).join('<br>');
            const tchStr = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join('<br>');
            const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-';
            rows += `<tr>
                <td class="center">${num++}</td>
                <td>${item.competition || '-'}<br><small>${dateStr}</small></td>
                <td class="center">${item.rank || '-'}</td>
                <td class="center">${item.level || '-'}</td>
                <td>${item.organizer || '-'}</td>
                <td>${stdStr || '-'}</td>
                <td>${tchStr || '-'}</td>
            </tr>`;
        });
    });

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>รายงานสรุปเหรียญรางวัล</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Sarabun', 'Noto Sans Thai', Tahoma, sans-serif; font-size: 10px; color: #222; line-height: 1.4; }
h2 { text-align: center; font-size: 16px; margin-bottom: 2px; }
.subtitle { text-align: center; font-size: 10px; color: #888; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #aaa; padding: 4px 6px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
th { background: #e2e8f0; font-weight: bold; text-align: center; padding: 6px; }
td.center { text-align: center; }
small { color: #888; font-size: 9px; }
tr.dept-row td { background: #fde047; font-weight: bold; text-align: center; font-size: 11px; padding: 5px; }
tbody tr { page-break-inside: avoid; }
col.c1 { width: 3%; } col.c2 { width: 22%; } col.c3 { width: 10%; }
col.c4 { width: 10%; } col.c5 { width: 12%; } col.c6 { width: 25%; } col.c7 { width: 18%; }
.no-print { margin-top: 12px; text-align: center; }
.no-print button { padding: 8px 24px; font-size: 13px; cursor: pointer; border: none; border-radius: 6px; font-weight: bold; }
.btn-print { background: #2563eb; color: #fff; }
@media print { .no-print { display: none; } }
</style>
</head><body>
<h2>รายงานสรุปรางวัลที่รอรับ</h2>
<p class="subtitle">จำนวน ${items.length} รายการ &bull; พิมพ์เมื่อ ${printedAt.toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
<table>
<colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"><col class="c7"></colgroup>
<thead><tr><th>#</th><th>รายการแข่งขัน</th><th>รางวัล</th><th>ระดับ</th><th>หน่วยงาน</th><th>นักเรียน</th><th>ครูที่ปรึกษา</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="no-print">
<button class="btn-print">🖨️ บันทึก PDF / พิมพ์</button>
<p style="margin-top:8px;font-size:11px;color:#888;">เลือก "Save as PDF" ในหน้าต่าง Print เพื่อบันทึกเป็น PDF</p>
</div>
</body></html>`;
}

export function savePendingRewardsPDF(items) {
    if (!items || items.length === 0) {
        return showToast('ไม่มีข้อมูลสำหรับสร้าง PDF', 'warning');
    }

    const fullHTML = buildPendingRewardsPrintHTML(items);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(fullHTML);
        printWindow.document.close();
        printWindow.document.querySelector('.btn-print').addEventListener('click', () => printWindow.print());
        showToast('เปิดหน้ารายงานแล้ว — กด "บันทึก PDF / พิมพ์" แล้วเลือก Save as PDF', 'success');
    } else {
        showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้ารายงาน', 'warning');
    }
}

export function savePendingRewardsExcel(items) {
    if (!items || items.length === 0) {
        return showToast('ไม่มีข้อมูลสำหรับสร้าง Excel', 'warning');
    }
    if (typeof XLSX === 'undefined') {
        return showToast('ไม่พบ SheetJS library', 'error');
    }

    showToast('กำลังสร้างไฟล์ Excel...', 'info');

    const { groups, sortedDepts } = groupPendingRewards(items);

    // Build rows array for the worksheet
    const wsData = [];
    // Title rows
    wsData.push(['รายงานสรุปรางวัลที่รอรับ']);
    wsData.push([`จำนวน ${items.length} รายการ — ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}`]);
    wsData.push([]); // blank row
    // Header
    wsData.push(['#', 'รายการแข่งขัน', 'วันที่', 'รางวัล', 'ระดับ', 'หน่วยงาน', 'นักเรียน', 'ชั้น/ห้อง', 'ครูที่ปรึกษา']);

    let num = 1;
    sortedDepts.forEach(dept => {
        // Department header row
        wsData.push([dept, '', '', '', '', '', '', '', '']);

        groups[dept].sort((a, b) => {
            const wA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const wB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
            return wB - wA;
        });

        groups[dept].forEach(item => {
            const stdNames = (item.students || []).map(s => `${s.prefix || ''}${s.name}`).join('\n');
            const stdGrades = (item.students || []).map(s => `ม.${s.grade}/${s.room}`).join('\n');
            const tchNames = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join('\n');
            const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-';

            wsData.push([
                num++,
                item.competition || '-',
                dateStr,
                item.rank || '-',
                item.level || '-',
                item.organizer || '-',
                stdNames || '-',
                stdGrades || '-',
                tchNames || '-'
            ]);
        });
    });

    // Create workbook & worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 4 },   // #
        { wch: 35 },  // รายการแข่งขัน
        { wch: 14 },  // วันที่
        { wch: 14 },  // รางวัล
        { wch: 14 },  // ระดับ
        { wch: 18 },  // หน่วยงาน
        { wch: 25 },  // นักเรียน
        { wch: 10 },  // ชั้น/ห้อง
        { wch: 22 },  // ครูที่ปรึกษา
    ];

    // Merge title row across all columns
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];

    // Merge department header rows
    let rowIdx = 4; // start after title(0), subtitle(1), blank(2), header(3)
    sortedDepts.forEach(dept => {
        ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 8 } });
        rowIdx += 1 + groups[dept].length;
    });

    XLSX.utils.book_append_sheet(wb, ws, 'รางวัลรอรับ');
    XLSX.writeFile(wb, 'รายงานสรุปเหรียญรางวัล.xlsx');
    showToast('ดาวน์โหลด Excel สำเร็จ', 'success');
}
