export function integrationStatusLabel(state: string | undefined | null) {
  if (!state) {
    return { label: 'بانتظار التحقق', tone: 'neutral' };
  }
  if (state === 'ready') {
    return { label: 'متصل', tone: '' };
  }
  if (state === 'permissions_required') {
    return { label: 'صلاحية مطلوبة', tone: 'warning' };
  }
  if (state === 'not_connected') {
    return { label: 'غير متصل', tone: 'neutral' };
  }
  if (state === 'configuration_required') {
    return { label: 'إعداد مطلوب', tone: 'warning' };
  }
  if (state === 'unavailable') {
    return { label: 'غير متاح', tone: 'neutral' };
  }
  if (state === 'upgrade_required') {
    return { label: 'غير مفعّل', tone: 'neutral' };
  }
  return { label: 'حالة غير معروفة', tone: 'neutral' };
}
