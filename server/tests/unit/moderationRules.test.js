// Kiểm thử đơn vị: luật kiểm duyệt – giai đoạn 5 (sheet UT36)
const {
  validateRuleInput,
  validateReportInput,
  reachesPermanentLock,
  nextRemovalLocks,
  unlockAfterRevoke,
  roleChangeError,
  lockError,
  unlockError,
} = require('../../src/utils/moderationRules');
const { MAX_VIOLATIONS, LOCK_AT, RULES, ruleLabel } = require('../../src/config/moderation');

describe('UT36 – ngưỡng khoá vĩnh viễn', () => {
  it('UTCID01: cho phép 3 lần, lần thứ 4 khoá', () => {
    expect([MAX_VIOLATIONS, LOCK_AT]).toEqual([3, 4]);
    expect([0, 1, 2, 3, 4, 5].map(reachesPermanentLock)).toEqual([false, false, false, false, true, true]);
  });

  it.each([
    ['UTCID02', 2, null, false],
    ['UTCID03', 3, null, true],          // đang 3/3 → lần gỡ tới sẽ khoá
    ['UTCID04', 3, 'manual', true],      // đang khoá tay vẫn nâng lên khoá vĩnh viễn
    ['UTCID05', 4, 'permanent', false],  // đã khoá vĩnh viễn rồi
  ])('%s: nextRemovalLocks(%d, %s) → %s', (_ma, n, lockType, ra) => {
    expect(nextRemovalLocks(n, lockType)).toBe(ra);
  });

  it.each([
    ['UTCID06', 3, 'permanent', true],   // revoke còn 3 → mở lại
    ['UTCID07', 4, 'permanent', false],  // còn 4 → vẫn khoá
    ['UTCID08', 1, 'manual', false],     // khoá tay không tự mở
    ['UTCID09', 2, null, false],
  ])('%s: unlockAfterRevoke(%d, %s) → %s', (_ma, n, lockType, ra) => {
    expect(unlockAfterRevoke(n, lockType)).toBe(ra);
  });
});

describe('UT36 – đổi vai trò', () => {
  const admin = { id: 'u_admin', role: 'admin' };
  const listener = { id: 'u_jason', role: 'listener' };
  it.each([
    ['UTCID10', listener, 'admin', 2, null],
    ['UTCID11', { id: 'u_admin2', role: 'admin' }, 'listener', 2, null],
    ['UTCID12', admin, 'listener', 2, "You can't change your own role."],
    ['UTCID13', { id: 'u_mer', role: 'artist' }, 'admin', 2, "Artist accounts can't change role."],
    ['UTCID14', listener, 'artist', 2, 'Role can only be Listener or Admin. Artists are added by approving a request.'],
    ['UTCID15', listener, 'listener', 2, 'This account is already a listener.'],
    ['UTCID16', { ...listener, lockedAt: new Date() }, 'admin', 2, "Locked accounts can't become admins."],
    ['UTCID17', { id: 'u_admin2', role: 'admin' }, 'listener', 1, "You can't remove the last admin."],
  ])('%s: %j → %s', (_ma, target, newRole, adminCount, ra) => {
    expect(roleChangeError({ actorId: 'u_admin', target, newRole, adminCount })).toBe(ra);
  });
});

describe('UT36 – khoá / mở khoá tay', () => {
  it.each([
    ['UTCID18', { id: 'u_jason', role: 'listener' }, null],
    ['UTCID19', { id: 'u_admin', role: 'admin' }, "You can't lock your own account."],
    ['UTCID20', { id: 'u_admin2', role: 'admin' }, 'Change this admin to Listener before locking the account.'],
    ['UTCID21', { id: 'u_x', role: 'listener', lockedAt: new Date(), lockType: 'permanent' }, 'This account is already permanently locked.'],
    ['UTCID22', { id: 'u_x', role: 'listener', lockedAt: new Date(), lockType: 'manual' }, 'This account is already locked.'],
  ])('%s: lockError → %s', (_ma, target, ra) => {
    expect(lockError({ actorId: 'u_admin', target })).toBe(ra);
  });

  it('UTCID23: unlockError – chỉ mở được khoá tay', () => {
    expect(unlockError({ lockedAt: new Date(), lockType: 'manual' })).toBeNull();
    expect(unlockError({ lockedAt: new Date(), lockType: 'permanent' })).toMatch(/can't be undone/);
    expect(unlockError({ lockedAt: null })).toBe('This account is not locked.');
  });
});

describe('UT36 – dữ liệu nhập', () => {
  it.each([
    ['UTCID24', { rule: 'spam' }, []],
    ['UTCID25', { rule: 'spam', note: 'x'.repeat(300) }, []],
    ['UTCID26', {}, ['rule']],
    ['UTCID27', { rule: 'hack' }, ['rule']],
    ['UTCID28', { rule: 'other', note: 'x'.repeat(301) }, ['note']],
  ])('%s: validateRuleInput(%j) → lỗi %j', (_ma, body, loi) => {
    expect(Object.keys(validateRuleInput(body).errors)).toEqual(loi);
  });

  it.each([
    ['UTCID29', { targetType: 'comment', targetId: 'c1', reason: 'spam' }, []],
    ['UTCID30', { targetType: 'album', targetId: 'a1', reason: 'spam' }, ['target']],
    ['UTCID31', { targetType: 'song', targetId: ' ', reason: 'spam' }, ['target']],
    ['UTCID32', { targetType: 'song', targetId: 's1' }, ['reason']],
    ['UTCID33', { targetType: 'song', targetId: 's1', reason: 'scam' }, ['reason']], // người nghe không có lý do "scam"
    ['UTCID34', { targetType: 'post', targetId: 'p1', reason: 'other', details: 'x'.repeat(301) }, ['details']],
  ])('%s: validateReportInput(%j) → lỗi %j', (_ma, body, loi) => {
    expect(Object.keys(validateReportInput(body).errors)).toEqual(loi);
  });

  it('UTCID35: ruleLabel – quy định lạ hiện "Other"', () => {
    expect(Object.keys(RULES)).toEqual(['spam', 'harassment', 'offensive', 'copyright', 'scam', 'other']);
    expect([ruleLabel('copyright'), ruleLabel('xyz')]).toEqual(['Copyright infringement', 'Other']);
  });
});
