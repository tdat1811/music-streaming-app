// Kiểm thử đơn vị: kiểm tra form đăng ký nghệ sĩ và lý do từ chối (sheet UT21, UT22)
const { validateArtistRequest, validateRejection, stageNameKey } = require('../../src/utils/artistRequestValidation');

// Form hợp lệ, mỗi test chỉ đổi 1 trường
const HOP_LE = {
  stageName: 'Lan Ng.',
  genres: ['Pop', 'Ballad'],
  bio: 'Singer-songwriter from Hà Nội. Writing honest songs.',
  socialLinks: ['instagram.com/lanng.music'],
  avatarImage: '',
  agree: true,
};
const loi = (thayDoi) => validateArtistRequest({ ...HOP_LE, ...thayDoi }).errors;

describe('UT21 – validateArtistRequest(body)', () => {
  it('UTCID01: form hợp lệ → không có lỗi, dữ liệu được làm sạch', () => {
    const { errors, value } = validateArtistRequest({ ...HOP_LE, stageName: '  Lan   Ng.  ', socialLinks: [' instagram.com/lanng.music ', ''] });
    expect(errors).toEqual({});
    expect(value.stageName).toBe('Lan Ng.');
    expect(value.socialLinks).toEqual(['instagram.com/lanng.music']);
  });

  it.each([
    ['UTCID02', { stageName: '' }, 'stageName'],
    ['UTCID03', { stageName: 'L' }, 'stageName'],                    // 1 ký tự
    ['UTCID04', { stageName: 'x'.repeat(51) }, 'stageName'],         // 51 ký tự
    ['UTCID05', { stageName: '!!!' }, 'stageName'],                  // không có chữ / số
    ['UTCID06', { genres: [] }, 'genres'],
    ['UTCID07', { genres: ['Pop', 'Rap', 'EDM', 'Indie'] }, 'genres'], // quá 3
    ['UTCID08', { genres: ['Opera'] }, 'genres'],                    // không có trong danh sách
    ['UTCID09', { bio: 'Quá ngắn' }, 'bio'],                         // < 20 ký tự
    ['UTCID10', { bio: 'x'.repeat(501) }, 'bio'],
    ['UTCID11', { socialLinks: ['a.com/1', 'b.com/2', 'c.com/3', 'd.com/4'] }, 'socialLinks'],
    ['UTCID12', { socialLinks: ['javascript:alert(1)'] }, 'socialLinks'],
    ['UTCID13', { avatarImage: '../../etc/passwd' }, 'avatarImage'],
    ['UTCID14', { agree: false }, 'agree'],
    ['UTCID15', { agree: 'true' }, 'agree'],                         // phải đúng kiểu boolean
  ])('%s: %j → lỗi ở %s', (_ma, thayDoi, truong) => {
    expect(Object.keys(loi(thayDoi))).toEqual([truong]);
  });

  it.each([
    ['UTCID16', { stageName: 'Lo' }],                                // đúng 2 ký tự
    ['UTCID17', { stageName: 'x'.repeat(50) }],                      // đúng 50 ký tự
    ['UTCID18', { genres: ['Pop'] }],                                // 1 thể loại
    ['UTCID19', { bio: 'x'.repeat(20) }],                            // đúng 20 ký tự
    ['UTCID20', { socialLinks: [] }],                                // không có link (không bắt buộc)
    ['UTCID21', { avatarImage: '/avatars/av_abc123.jpg' }],
    ['UTCID22', { socialLinks: ['https://www.youtube.com/@lanng'] }],
  ])('%s: %j → hợp lệ', (_ma, thayDoi) => {
    expect(loi(thayDoi)).toEqual({});
  });

  it('UTCID23: trùng thể loại được gộp lại', () => {
    expect(validateArtistRequest({ ...HOP_LE, genres: ['Pop', 'Pop'] }).value.genres).toEqual(['Pop']);
  });

  it('UTCID24: stageNameKey bỏ dấu, hoa thường, khoảng trắng thừa', () => {
    expect(stageNameKey('  SƠN   Tùng ')).toBe(stageNameKey('son tung'));
  });
});

describe('UT22 – validateRejection(body)', () => {
  it.each([
    ['UTCID01', { reason: 'incomplete_info', note: '' }, []],
    ['UTCID02', { reason: 'other', note: 'Ảnh không phải của bạn' }, []],
    ['UTCID03', { reason: 'other', note: '   ' }, ['note']],          // "Other" bắt buộc ghi chú
    ['UTCID04', { reason: '' }, ['reason']],
    ['UTCID05', { reason: 'toString' }, ['reason']],                  // không nhận thuộc tính kế thừa
    ['UTCID06', { reason: 'incomplete_info', note: 'x'.repeat(501) }, ['note']],
  ])('%s: %j → lỗi %j', (_ma, body, truong) => {
    expect(Object.keys(validateRejection(body).errors)).toEqual(truong);
  });
});
