# ระบบจัดการเกียรติบัตรและผลงานนักเรียน (เวอร์ชัน GitHub Pages)

โปรเจกต์นี้เป็นเว็บแอปแบบ Static เอาไว้เก็บข้อมูลรางวัลและเกียรติบัตรของนักเรียน ออกแบบมาให้โยนขึ้นโฮสต์บน **GitHub Pages** ได้เลยง่ายๆ

## มีฟีเจอร์อะไรบ้าง?
- **Dashboard**: หน้าสรุปภาพรวม ดูสถิติ รางวัลล่าสุด และจัดอันดับคนเก่ง (Leaderboards)
- **Form Wizard**: แบบฟอร์มบันทึกรางวัลใหม่ ทำเป็นขั้นเป็นตอน (Step-by-step) ใช้งานง่าย
- **Subject Summary**: หน้าสรุปแยกตามกลุ่มสาระฯ กรองดูข้อมูลรางวัลตามหมวดหมู่ได้เลย
- **Pending Rewards**: เช็คลิสต์รางวัลที่ยังไม่ได้รับของ (หรือเกียรติบัตรยังไม่ออก)
- **Responsive Design**: รองรับทุกหน้าจอ ใช้ได้ทั้งบนคอม แท็บเล็ต และมือถือ
- **Dark Mode**: รองรับทั้งธีมสว่างและธีมมืด

## วิธีติดตั้งและใช้งาน

### 1. การนำขึ้น GitHub Pages
1. อัปโหลดไฟล์ทั้งหมด (`index.html`, `style.css`, `script.js`, `README.md`) ขึ้นไปที่ GitHub Repository ของคุณ
2. ไปที่แถบ **Settings** > เลือกเมนู **Pages** ด้านซ้ายมือ
3. ตรงหัวข้อ **Source** ให้เลือก Branch เป็น `main` (หรือ `master`)
4. กดปุ่ม **Save**
5. รอสักพัก เว็บของคุณจะออนไลน์อยู่ที่ลิงก์ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ-repo>/`

### 2. การตั้งค่า (Configuration)
เว็บนี้จะเชื่อมต่อกับระบบหลังบ้านที่เป็น Google Apps Script (GAS)
ถ้าต้องการเปลี่ยน URL ของ Backend ให้เข้าไปแก้ที่ไฟล์ `script.js` บรรทัดที่ 5 ครับ:

```javascript
const API_URL = "https://script.google.com/macros/s/AKfycbzGlRlOg6xE0P8z8EUH0lGOVRvM5GvcdtGGBqySEOxPslwhW2adcxPonazUYUjM30VG6Q/exec";
```

### 3. โครงสร้างไฟล์
- index.html: โครงสร้างหลักของหน้าเว็บ

- style.css: ไฟล์ตกแต่งหน้าตาและลูกเล่นต่างๆ

- script.js: โค้ดควบคุมการทำงาน เชื่อมต่อ API และจัดการหน้าจอ

### เทคโนโลยีที่ใช้
- HTML5 / CSS3 / JavaScript (ES6+)

- TailwindCSS (ดึงผ่าน CDN)

- Lucide Icons (ชุดไอคอน)

- SweetAlert2 (Pop-up แจ้งเตือน)

### เครดิต

พัฒนาสำหรับโรงเรียนปากเกร็ด
