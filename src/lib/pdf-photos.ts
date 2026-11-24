// 브라우저에서만 쓴다: 프로필 PDF 안에 들어 있는 사진을 원본 그대로 꺼낸다.
//
// PDF는 사진을 따로 담아 두므로(Image XObject), 페이지를 캡처하지 않고 사진만 꺼낼 수 있다.
// 꺼낸 사진은 화면에 후보로 보여 주고, 작은 미리보기만 AI에게 보내 배우 사진인지 고르게 한다.
// 배우가 체크한 사진만 일반 사진 올리기와 같은 길로 저장된다. 꺼내지 못하면 빈 목록을 돌려준다.
//
// 꺼낼 수 있는 것: JPEG(DCTDecode)과 흑백·컬러 무손실(FlateDecode, 8비트) 사진. 프로필 PDF 사진은 거의 이 둘이다.
// 꺼낼 수 없는 것: 사진 여러 장을 한 장의 그림으로 합친 PDF, 스캔 PDF(페이지 전체가 사진 한 장),
// JPEG2000·팔레트 색 사진. 스캔 PDF는 페이지 전체가 후보로 나올 수 있는데, AI가 '배우 사진 아님'으로 거른다.

import type { PDFRawStream } from 'pdf-lib';
import {
  colorComponents,
  encodeJpeg,
  filterNames,
  inflate,
  numberOf,
  toImageData,
  unpredict,
} from './pdf-compress';
import { isPhotoSized, keepLargest, MAX_PHOTO_CANDIDATES, THUMB_SIDE } from './photo-picks';

export type PhotoCandidate = {
  /** 저장할 때 올리는 사진(긴 변 2000px 이하 JPEG). */
  file: File;
  /** 화면에 보여 주고 AI에게 보내는 작은 미리보기(JPEG data URL). */
  thumb: string;
  width: number;
  height: number;
};

const FULL_SIDE = 2000;

/** PDF 속 사진 후보를 PDF에 나온 순서대로 돌려준다(최대 12장). */
export async function extractPdfPhotos(pdf: File): Promise<PhotoCandidate[]> {
  try {
    const lib = await import('pdf-lib');
    const { PDFName, PDFDict, PDFRawStream: RawStream, PDFRef, PDFNumber } = lib;
    const doc = await lib.PDFDocument.load(new Uint8Array(await pdf.arrayBuffer()), {
      updateMetadata: false,
      ignoreEncryption: true,
    });
    const context = doc.context;
    const name = (value: string) => PDFName.of(value);
    const found: { stream: PDFRawStream; width: number; height: number }[] = [];
    const seen = new Set<string>();

    // 페이지(와 그 안의 묶음 그림 Form)가 쓰는 사진을 페이지 순서대로 모은다. 같은 사진이 여러 번 쓰이면 한 번만.
    const walk = (resources: unknown, depth: number) => {
      const dict = resources instanceof PDFRef ? context.lookup(resources) : resources;
      if (!(dict instanceof PDFDict) || depth > 4) return;
      const xobjects = dict.lookup(name('XObject'));
      if (!(xobjects instanceof PDFDict)) return;
      for (const [, ref] of xobjects.entries()) {
        if (!(ref instanceof PDFRef) || seen.has(ref.toString())) continue;
        seen.add(ref.toString());
        const object = context.lookup(ref);
        if (!(object instanceof RawStream)) continue;
        const subtype = object.dict.lookup(name('Subtype'));
        if (subtype === name('Form')) {
          walk(object.dict.get(name('Resources')), depth + 1);
          continue;
        }
        if (subtype !== name('Image') || object.dict.get(name('ImageMask'))) continue;
        const width = numberOf(object.dict.lookup(name('Width')), PDFNumber);
        const height = numberOf(object.dict.lookup(name('Height')), PDFNumber);
        if (isPhotoSized(width, height)) found.push({ stream: object, width, height });
      }
    };
    for (const page of doc.getPages()) walk(page.node.Resources(), 0);

    const out: PhotoCandidate[] = [];
    for (const item of keepLargest(found, MAX_PHOTO_CANDIDATES)) {
      const bitmap = await decodeImage(item.stream, item.width, item.height, lib).catch(() => null);
      if (!bitmap) continue;
      try {
        const candidate = await toCandidate(bitmap, `pdf-photo-${out.length + 1}.jpg`);
        if (candidate) out.push(candidate);
      } finally {
        bitmap.close();
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** 사진 파일 한 장을 후보로 만든다(사진으로 초안을 만들 때). 원본 파일은 올릴 때 줄인다. */
export async function photoFileCandidate(file: File): Promise<PhotoCandidate | null> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      if (!isPhotoSized(bitmap.width, bitmap.height)) return null;
      const thumb = await encodeJpeg(bitmap, Math.min(1, THUMB_SIDE / longSide(bitmap)), 0.75);
      if (!thumb) return null;
      return {
        file,
        thumb: await dataUrl(thumb.bytes),
        width: bitmap.width,
        height: bitmap.height,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

async function toCandidate(bitmap: ImageBitmap, fileName: string): Promise<PhotoCandidate | null> {
  const full = await encodeJpeg(bitmap, Math.min(1, FULL_SIDE / longSide(bitmap)), 0.9);
  const thumb = await encodeJpeg(bitmap, Math.min(1, THUMB_SIDE / longSide(bitmap)), 0.75);
  if (!full || !thumb) return null;
  return {
    file: new File([full.bytes as BlobPart], fileName, { type: 'image/jpeg' }),
    thumb: await dataUrl(thumb.bytes),
    width: bitmap.width,
    height: bitmap.height,
  };
}

async function decodeImage(
  stream: PDFRawStream,
  width: number,
  height: number,
  lib: typeof import('pdf-lib'),
): Promise<ImageBitmap | null> {
  const { PDFName, PDFArray, PDFDict, PDFNumber } = lib;
  const dict = stream.dict;
  const filters = filterNames(dict.lookup(PDFName.of('Filter')), PDFName, PDFArray);
  if (filters.length === 1 && filters[0] === 'DCTDecode')
    return createImageBitmap(new Blob([stream.contents as BlobPart], { type: 'image/jpeg' }));
  if (filters.length !== 1 || filters[0] !== 'FlateDecode') return null;
  const components = colorComponents(
    dict.lookup(PDFName.of('ColorSpace')),
    stream.dict.context,
    lib,
  );
  if (components !== 1 && components !== 3) return null;
  if (numberOf(dict.lookup(PDFName.of('BitsPerComponent')), PDFNumber) !== 8) return null;
  const params = dict.lookup(PDFName.of('DecodeParms'));
  const predictor =
    params instanceof PDFDict ? numberOf(params.lookup(PDFName.of('Predictor')), PDFNumber) : 1;
  const pixels = unpredict(
    await inflate(stream.contents),
    width,
    height,
    components,
    predictor || 1,
  );
  if (!pixels) return null;
  return createImageBitmap(toImageData(pixels, width, height, components));
}

function longSide(image: { width: number; height: number }) {
  return Math.max(image.width, image.height);
}

async function dataUrl(bytes: Uint8Array) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
  });
}
