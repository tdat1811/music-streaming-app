// Kiểm thử đơn vị: hiển thị kiểm duyệt ở app – giai đoạn 5 (sheet UT37)
import { isArtistHidden, isSongUnavailable, resetSongRegistry, setModerationHidden } from '../../data/songRegistry';
import { actionSubtitle, actionTitle, actionUi, MAX_VIOLATIONS, removalNoticeLines, REPORT_REASONS, ruleLabel, targetLabel } from '../moderation';

describe('UT37 – nhãn', () => {
  it('UTCID01: ruleLabel / targetLabel, giá trị lạ có nhãn mặc định', () => {
    expect([ruleLabel('spam'), ruleLabel('scam'), ruleLabel('xyz'), ruleLabel(null)]).toEqual(['Spam or misleading', 'Scam or fraud', 'Other', 'Other']);
    expect([targetLabel('song'), targetLabel('comment'), targetLabel('album')]).toEqual(['Song', 'Comment', 'Content']);
  });

  it('UTCID02: người nghe không có lý do "scam", tối đa 3 vi phạm', () => {
    expect(REPORT_REASONS).not.toContain('scam');
    expect(MAX_VIOLATIONS).toBe(3);
  });
});

describe('UT37 – nhật ký thao tác', () => {
  it.each([
    ['UTCID03', { action: 'remove_content', adminName: 'Admin Team', ruleLabel: 'Spam or misleading' }, 'Removed', 'by Admin Team · Spam or misleading'],
    ['UTCID04', { action: 'auto_lock', note: '4 violations', ruleLabel: 'Spam or misleading' }, 'Locked', 'Automatically · 4 violations'],
    ['UTCID05', { action: 'change_role', adminName: 'Admin Team', note: 'listener → admin' }, 'Role', 'by Admin Team · listener → admin'],
    ['UTCID06', { action: 'unlock', adminName: 'Admin Team' }, 'Unlocked', 'by Admin Team'],
  ])('%s: %j → %s / %s', (_ma, a, nhan, phu) => {
    expect(actionUi(a.action).label).toBe(nhan);
    expect(actionSubtitle(a)).toBe(phu);
  });

  it('UTCID07: actionTitle theo loại đối tượng', () => {
    expect(actionTitle({ targetType: 'comment', targetLabel: 'Buy followers' })).toBe('Comment "Buy followers"');
    expect(actionTitle({ targetType: 'user', targetLabel: 'Jason Smith' })).toBe('Jason Smith');
  });
});

describe('UT37 – thông báo vi phạm cho chủ nội dung', () => {
  it.each([
    ['UTCID08', 1, 'Violation 1 of 3.', false],
    ['UTCID09', 3, 'Violation 3 of 3. One more and your account will be locked permanently.', true],
    ['UTCID10', 4, 'Your account has been locked permanently.', true],
  ])('%s: lần %d → "%s"', (_ma, count, canhBao, nghiemTrong) => {
    const l = removalNoticeLines({ targetType: 'comment', rule: 'spam', violationCount: count });
    expect(l.title).toBe('Your comment was removed');
    expect(l.body).toBe('because it violates our community standards (Spam or misleading).');
    expect(l.warning).toBe(canhBao);
    expect(l.severe).toBe(nghiemTrong);
  });

  it('UTCID11: bài hát / bài đăng', () => {
    expect(removalNoticeLines({ targetType: 'song', rule: 'copyright', violationCount: 1 }).title).toBe('Your song was removed');
    expect(removalNoticeLines({ targetType: 'post', violationCount: 2 }).title).toBe('Your post was removed');
  });
});

describe('UT37 – nội dung bị ẩn theo máy chủ (lọc cả dữ liệu có sẵn trong app)', () => {
  afterEach(resetSongRegistry);

  it('UTCID12: trang nghệ sĩ bị ẩn – nhận theo id hoặc theo tên (không phân biệt hoa thường)', () => {
    setModerationHidden({ artists: [{ id: 'art10', name: 'Mer Watson' }], songIds: [] });
    expect(isArtistHidden({ id: 'art10', name: 'X' })).toBe(true);
    expect(isArtistHidden({ name: 'mer watson ' })).toBe(true);
    expect(isArtistHidden({ id: 'art1', name: 'The Weeknd' })).toBe(false);
    expect(isArtistHidden(null)).toBe(false);
  });

  it('UTCID13: bài hát bị ẩn không còn lấy được; tải lại danh sách mới thì hiện lại', () => {
    setModerationHidden({ artists: [], songIds: ['s42'] });
    expect(isSongUnavailable('s42')).toBe(true);
    setModerationHidden({ artists: [], songIds: [] });
    expect(isSongUnavailable('s42')).toBe(false);
  });
});
