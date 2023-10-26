import { MessageTransport } from "@dcl/mini-rpc";
import { hashV1 } from "@dcl/hashing";
import { UiClient, IframeStorage } from "@dcl/inspector";
import { toLayout } from "../lib/layout";
import { Hash, Path } from "../lib/constants";
import { createComposite } from "../lib/inspector";

type Options = {
  tokenId: string;
  isOwner: boolean;
};

export async function init(
  iframe: HTMLIFrameElement,
  { tokenId, isOwner }: Options
) {
  const transport = new MessageTransport(window, iframe.contentWindow!, "*");
  const ui = new UiClient(transport);
  const storage = new IframeStorage.Server(transport);

  await wire(storage, { tokenId, isOwner });

  // setup ui
  const promises: Promise<unknown>[] = [];
  promises.push(ui.selectAssetsTab("AssetsPack"));
  promises.push(ui.toggleComponent("inspector::Scene", false));
  if (!isOwner) {
    promises.push(ui.toggleGizmos(false));
    promises.push(ui.togglePanel("assets", false));
    promises.push(ui.togglePanel("components", false));
    promises.push(ui.togglePanel("entities", false));
    promises.push(ui.togglePanel("toolbar", false));
  }
  await Promise.all(promises);
}

// storage

function json(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8");
}

async function getContent(hash: string) {
  const resp = await fetch(
    `https://builder-items.decentraland.org/contents/${hash}`
  );
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function wire(
  storage: IframeStorage.Server,
  { tokenId, isOwner }: Options
) {
  const mappings = new Map<string, string>();
  const contents = new Map<string, Buffer>();

  mappings.set(Path.FLOOR_MODEL, Hash.FLOOR_MODEL);
  mappings.set(Path.FLOOR_TEXTURE, Hash.FLOOR_TEXTURE);

  // read file
  storage.handle("read_file", async ({ path }) => {
    switch (path) {
      case Path.PREFERENCES: {
        return json({
          version: 1,
          data: {
            freeCameraInvertRotation: false,
            autosaveEnabled: true,
          },
        });
      }
      case Path.SCENE: {
        const { base, parcels } = toLayout(tokenId);
        return json({
          scene: {
            parcels: parcels.map(({ x, y }) => `${x},${y}`),
            base: `${base.x},${base.y}`,
          },
        });
      }
      case Path.COMPOSITE: {
        const composite = createComposite(tokenId);
        return json(composite);
      }
      default: {
        if (mappings.has(path)) {
          const hash = mappings.get(path)!;
          if (!contents.has(hash)) {
            const content = await getContent(hash);
            contents.set(hash, content);
          }
          return contents.get(hash)!;
        }
        throw new Error(`Could not find content for path="${path}"`);
      }
    }
  });

  // write file
  storage.handle("write_file", async ({ path, content }) => {
    if (!isOwner) return;

    const ignored: string[] = [Path.SCENE, Path.PREFERENCES];

    if (ignored.includes(path)) return;

    const mutable: string[] = [Path.COMPOSITE, Path.CRDT];

    if (mutable.includes(path)) {
      // upload mutable
    } else {
      const hash = await hashV1(content);
      mappings.set(path, hash);
      console.log("hash", hash);
      contents.set(hash, content);
    }
  });

  storage.handle("exists", async ({ path }) => {
    switch (path) {
      case Path.SCENE:
      case Path.COMPOSITE:
      case Path.PREFERENCES: {
        return true;
      }
      default: {
        return mappings.has(path);
      }
    }
  });

  storage.handle("list", async ({ path }) => {
    const paths = [...mappings.keys(), Path.COMPOSITE];
    const files: { name: string; isDirectory: boolean }[] = [];

    for (const _path of paths) {
      if (!_path.startsWith(path)) continue;

      const fileName = _path.substring(path.length);
      const slashPosition = fileName.indexOf("/");
      if (slashPosition !== -1) {
        const directoryName = fileName.substring(0, slashPosition);
        if (!files.find((item) => item.name === directoryName)) {
          files.push({ name: directoryName, isDirectory: true });
        }
      } else {
        files.push({ name: fileName, isDirectory: false });
      }
    }

    return files;
  });

  storage.handle("delete", async ({ path }) => {
    mappings.delete(path);
  });
}

// unlock
export async function unlock(iframe: HTMLIFrameElement) {
  const transport = new MessageTransport(window, iframe.contentWindow!, "*");
  const ui = new UiClient(transport);

  // setup ui
  const promises: Promise<unknown>[] = [];
  promises.push(ui.toggleGizmos(true));
  promises.push(ui.togglePanel("assets", true));
  promises.push(ui.togglePanel("components", true));
  promises.push(ui.togglePanel("entities", true));
  promises.push(ui.togglePanel("toolbar", true));

  await Promise.all(promises);
}