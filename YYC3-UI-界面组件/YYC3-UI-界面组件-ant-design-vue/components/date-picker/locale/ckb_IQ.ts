import CalendarLocale from '../../vc-picker/locale/ckb_IQ';
import TimePickerLocale from '../../time-picker/locale/ckb_IQ';
import type { PickerLocale } from '../generatePicker';

// Merge into a locale object
const locale: PickerLocale = {
  lang: {
    placeholder: 'بەروار هەڵبژێرە',
    yearPlaceholder: 'ساڵ هەڵبژێرە',
    quarterPlaceholder: 'چارەک هەڵبژێرە',
    monthPlaceholder: 'مانگ هەڵبژێرە',
    weekPlaceholder: 'هەفتە هەڵبژێرە',
    rangePlaceholder: ['بەرواری دەستپێک', 'بەرواری کۆتایی'],
    rangeYearPlaceholder: ['ساڵی دەستپێک', 'ساڵی کۆتایی'],
    rangeQuarterPlaceholder: ['چارەکی دەستپێک', 'چارەکی کۆتایی'],
    rangeMonthPlaceholder: ['مانگی دەستپێک', 'مانگی کۆتایی'],
    rangeWeekPlaceholder: ['هەفتەی دەستپێک', 'هەفتەی کۆتایی'],
    ...CalendarLocale,
  },
  timePickerLocale: {
    ...TimePickerLocale,
  },
};

// All settings at:
// https://github.com/ant-design/ant-design/blob/master/components/date-picker/locale/example.json

export default locale;
