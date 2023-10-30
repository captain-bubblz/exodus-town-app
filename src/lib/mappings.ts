import { hashV1 } from "./hash";

export enum Path {
  FLOOR_MODEL = "assets/scene/ground/FloorBaseGrass_01.glb",
  FLOOR_TEXTURE = "assets/scene/ground/Floor_Grass01.png.png",
  PREFERENCES = "inspector-preferences.json",
  COMPOSITE = "assets/scene/main.composite",
  CRDT = "main.crdt",
  SCENE = "scene.json",
  JS = "bin/index.js",
  NAVMAP_THUMBNAIL = "navmapThumbnail.png",
  ENTITY = "entity.json",
}

export enum Hash {
  FLOOR_MODEL = "bafybeice7mn3itu6pnabl6jqal5kf6h33mumuqgjsmvf7ka2jo6c3d7im4",
  FLOOR_TEXTURE = "bafybeicfmngqvgt2nt35r6lmlolqmx6zo5zh6rzfg7yr4aekftfigqh6yi",
}

export const MUTABLE_PATHS: string[] = [
  Path.PREFERENCES,
  Path.SCENE,
  Path.COMPOSITE,
  Path.CRDT,
  Path.NAVMAP_THUMBNAIL,
  Path.ENTITY,
];

export function isMutable(path: string) {
  return MUTABLE_PATHS.includes(path);
}

export async function getMutableHash(tokenId: string, path: string) {
  const input = `tokens/${tokenId}/${path}`;
  const hash = await hashV1(Buffer.from(input));
  console.log("getMutableHash", input, hash);
  return hash;
}

export async function getHash(path: string, content: Buffer, tokenId: string) {
  const hash = isMutable(path)
    ? await getMutableHash(tokenId, path)
    : await hashV1(content);
  return hash;
}

export function getContentPath(hash: string) {
  return `/api/contents/${hash}`;
}