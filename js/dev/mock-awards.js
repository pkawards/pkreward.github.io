import { awardData } from '../core/state.js';
import { showToast } from '../ui/modal.js';

export function injectMockData(processAndRender, renderPendingRewards, count = 100) {
    const competitions = [
        'การแข่งขันคณิตศาสตร์โอลิมปิก', 'การประกวดโครงงานวิทยาศาสตร์', 'การแข่งขันตอบปัญหาฟิสิกส์',
        'การประกวดสิ่งประดิษฐ์ทางวิทยาศาสตร์', 'การแข่งขันหุ่นยนต์อัตโนมัติ', 'การแข่งขันเขียนโปรแกรมคอมพิวเตอร์',
        'การประกวดวาดภาพ', 'การแข่งขันกีฬาว่ายน้ำ', 'การประกวดร้องเพลงไทยลูกทุ่ง', 'การแข่งขันทักษะภาษาอังกฤษ',
        'การแข่งขันเศรษฐศาสตร์เพชรยอดมงกุฎ', 'การประกวดโครงงานคุณธรรม', 'การแข่งขันตอบปัญหาสังคมศึกษา',
        'การแข่งขันอัจฉริยภาพทางวิทยาศาสตร์', 'การแข่งขัน A-Math', 'การแข่งขันวิทยาศาสตร์โลกและอวกาศ',
        'การประกวดสุนทรพจน์ภาษาไทย', 'การแข่งขันกรีฑา', 'การแข่งขันแบดมินตัน', 'การประกวดดนตรีสากล'
    ];
    const ranks = ['ชนะเลิศ', 'รองชนะเลิศอันดับที่ 1', 'รองชนะเลิศอันดับที่ 2', 'เหรียญทอง', 'เหรียญเงิน', 'เหรียญทองแดง', 'ชมเชย', 'เข้าร่วม'];
    const levels = ['ระดับนานาชาติ', 'ระดับชาติ', 'ระดับภาค', 'ระดับจังหวัด', 'ระดับเขตพื้นที่ฯ', 'ระดับอำเภอ', 'ระดับโรงเรียน'];
    const depts = ['กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'กลุ่มสาระการเรียนรู้ภาษาไทย',
        'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', 'กลุ่มสาระการเรียนรู้สังคมศึกษาฯ', 'กลุ่มสาระการเรียนรู้ศิลปะ',
        'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', 'งานห้องเรียนพิเศษ SMTE'];
    const orgs = ['สพฐ.', 'สสวท.', 'มหาวิทยาลัยเกษตรศาสตร์', 'สมาคมคณิตศาสตร์แห่งประเทศไทย', 'กระทรวงศึกษาธิการ',
        'สำนักงานเขตพื้นที่การศึกษา', 'จุฬาลงกรณ์มหาวิทยาลัย', 'มหาวิทยาลัยขอนแก่น'];
    const firstNames = ['สมชาย', 'สมหญิง', 'ปิยะ', 'วิภา', 'กิตติ', 'นภัสสร', 'ธนกร', 'พิมพ์ลภัส', 'ศุภวิชญ์', 'กัญญาณัฐ',
        'ภูมิพัฒน์', 'ณัฐณิชา', 'พีรพัฒน์', 'ชนิดาภา', 'รัชชานนท์', 'ปภาวรินทร์'];
    const lastNames = ['สุขใจ', 'ดีงาม', 'มั่นคง', 'รุ่งเรือง', 'พัฒนา', 'สว่างวงศ์', 'เจริญสุข', 'ศรีสมบัติ'];
    const prefixes = ['นาย', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
    const tPrefixes = ['นาย', 'นาง', 'นางสาว'];
    const tFirstNames = ['สุภาพร', 'วิชัย', 'ประภาส', 'สมศรี', 'ธนวัฒน์', 'อรุณี', 'มานะ', 'จิราภรณ์'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const newItems = [];
    for (let i = 0; i < count; i++) {
        const numStudents = randInt(1, 4);
        const students = [];
        for (let s = 0; s < numStudents; s++) {
            students.push({ prefix: pick(prefixes), name: pick(firstNames) + ' ' + pick(lastNames), grade: String(randInt(1, 6)), room: String(randInt(1, 12)) });
        }
        const numTeachers = randInt(1, 2);
        const teachers = [];
        for (let t = 0; t < numTeachers; t++) {
            teachers.push({ prefix: pick(tPrefixes), name: pick(tFirstNames) + ' ' + pick(lastNames), department: pick(depts) });
        }

        const month = randInt(1, 12);
        const year = pick([2025, 2025, 2026, 2026, 2026]);
        const day = randInt(1, 28);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const isReceived = Math.random() < 0.3; // 30% already received

        newItems.push({
            id: 'mock_' + Date.now() + '_' + i,
            competition: pick(competitions) + ' ครั้งที่ ' + randInt(1, 30),
            rank: pick(ranks),
            level: pick(levels),
            awardDate: dateStr,
            organizer: pick(orgs),
            onBehalfOf: [pick(depts)],
            department: [],
            students: students,
            teachers: teachers,
            isGetReward: isReceived,
            timestamp: new Date(year, month - 1, day).toISOString(),
            notes: ''
        });
    }

    awardData.groupedData.push(...newItems);
    processAndRender();
    renderPendingRewards();
    console.log(`✅ Injected ${count} mock items (${newItems.filter(x => x.isGetReward).length} received, ${newItems.filter(x => !x.isGetReward).length} pending)`);
    showToast(`เพิ่ม ${count} รายการทดสอบเรียบร้อย`, 'success');
}
