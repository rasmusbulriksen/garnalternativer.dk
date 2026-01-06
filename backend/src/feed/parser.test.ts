import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseProductFeedFromXml } from './parser.js';

describe('parseProductFeedFromXml', () => {
  test('should parse a simple XML feed with one product', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <brand>Test Brand</brand>
    <produktnavn>Test Yarn</produktnavn>
    <produktid>12345</produktid>
    <nypris>99.50</nypris>
    <glpris>120.00</glpris>
    <lagerantal>10</lagerantal>
    <vareurl>https://example.com/product</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].retailerName, 'Test Retailer');
    assert.strictEqual(result[0].retailers_product_id, '12345');
    assert.strictEqual(result[0].brand, 'Test Brand');
    assert.strictEqual(result[0].name, 'Test Yarn');
    assert.strictEqual(result[0].category, 'Garn');
    assert.strictEqual(result[0].price_before_discount, 120.00);
    assert.strictEqual(result[0].price_after_discount, 99.50);
    assert.strictEqual(result[0].stock_status, '10');
    assert.strictEqual(result[0].url, 'https://example.com/product');
  });

  test('should filter out non-yarn products', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Needles</kategorinavn>
    <produktnavn>Knitting Needles</produktnavn>
    <produktid>111</produktid>
    <vareurl>https://example.com/needles</vareurl>
  </produkt>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <produktnavn>Yarn Product</produktnavn>
    <produktid>222</produktid>
    <vareurl>https://example.com/yarn</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Yarn Product');
  });

  test('should include all products for retailer_id 10 (tantegroencph.dk)', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Needles</kategorinavn>
    <produktnavn>Non-Yarn Product</produktnavn>
    <produktid>111</produktid>
    <vareurl>https://example.com/product</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent, 10);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Non-Yarn Product');
  });

  test('should handle missing optional fields', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <produktnavn>Yarn Without Brand</produktnavn>
    <produktid>999</produktid>
    <vareurl>https://example.com/product</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent);

    assert.strictEqual(result[0].brand, null);
    assert.strictEqual(result[0].price_before_discount, null);
    assert.strictEqual(result[0].price_after_discount, null);
  });

  test('should always use price_after_discount when prices are different', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <brand>Drops</brand>
    <produktnavn>Drops Flora</produktnavn>
    <produktid>12345</produktid>
    <nypris>16.00</nypris>
    <glpris>24.00</glpris>
    <lagerantal>in stock</lagerantal>
    <vareurl>https://example.com/flora</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].price_before_discount, 24.00);
    assert.strictEqual(result[0].price_after_discount, 16.00);
    assert.notStrictEqual(result[0].price_before_discount, result[0].price_after_discount);
    assert.strictEqual(result[0].price_after_discount, 16.00);
  });

  test('should always use price_after_discount even when prices are equal', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<produkter>
  <produkt>
    <forhandler>Test Retailer</forhandler>
    <kategorinavn>Garn</kategorinavn>
    <brand>Drops</brand>
    <produktnavn>Drops Kid Silk</produktnavn>
    <produktid>67890</produktid>
    <nypris>29.00</nypris>
    <glpris>29.00</glpris>
    <lagerantal>in stock</lagerantal>
    <vareurl>https://example.com/kid-silk</vareurl>
  </produkt>
</produkter>`;

    const result = parseProductFeedFromXml(xmlContent);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].price_before_discount, 29.00);
    assert.strictEqual(result[0].price_after_discount, 29.00);
    assert.strictEqual(result[0].price_before_discount, result[0].price_after_discount);
    assert.strictEqual(result[0].price_after_discount, 29.00);
    assert.strictEqual(result[0].price_after_discount, result[0].price_before_discount);
  });
});