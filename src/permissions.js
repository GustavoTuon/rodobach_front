export function getNavForUser(baseNav, user) {
  const permissions = user?.permissions || {};
  return baseNav.filter((item) => {
    if (item.adminOnly && !user?.admin) return false;
    return user?.admin || permissions[item.id] === true;
  });
}
