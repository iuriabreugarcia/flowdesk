import { isRoleAllowed } from './role.utils';

describe('isRoleAllowed', () => {
  it('allows a role present in the permission list', () => {
    expect(isRoleAllowed('ADMIN', ['OWNER', 'ADMIN'])).toBeTrue();
  });

  it('denies a role outside the permission list', () => {
    expect(isRoleAllowed('USER', ['OWNER', 'ADMIN', 'MANAGER'])).toBeFalse();
  });
});
