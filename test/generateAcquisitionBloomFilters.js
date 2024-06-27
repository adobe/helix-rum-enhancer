/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const moduli = [239, 241, 251];

const basicHash = (string, modulo) => Array.from(string)
  .map((a) => a.charCodeAt(0))
  .reduce((a, b) => a + b, 1) % modulo;

const binaryToText = (binaryString) => {
  return parseInt(binaryString, 2).toString(16);
};

// known vendors
const vendors = [
  'adlocus',
  'admitadmonetize',
  'aftership',
  'amazon',
  'attentive',
  'avivid',
  'baidu',
  'banner',
  'bing',
  'blis',
  'cheetah',
  'cj',
  'clarin',
  'clm',
  'criteo',
  'demandgen',
  'digidip',
  'digitalremedycom',
  'discovery',
  'display',
  'eloqua',
  'email',
  'eminent',
  'facebook',
  'famoussmokeshopinc',
  'fark',
  'fashionistatop',
  'feedotter',
  'flipboard',
  'flyer',
  'geniusmonkey',
  'giftcardmall',
  'google',
  'hotstar',
  'hrs',
  'hsemail',
  'inmobicom',
  'inred',
  'insider',
  'instagram',
  'integrateddisplay',
  'internal',
  'line',
  'linkbux',
  'linkedin',
  'linkinbio',
  'locationpage',
  'lveng',
  'm2trans',
  'manutd',
  'marketo',
  'massiva',
  'mavenintent',
  'mediamond',
  'mentionme',
  'microsoft',
  'native',
  'newsletter',
  'nexus',
  'openweb',
  'optum',
  'outbrain',
  'outlook',
  'partner',
  'partnerstudentbeanscom',
  'petcademy',
  'pinterest',
  'pmax',
  'programmatic',
  'programmaticgdn',
  'pushly',
  'qrcode',
  'reddit',
  'redone',
  'retailercode',
  'seznam',
  'shopfully',
  'silverpop',
  'sky',
  'skyscanner',
  'snapchat',
  'spotify',
  'substack',
  'taboola',
  'teads',
  'thetradedesk',
  'tiktok',
  'tradedesk',
  'tradetracker',
  'twitter',
  'web',
  'yahoo',
  'yandex',
  'yext',
  'yieldkit',
  'youtube',
];

// Initialize 256 chars long array filled with initial zeros
const bloomFilter = new Array(256).fill(0);

// Insert each vendor into the Bloom filter
vendors.forEach((vendor) => {
  moduli.forEach((modulo) => {
    const hash = basicHash(vendor, modulo);
    bloomFilter[hash] = 1;
  });
});

const f = bloomFilter.reduce((acc, _, index) => (index % 4 === 0 ? [...acc, bloomFilter.slice(index, index + 4).join('')] : acc), [])
  .map((binaryChar) => binaryToText(binaryChar))
  .join('');

console.log(`Bloom Filter: ${f}`);
