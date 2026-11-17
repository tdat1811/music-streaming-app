// Kiểm thử đơn vị: form đăng ký nghệ sĩ ở app (sheet UT23) và hiển thị thời gian (sheet UT24)
import {
  ARTIST_LIMITS,
  ArtistRequestForm,
  cleanSocialLinks,
  initials,
  toggleGenre,
  validateArtistProfile,
  validateRejectForm,
} from '../artistRequest';
import { formatDateTime, timeAgo, timeAgoText } from '../time';

const HOP_LE: ArtistRequestForm = {
  stageName: 'Lan Ng.',
  genres: ['Pop', 'Ballad'],
  bio: 'Singer-songwriter from Hà Nội. Writing honest songs.',
  socialLinks: ['instagram.com/lanng.music', ''],
  avatarImage: '',
};
const loi = (thayDoi: Partial<ArtistRequestForm>) => Object.keys(validateArtistProfile({ ...HOP_LE, ...thayDoi }));

describe('UT23 – validateArtistProfile / toggleGenre / validateRejectForm', () => {
  it('UTCID01: form hợp lệ (ô link trống được bỏ qua) → không lỗi', () => {
    expect(loi({})).toEqual([]);
  });

  it.each([
    ['UTCID02', { stageName: '   ' }, ['stageName']],
    ['UTCID03', { stageName: 'x'.repeat(51) }, ['stageName']],
    ['UTCID04', { stageName: '***' }, ['stageName']],
    ['UTCID05', { genres: [] }, ['genres']],
    ['UTCID06', { bio: 'Ngắn quá' }, ['bio']],
    ['UTCID07', { socialLinks: ['not a link'] }, ['socialLinks']],
    ['UTCID08', { socialLinks: ['a.com', 'b.com', 'c.com', 'd.com'] }, ['socialLinks']],
    ['UTCID09', { stageName: '', genres: [], bio: '' }, ['stageName', 'genres', 'bio']],
  ])('%s: %j → lỗi %j', (_ma, thayDoi, mongDoi) => {
    expect(loi(thayDoi as Partial<ArtistRequestForm>)).toEqual(mongDoi);
  });

  it('UTCID10: biên – nghệ danh 2 và 50 ký tự, bio đúng 20 ký tự đều hợp lệ', () => {
    expect(loi({ stageName: 'Lo' })).toEqual([]);
    expect(loi({ stageName: 'x'.repeat(ARTIST_LIMITS.stageNameMax) })).toEqual([]);
    expect(loi({ bio: 'x'.repeat(ARTIST_LIMITS.bioMin) })).toEqual([]);
  });

  it('UTCID11: toggleGenre – bật, tắt, không quá 3 thể loại', () => {
    expect(toggleGenre(['Pop'], 'Rap')).toEqual(['Pop', 'Rap']);
    expect(toggleGenre(['Pop', 'Rap'], 'Pop')).toEqual(['Rap']);
    expect(toggleGenre(['Pop', 'Rap', 'EDM'], 'Indie')).toEqual(['Pop', 'Rap', 'EDM']);
  });

  it('UTCID12: cleanSocialLinks bỏ rỗng, trùng, khoảng trắng', () => {
    expect(cleanSocialLinks([' a.com/x ', '', 'a.com/x', 'b.com'])).toEqual(['a.com/x', 'b.com']);
  });

  it.each([
    ['UTCID13', null, '', 'Please choose a reason.'],
    ['UTCID14', 'incomplete_info', '', null],
    ['UTCID15', 'other', '  ', 'Please add a note when choosing "Other".'],
    ['UTCID16', 'other', 'Ảnh không phù hợp', null],
    ['UTCID17', 'khong-co', '', 'Please choose a reason.'],
  ])('%s: validateRejectForm(%p, %p) = %p', (_ma, reason, note, mongDoi) => {
    expect(validateRejectForm(reason, note)).toBe(mongDoi);
  });

  it.each([
    ['UTCID18', 'Lan Ng.', 'LN'],
    ['UTCID19', '  sơn  tùng m-tp ', 'ST'],
    ['UTCID20', '', '?'],
  ])('%s: initials(%p) = %p', (_ma, ten, mongDoi) => {
    expect(initials(ten)).toBe(mongDoi);
  });
});

describe('UT24 – timeAgo / formatDateTime', () => {
  const NOW = new Date(2026, 10, 16, 12, 0, 0).getTime();
  const truoc = (giay: number) => new Date(NOW - giay * 1000).toISOString();

  it.each([
    ['UTCID01', truoc(30), 'Just now'],
    ['UTCID02', truoc(5 * 60), '5m'],
    ['UTCID03', truoc(3 * 3600), '3h'],
    ['UTCID04', truoc(2 * 86400), '2d'],
    ['UTCID05', null, ''],
    ['UTCID06', 'không phải ngày', 'Just now'],
  ])('%s: timeAgo(%p) = %p', (_ma, iso, mongDoi) => {
    expect(timeAgo(iso, NOW)).toBe(mongDoi);
  });

  it('UTCID07: formatDateTime hiển thị dd/mm/yyyy · hh:mm, ngày sai → rỗng', () => {
    expect(formatDateTime(new Date(2026, 10, 16, 10, 24).toISOString())).toBe('16/11/2026 · 10:24');
    expect(formatDateTime('abc')).toBe('');
  });
});

describe('UT24 (bổ sung) – timeAgoText', () => {
  const NOW = new Date(2026, 10, 16, 12, 0, 0).getTime();
  it.each([
    ['UTCID08', new Date(NOW - 20 * 1000).toISOString(), 'just now'],
    ['UTCID09', new Date(NOW - 5 * 60 * 1000).toISOString(), '5m ago'],
    ['UTCID10', null, ''],
  ])('%s: timeAgoText(%p) = %p', (_ma, iso, mongDoi) => {
    expect(timeAgoText(iso, NOW)).toBe(mongDoi);
  });
});
