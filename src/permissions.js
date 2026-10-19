export function getCurrentScreen(visibleNav, requestedScreen) {
  const requested = visibleNav.find(item => item.id === requestedScreen);
  if (requested) return requested.id;
  return (visibleNav.find(item => !item.href) || visibleNav[0])?.id;
}

export function getNavForUser(baseNav, user) {
  const permissions = user?.permissions || {};
  return baseNav.filter((item) => {
    if (item.adminOnly && !user?.admin) return false;
    const allowed = item.permissionsAny || [item.permission || item.id];
    const explicitPermissions = ["folgas-motoristas", "status-carga", "automacoes-n8n"];
    return allowed.some(permission =>
      permissions[permission] === true || (user?.admin && !explicitPermissions.includes(permission))
    );
  });
}
