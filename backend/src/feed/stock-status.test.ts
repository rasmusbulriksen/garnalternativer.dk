import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isInStock, getInStockVariants } from './stock-status.js';

describe('Stock Status Normalization', () => {
  test('should recognize "in stock" variants', () => {
    assert.strictEqual(isInStock('in stock'), true);
    assert.strictEqual(isInStock('in_stock'), true);
    assert.strictEqual(isInStock('instock'), true);
    assert.strictEqual(isInStock('in-stock'), true);
    assert.strictEqual(isInStock('available'), true);
    assert.strictEqual(isInStock('på lager'), true);
    assert.strictEqual(isInStock('paa lager'), true);
  });

  test('should handle case insensitivity', () => {
    assert.strictEqual(isInStock('IN STOCK'), true);
    assert.strictEqual(isInStock('In_Stock'), true);
    assert.strictEqual(isInStock('INSTOCK'), true);
    assert.strictEqual(isInStock('PÅ LAGER'), true);
  });

  test('should handle whitespace', () => {
    assert.strictEqual(isInStock('  in stock  '), true);
    assert.strictEqual(isInStock('\tin_stock\n'), true);
  });

  test('should recognize numeric stock values > 0', () => {
    assert.strictEqual(isInStock('10'), true);
    assert.strictEqual(isInStock('1'), true);
    assert.strictEqual(isInStock('999'), true);
    assert.strictEqual(isInStock('0'), false);
    assert.strictEqual(isInStock('-1'), false);
  });

  test('should return false for out of stock values', () => {
    assert.strictEqual(isInStock('out of stock'), false);
    assert.strictEqual(isInStock('out_of_stock'), false);
    assert.strictEqual(isInStock('unavailable'), false);
    assert.strictEqual(isInStock('sold out'), false);
    assert.strictEqual(isInStock(''), false);
  });

  test('should return false for null or undefined', () => {
    assert.strictEqual(isInStock(null), false);
    assert.strictEqual(isInStock(undefined as any), false);
  });

  test('should return list of known variants', () => {
    const variants = getInStockVariants();
    assert.ok(Array.isArray(variants));
    assert.ok(variants.length > 0);
    assert.ok(variants.includes('in stock'));
    assert.ok(variants.includes('in_stock'));
  });
});

