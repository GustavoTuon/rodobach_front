export function getNavForUser(baseNav, user) {
  const permissions = user?.permissions || {};
  return baseNav.filter((item) => {
    if (item.adminOnly && !user?.admin) return false;
    const allowed = item.permissionsAny || [item.permission || item.id];
    return user?.admin || allowed.some(permission => permissions[permission] === true);
  });
}
