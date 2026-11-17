/* eslint-disable no-template-curly-in-string */
import Pagination from '../vc-pagination/locale/ckb';
import DatePicker from '../date-picker/locale/ckb';
import TimePicker from '../time-picker/locale/ckb';
import Calendar from '../calendar/locale/ckb';
import type { Locale } from '../locale-provider';

const typeTemplate = '${label} ${type}ێکی دروست نییە';

const localeValues: Locale = {
  locale: 'ckb-IQ',
  Pagination,
  DatePicker,
  TimePicker,
  Calendar,
  Table: {
    filterTitle: 'پێڕستی پاڵاوتن',
    filterConfirm: 'باشە',
    filterReset: 'ڕێکخستنەوە',
    filterEmptyText: 'هیچ پاڵاوەرێک نییە',
    emptyText: 'هیچ زانیارییەک نییە',
    selectAll: 'هەڵبژاردنی پەڕەی ئێستا',
    selectInvert: 'پێچەوانەکردنەوەی پەڕەی ئێستا',
    selectNone: 'سڕینەوەی هەموو زانیارییەکان',
    selectionAll: 'هەڵبژاردنی هەموو زانیارییەکان',
    sortTitle: 'ڕیزکردن',
    expand: 'فراوانکردنی ڕیز',
    collapse: 'کۆکردنەوەی ڕیز',
    triggerDesc: 'کرتە بکە بۆ ڕیزکردنی دابەزین',
    triggerAsc: 'کرتە بکە بۆ ڕیزکردنی سەرکەوتن',
    cancelSort: 'کرتە بکە بۆ هەڵوەشاندنەوەی ڕیزکردن',
  },
  Modal: {
    okText: 'باشە',
    cancelText: 'پاشگەزبوونەوە',
    justOkText: 'باشە',
  },
  Popconfirm: {
    okText: 'باشە',
    cancelText: 'پاشگەزبوونەوە',
  },
  Transfer: {
    searchPlaceholder: 'لێرە بگەڕێ',
    itemUnit: 'بڕگە',
    itemsUnit: 'بڕگە',
  },
  Upload: {
    uploading: 'بار دەکرێت...',
    removeFile: 'سڕینەوەی پەڕگە',
    uploadError: 'هەڵە لە بارکردن',
    previewFile: 'پێشبینینی پەڕگە',
    downloadFile: 'داگرتنی پەڕگە',
  },
  Empty: {
    description: 'هیچ زانیارییەک نییە',
  },
  Form: {
    defaultValidateMessages: {
      default: 'هەڵە لە ڕاستی و دروستی خانەی ${label}',
      required: 'تکایە ${label} بنووسە',
      enum: '${label} دەبێت یەکێک بێت لە [${enum}]',
      whitespace: '${label} ناتوانێت نوسەی بەتاڵ بێت',
      date: {
        format: 'شێوازی بەرواری ${label} نادروستە',
        parse: '${label} ناتوانرێت بگۆڕدرێت بۆ بەروار',
        invalid: '${label} بەروارێکی نادروستە',
      },
      types: {
        string: typeTemplate,
        method: typeTemplate,
        array: typeTemplate,
        object: typeTemplate,
        number: typeTemplate,
        date: typeTemplate,
        boolean: typeTemplate,
        integer: typeTemplate,
        float: typeTemplate,
        regexp: typeTemplate,
        email: typeTemplate,
        url: typeTemplate,
        hex: typeTemplate,
      },
      string: {
        len: '${label} دەبێت ${len} نوسە بێت',
        min: '${label} دەبێت بەلایەنی کەم ${min} نوسە بێت',
        max: '${label} دەبێت زۆرترین ${max} نوسە بێت',
        range: '${label} دەبێت لە نێوان ${min}-${max} نوسە بێت',
      },
      number: {
        len: '${label} دەبێت یەکسان بێت بە ${len}',
        min: '${label} دەبێت کەمترین ${min} بێت',
        max: '${label} دەبێت زۆرترین ${max} بێت',
        range: '${label} دەبێت لە نێوان ${min}-${max} بێت',
      },
      array: {
        len: 'دەبێت ${len} ${label} بێت',
        min: 'بەلایەنی کەم ${min} ${label}',
        max: 'بەکاتی زۆر ${max} ${label}',
        range: 'بڕی ${label} دەبێت لە نێوان ${min}-${max} بێت',
      },
      pattern: {
        mismatch: '${label} لەگەڵ شێوازی ${pattern} ناگونجێت',
      },
    },
  },
};

export default localeValues;
