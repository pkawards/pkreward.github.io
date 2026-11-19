import { toArray } from './awards.js';

const DEPARTMENT_ORDER = [
    "กลุ่มสาระการเรียนรู้ภาษาไทย",
    "ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์",
    "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
    "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม",
    "กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา",
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
    "กลุ่มสาระการเรียนรู้ศิลปะ",
    "กลุ่มสาระการเรียนรู้การงานอาชีพ",
    "งานแนะแนว",
    "งานเทคโนโลยี",
    "กิจกรรมพัฒนาผู้เรียน (ลูกเสือ)",
    "งานสภานักเรียน",
    "งานห้องสมุด",
    "งานห้องเรียนพิเศษ",
    "งาน to be number one",
    "อื่นๆ"
];

export function groupPendingRewards(items) {
    const groups = {};
    items.forEach(item => {
        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);
        let dept = '';
        if (deptGroups.length > 0) dept = deptGroups.join(', ');
        else if (workGroups.length > 0) dept = workGroups.join(', ');
        else dept = 'อื่นๆ';
        if (dept === 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี' || dept === 'งานห้องเรียนพิเศษ SMTE') {
            dept = 'ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์';
        }
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(item);
    });

    const sortedDepts = Object.keys(groups).sort((a, b) => {
        let iA = DEPARTMENT_ORDER.indexOf(a), iB = DEPARTMENT_ORDER.indexOf(b);
        if (iA === -1) iA = 999; if (iB === -1) iB = 999;
        return iA - iB;
    });
    return { groups, sortedDepts };
}
