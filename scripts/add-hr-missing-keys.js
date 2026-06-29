const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');

const additions = {
  'zh-CN': {
    personUnit: '人',
    qrCode: '二维码',
    deletePhoto: '删除照片',
    email: '邮箱',
    role: '角色',
    birthDate: '出生日期',
    idCard: '身份证号',
    homeAddress: '家庭住址',
    currentAddress: '现住址',
  },
  'en': {
    personUnit: 'person(s)',
    qrCode: 'QR Code',
    deletePhoto: 'Delete Photo',
    email: 'Email',
    role: 'Role',
    birthDate: 'Birth Date',
    idCard: 'ID Card',
    homeAddress: 'Home Address',
    currentAddress: 'Current Address',
  },
  'zh-TW': {
    personUnit: '人',
    qrCode: 'QR碼',
    deletePhoto: '刪除照片',
    email: '電子郵件',
    role: '角色',
    birthDate: '出生日期',
    idCard: '身分證號',
    homeAddress: '家庭住址',
    currentAddress: '現住址',
  },
  'vi': {
    personUnit: 'người',
    qrCode: 'Mã QR',
    deletePhoto: 'Xóa ảnh',
    email: 'Email',
    role: 'Vai trò',
    birthDate: 'Ngày sinh',
    idCard: 'CCCD',
    homeAddress: 'Địa chỉ nhà',
    currentAddress: 'Địa chỉ hiện tại',
  },
};

Object.entries(additions).forEach(([lang, newKeys]) => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let added = 0;
  Object.entries(newKeys).forEach(([key, value]) => {
    if (!messages.Hr[key]) {
      messages.Hr[key] = value;
      added++;
    }
  });
  
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
  console.log(`✅ ${lang}: added ${added} new keys, total Hr keys: ${Object.keys(messages.Hr).length}`);
});