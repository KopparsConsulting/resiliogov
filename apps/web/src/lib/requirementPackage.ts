/**
 * Kravpaket: för över kravbiblioteket från katalogmiljön (öppen, där AI
 * tolkar lagtext) till driftmiljön (skyddad). Överföringen går bara åt ett
 * håll och paketet innehåller bara offentligt material – aldrig anläggningar,
 * system eller bedömningar.
 *
 * Paketfilen innehåller exakt den text databasen skapade (content), dess
 * SHA-256 och en valfri Ed25519-signatur. Databasen kontrollerar
 * kontrollsumman igen vid import, så ett ändrat eller skadat paket stoppas.
 *
 * Signeringsnyckeln skapas och används i webbläsaren och sparas aldrig på
 * servern: den privata nyckeln laddas ner som fil och förvaras av den som
 * släpper kravpaket. Driftmiljön registrerar bara den publika nyckeln.
 *
 * Begränsning: signaturen kontrolleras i webbläsaren innan importen anropas.
 * Den skyddar mot ändrade eller förfalskade filer under överföringen, inte
 * mot en administratör i driftmiljön – som ändå kan ändra krav direkt.
 */
import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

// WebCrypto (crypto.subtle) finns bara i säker kontext (https/localhost). På ett
// internt nät kan plattformen nås över http, så hashning görs i ren JS, och
// Ed25519-biblioteket får sin SHA-512 därifrån i stället för från WebCrypto.
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
ed.etc.sha512Async = async (...m) => sha512(ed.etc.concatBytes(...m));
const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

export const PACKAGE_FORMAT = 'resiliogov-kravpaket';
export const KEY_FORMAT = 'resiliogov-signeringsnyckel';

export interface PackageSignature {
  alg: 'Ed25519';
  key_id: string;
  value: string; // base64
}

export interface RequirementPackageFile {
  format: typeof PACKAGE_FORMAT;
  format_version: 1;
  version: number;
  created_at: string;
  sha256: string;
  signature: PackageSignature | null;
  /** Exakt den text kontrollsumman och signaturen gäller för */
  content: string;
}

export interface SigningKeyFile {
  format: typeof KEY_FORMAT;
  key_id: string;
  public_key: string; // base64
  private_key: string; // base64
  created_at: string;
  note: string;
}

const encoder = new TextEncoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(sha256(encoder.encode(text)));
}

/** Kort, läsbart id för en publik nyckel (första 16 hex-tecken av SHA-256) */
export async function keyIdFor(publicKeyB64: string): Promise<string> {
  return toHex(sha256(fromBase64(publicKeyB64)).slice(0, 8));
}

export async function generateSigningKey(): Promise<SigningKeyFile> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const public_key = toBase64(publicKey);
  return {
    format: KEY_FORMAT,
    key_id: await keyIdFor(public_key),
    public_key,
    private_key: toBase64(privateKey),
    created_at: new Date().toISOString(),
    note: 'Privat signeringsnyckel för kravpaket. Förvara säkert och dela aldrig. Registrera bara public_key i driftmiljön.',
  };
}

export function parseSigningKeyFile(text: string): SigningKeyFile {
  let parsed: SigningKeyFile;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Nyckelfilen är inte giltig JSON');
  }
  if (parsed?.format !== KEY_FORMAT || !parsed.private_key || !parsed.public_key || !parsed.key_id) {
    throw new Error('Filen är inte en signeringsnyckel för kravpaket');
  }
  return parsed;
}

export async function signContent(content: string, key: SigningKeyFile): Promise<PackageSignature> {
  const privateKey = fromBase64(key.private_key);
  const derived = toBase64(await ed.getPublicKeyAsync(privateKey));
  if (derived !== key.public_key) throw new Error('Nyckelfilen är skadad: privat och publik nyckel hör inte ihop');
  const signature = await ed.signAsync(encoder.encode(content), privateKey);
  return { alg: 'Ed25519', key_id: key.key_id, value: toBase64(signature) };
}

export async function verifySignature(content: string, signature: PackageSignature, publicKeyB64: string): Promise<boolean> {
  try {
    return await ed.verifyAsync(fromBase64(signature.value), encoder.encode(content), fromBase64(publicKeyB64));
  } catch {
    return false;
  }
}

export function buildPackageFile(args: {
  version: number;
  sha256: string;
  content: string;
  signature: PackageSignature | null;
}): RequirementPackageFile {
  return {
    format: PACKAGE_FORMAT,
    format_version: 1,
    version: args.version,
    created_at: new Date().toISOString(),
    sha256: args.sha256,
    signature: args.signature,
    content: args.content,
  };
}

export function parsePackageFile(text: string): RequirementPackageFile {
  let parsed: RequirementPackageFile;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Filen är inte giltig JSON');
  }
  if (parsed?.format !== PACKAGE_FORMAT || parsed.format_version !== 1) {
    throw new Error('Filen är inte ett kravpaket (fel format)');
  }
  if (typeof parsed.content !== 'string' || typeof parsed.sha256 !== 'string' || !Number.isInteger(parsed.version)) {
    throw new Error('Kravpaketet är ofullständigt');
  }
  return parsed;
}

export type PackageCheck =
  | { ok: false; reason: string }
  | { ok: true; signed: boolean; signatureVerified: boolean; keyId: string | null; warning?: string };

/**
 * Kontrollerar ett paket innan import: kontrollsumma, och signatur om
 * driftmiljön har en betrodd nyckel.
 */
export async function checkPackage(
  pkg: RequirementPackageFile,
  trusted: { keyId: string; publicKey: string } | null,
): Promise<PackageCheck> {
  if ((await sha256Hex(pkg.content)) !== pkg.sha256.toLowerCase()) {
    return { ok: false, reason: 'Kontrollsumman stämmer inte – filen är skadad eller har ändrats.' };
  }
  let inner: { version?: number };
  try {
    inner = JSON.parse(pkg.content);
  } catch {
    return { ok: false, reason: 'Paketets innehåll är inte giltig JSON.' };
  }
  if (inner.version !== pkg.version) {
    return { ok: false, reason: 'Versionsnumret i filen stämmer inte med innehållet.' };
  }

  if (!pkg.signature) {
    return trusted
      ? { ok: false, reason: 'Paketet är inte signerat, men driftmiljön kräver signerade paket.' }
      : { ok: true, signed: false, signatureVerified: false, keyId: null,
          warning: 'Paketet är inte signerat. Registrera en betrodd nyckel för att kräva signatur.' };
  }
  if (!trusted) {
    return { ok: true, signed: true, signatureVerified: false, keyId: pkg.signature.key_id,
             warning: 'Paketet är signerat, men ingen betrodd nyckel är registrerad – signaturen kan inte kontrolleras.' };
  }
  if (pkg.signature.key_id !== trusted.keyId) {
    return { ok: false, reason: `Paketet är signerat med en annan nyckel (${pkg.signature.key_id}) än den betrodda (${trusted.keyId}).` };
  }
  const valid = await verifySignature(pkg.content, pkg.signature, trusted.publicKey);
  return valid
    ? { ok: true, signed: true, signatureVerified: true, keyId: pkg.signature.key_id }
    : { ok: false, reason: 'Signaturen är ogiltig – paketet har ändrats eller signerats med fel nyckel.' };
}

export function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
