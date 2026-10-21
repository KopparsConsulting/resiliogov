import { describe, it, expect } from 'vitest';
import {
  buildPackageFile, checkPackage, generateSigningKey, keyIdFor, parsePackageFile,
  parseSigningKeyFile, sha256Hex, signContent,
} from './requirementPackage';
import { csvCell } from './export/generatePackage';

const content = JSON.stringify({ format: 'resiliogov-kravpaket', format_version: 1, version: 3, requirements: [] });

async function makePackage(signed: boolean) {
  const key = await generateSigningKey();
  const sha256 = await sha256Hex(content);
  const signature = signed ? await signContent(content, key) : null;
  return { key, pkg: buildPackageFile({ version: 3, sha256, content, signature }) };
}

describe('kravpaket', () => {
  it('SHA-256 stämmer med känt värde', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('signerat paket med betrodd nyckel godkänns', async () => {
    const { key, pkg } = await makePackage(true);
    const check = await checkPackage(parsePackageFile(JSON.stringify(pkg)), { keyId: key.key_id, publicKey: key.public_key });
    expect(check).toMatchObject({ ok: true, signatureVerified: true, keyId: key.key_id });
  });

  it('ändrat innehåll stoppas av kontrollsumman', async () => {
    const { key, pkg } = await makePackage(true);
    const tampered = { ...pkg, content: pkg.content.replace('"version":3', '"version":3 ') };
    const check = await checkPackage(tampered, { keyId: key.key_id, publicKey: key.public_key });
    expect(check.ok).toBe(false);
  });

  it('ändrat innehåll med ny kontrollsumma stoppas av signaturen', async () => {
    const { key, pkg } = await makePackage(true);
    const newContent = pkg.content.replace('"requirements":[]', '"requirements":[{"id":"x"}]');
    const tampered = { ...pkg, content: newContent, sha256: await sha256Hex(newContent) };
    const check = await checkPackage(tampered, { keyId: key.key_id, publicKey: key.public_key });
    expect(check).toMatchObject({ ok: false });
  });

  it('paket signerat med annan nyckel avvisas', async () => {
    const { pkg } = await makePackage(true);
    const other = await generateSigningKey();
    const check = await checkPackage(pkg, { keyId: other.key_id, publicKey: other.public_key });
    expect(check.ok).toBe(false);
  });

  it('osignerat paket avvisas när driftmiljön har betrodd nyckel', async () => {
    const { key, pkg } = await makePackage(false);
    expect((await checkPackage(pkg, { keyId: key.key_id, publicKey: key.public_key })).ok).toBe(false);
    expect(await checkPackage(pkg, null)).toMatchObject({ ok: true, signed: false });
  });

  it('nyckelfil och nyckel-id är konsekventa', async () => {
    const key = await generateSigningKey();
    expect(parseSigningKeyFile(JSON.stringify(key)).key_id).toBe(await keyIdFor(key.public_key));
    expect(() => parsePackageFile('{"format":"annat"}')).toThrow();
  });
});

describe('CSV', () => {
  it('fritext som ser ut som formel blir text', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+46 70')).toBe("'+46 70");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('vanlig text')).toBe('vanlig text');
    expect(csvCell(null)).toBe('');
    expect(csvCell('a;b')).toBe('"a;b"');
  });
});
