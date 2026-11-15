import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isFieldPoint } from './field.ts'

test('accepts finite points within the documented El Salvador box', () => {
  assert.equal(isFieldPoint({ lat: 13.64, lon: -89.38 }), true)
  assert.equal(isFieldPoint({ lat: 13, lon: -90.2 }), true)
  assert.equal(isFieldPoint({ lat: 14.5, lon: -87.7 }), true)
})

test('rejects malformed, non-finite, and out-of-box points', () => {
  assert.equal(isFieldPoint(null), false)
  assert.equal(isFieldPoint({ lat: '13.64', lon: -89.38 }), false)
  assert.equal(isFieldPoint({ lat: Number.NaN, lon: -89.38 }), false)
  assert.equal(isFieldPoint({ lat: 15, lon: -89.38 }), false)
  assert.equal(isFieldPoint({ lat: 13.64, lon: -91 }), false)
})
