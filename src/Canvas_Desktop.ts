import {
  Canvas,
  CanvasRenderingContext2D,
  createCanvas,
  Image,
  loadImage,
} from "canvas";
import { Size } from "./Size.ts";
import { Wayland_Client } from "./Wayland_Client.ts";
import { wl_surface } from "./objects/wl_surface.ts";
import { Buffer } from "buffer";
//@ts-ignore
import icon from "../resources/icon.png" with { type: "file" };
import { Object_ID } from "./wayland_types.ts";
import { wl_surface as wl_surface_protocol } from "./protocols/wayland.xml.ts";

export class Canvas_Desktop {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
  icon_image: Image | null = null;
  after_opening_timeout = false;

  draw_image = (image: Image | null, x: number, y: number) => {
    if (!image) {
      return;
    }
    this.context.drawImage(image, x, y);
  };

  constructor(size: Size, will_show_app_right_at_startup: boolean) {
    /**
     * If we will show an app right at startup,
     * we want to wait a bit before potentially
     * drawing the icon. Otherwise it will
     * flash the icon, and the show the app
     * content which is annoying.
     *
     */
    if (!will_show_app_right_at_startup) {
      this.after_opening_timeout = true;
    } else {
      Bun.sleep(500).then(() => {
        this.after_opening_timeout = true;
      });
    }

    this.canvas = createCanvas(size.width, size.height);

    this.context = this.canvas.getContext("2d")!;
    Bun.file(icon)
      .arrayBuffer()
      .then(async (buffer) => {
        this.icon_image = await loadImage(Buffer.from(buffer));
      });
  }
  draw_clients = (clients: Set<Wayland_Client>) => {
    /**
     * Do z sorting
     * of all drawable surfaces
     */
    const sorted_surfaces: [
      wl_surface,
      Canvas,
      Object_ID<wl_surface_protocol>,
    ][] = [];

    const child_to_parent_map: {
      [child_id: Object_ID<wl_surface_protocol>]: {
        parent_id: Object_ID<wl_surface_protocol>;
        x: number;
        y: number;
      };
    } = {};

    for (const s of clients) {
      for (const surface_id of s.drawable_surfaces) {
        const surface = s.get_object(surface_id)?.delegate;
        if (!surface) {
          continue;
        }
        if (!surface.texture) {
          continue;
        }
        if (!surface.texture.canvas) {
          continue;
        }
        for (const child of surface.children_in_draw_order) {
          if (!child) {
            continue;
          }
          child_to_parent_map[child] = {
            parent_id: surface_id,
            x: surface.position.x,
            y: surface.position.y,
          };
        }

        sorted_surfaces.push([surface, surface.texture.canvas, surface_id]);
      }
    }
    sorted_surfaces.sort((a, b) => {
      return a[0].position.z - b[0].position.z;
    });
    // for debugging
    // console.log("\n\n");

    // for (const [
    //   {
    //     position: { x, y, z },
    //     offset: { x: offsetX, y: offsetY },
    //     role,
    //     children_in_draw_order,
    //   },
    //   _canvas,
    //   id,
    // ] of sorted_surfaces) {
    //   console.log(
    //     `wl_surface${id} ${role?.type ?? ""} | x:${x} y:${y} z:${z} | offset x:${offsetX} y:${offsetY}
    //     children: ${children_in_draw_order.join("\n")}`
    //   );
    // }
    // console.log("\n\n");

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (sorted_surfaces.length <= 0 && this.after_opening_timeout) {
      this.draw_image(this.icon_image, 0, 0);
    }

    for (const [surface, texture, surface_id] of sorted_surfaces) {
      /**
       * Recursively get the position by adding
       * all ancestor position
       */
      let x = surface.position.x;
      let y = surface.position.y;
      let parent = child_to_parent_map[surface_id];
      while (parent != undefined) {
        x += parent.x;
        y += parent.y;
        parent = child_to_parent_map[parent.parent_id];
      }

      this.context.drawImage(texture, x, y);
    }
  };
}
