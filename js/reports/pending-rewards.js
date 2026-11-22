import { getLevelWeight, getRankWeight, normalizeDate } from '../domain/awards.js';
import { groupPendingRewards } from '../domain/reward-groups.js';
import { showToast } from '../ui/modal.js';
import { buildHonorReport } from './honor-report.js';

export function buildPendingRewardsPrintHTML(items) {
    const { groups, sortedDepts } = groupPendingRewards(items);
    return buildHonorReport(
        groups,
        sortedDepts,
        item => getLevelWeight(item.level) * 100 + getRankWeight(item.rank),
        date => normalizeDate(date).toLocaleDateString('th-TH', { dateStyle: 'medium' })
    );
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
