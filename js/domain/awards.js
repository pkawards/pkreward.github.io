export function normalizeDate(dateString) {
    if (!dateString) return null;

    // If already ISO (from API sometimes), just parsed
    let date = new Date(dateString);
    if (!isNaN(date)) {
        // Check if Year > 2400 (BE)
        if (date.getFullYear() > 2400) {
            date.setFullYear(date.getFullYear() - 543);
        }
        return date;
    }

    return null;
}

export function getRankWeight(rank) {
    if (!rank) return 0;
    // P1: Gold Tier
    if ((rank.includes("ชนะเลิศ") && !rank.includes("รอง")) || rank.includes("เหรียญทอง")) return 5;
    // P2: Silver Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 1") || rank.includes("รองชนะเลิศอันดับ 1") || rank.includes("เหรียญเงิน")) return 4;
    // P3: Bronze Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 2") || rank.includes("รองชนะเลิศอันดับ 2") || rank.includes("เหรียญทองแดง")) return 3;
    // P4: Honorable Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 3") || rank.includes("รองชนะเลิศอันดับ 3") || rank.includes("ชมเชย")) return 2;
    // P5: Entry Tier
    if (rank.includes("เข้าร่วม")) return 1;
    return 0;
}

export function getLevelWeight(level) {
    if (!level) return 0;
    if (level.includes("นานาชาติ")) return 7;
    if (level.includes("ประเทศ") || level.includes("ชาติ")) return 6;
    if (level.includes("ภาค")) return 5;
    if (level.includes("จังหวัด")) return 4;
    if (level.includes("เขต")) return 3;
    if (level.includes("อำเภอ")) return 2;
    return 1; // โรงเรียน
}

export function toArray(val) {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    return String(val).split(', ').filter(Boolean);
}

export function normalizeLevel(levelRaw) {
    if (!levelRaw) return 'school';
    const s = String(levelRaw).toLowerCase();

    if (s.includes('inter') || s.includes('นานาชาติ')) return 'international';
    if (s.includes('nation') || s.includes('ประเทศ') || s.includes('ชาติ')) return 'nation';
    if (s.includes('region') || s.includes('ภาค')) return 'region';
    if (s.includes('province') || s.includes('จังหวัด')) return 'province';
    if (s.includes('area') || s.includes('เขต')) return 'area';
    if (s.includes('district') || s.includes('อำเภอ')) return 'district';

    return 'school';
}

export function getPersonRoleType(person = {}) {
    return person.roleType || person.personType || person.type || (person.isAdministrator ? 'administrator' : 'teacher');
}

export function getPersonRoleLabel(roleType) {
    return roleType === 'administrator' ? 'ผู้บริหาร' : 'ครู';
}

export function getPersonRoleSummary(person = {}) {
    const roleType = getPersonRoleType(person);
    const departmentText = roleType === 'teacher' ? (person.department || '') : '';
    return `${getPersonRoleLabel(roleType)}${departmentText ? ` · ${departmentText}` : ''}`;
}

export function formatTimestamp(ts) {
    if (!ts) return '-';
    // TS format from Google: Usually ISO string
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}
