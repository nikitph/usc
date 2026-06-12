import assert from "node:assert/strict";
import { test } from "node:test";

import { CanonicalJsonError, canonicalJson, sha256Hex } from "./hashing.ts";

/**
 * Fixture-style hash-stability cases (packet K-01). The pinned digests are the
 * contract: if canonicalization output ever drifts, every content-addressed
 * artifact id in the store silently changes — these cases exist to make that
 * drift loud.
 */
const HASH_STABILITY_CASES = [
  {
    name: "object key order does not affect the hash",
    input: { b: 1, a: "x" },
    expectedCanonical: '{"a":"x","b":1}',
    expectedSha256: "cdab067e9f3beb32d1252cfd63e492592fecbf591b0d08cadb24bb17f3864246",
  },
  {
    name: "nested objects sort keys at every depth; array order is preserved",
    input: { outer: { zee: true, list: [3, 2, 1], ann: null } },
    expectedCanonical: '{"outer":{"ann":null,"list":[3,2,1],"zee":true}}',
    expectedSha256: "c8af8cd1d8715dc4c351fd97bf0c4096eb50adb176c05609d268c6257a93a146",
  },
  {
    name: "unicode strings hash over their UTF-8 bytes, unescaped",
    input: { term: "café ⊗ 模式" },
    expectedCanonical: '{"term":"café ⊗ 模式"}',
    expectedSha256: "45936c3da7c0a6e1984602e9fdda91bbe393fb743ff226e91469a1be8391bf28",
  },
  {
    name: "artifact id envelope {kind, body, rulebaseHash, parents} is stable",
    input: {
      kind: "verdict",
      body: { motif: "boundary" },
      rulebaseHash: "deadbeefdeadbeef",
      parents: [],
    },
    expectedCanonical:
      '{"body":{"motif":"boundary"},"kind":"verdict","parents":[],"rulebaseHash":"deadbeefdeadbeef"}',
    expectedSha256: "f2f6189f50894f5420ac00ad61d0b9717ba9b192ec21248b06030ae2b408ba75",
  },
  {
    name: "number formatting is stable: -0 normalizes to 0, large floats use exponent form",
    input: { negZero: -0, floats: [0, 1.5, 1e21] },
    expectedCanonical: '{"floats":[0,1.5,1e+21],"negZero":0}',
    expectedSha256: "62bea2aa747a6ff0c043a463476924adf31da1263785a23b70b68bdc4b723517",
  },
] as const;

for (const stabilityCase of HASH_STABILITY_CASES) {
  test(stabilityCase.name, () => {
    const canonical = canonicalJson(stabilityCase.input);
    assert.equal(canonical, stabilityCase.expectedCanonical);
    assert.equal(sha256Hex(canonical), stabilityCase.expectedSha256);
    assert.deepEqual(JSON.parse(canonical), JSON.parse(stabilityCase.expectedCanonical));
  });
}

test("should_throw_CanonicalJsonError_when_value_is_not_json_representable", () => {
  assert.throws(() => canonicalJson({ when: new Date(0) }), CanonicalJsonError);
  assert.throws(() => canonicalJson({ bad: Number.NaN }), CanonicalJsonError);
  assert.throws(() => canonicalJson({ bad: undefined }), CanonicalJsonError);
  assert.throws(() => canonicalJson(7n), CanonicalJsonError);
});
