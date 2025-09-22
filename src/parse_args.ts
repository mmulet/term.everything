import Bun from "bun";
import { parseArgs } from "util";
//@ts-ignore
import help_file from "../resources/help.md" with { type: "file" };
import licenses_file from "../resources/LICENSES.txt" with { type: "file" };
import { render_markdown_to_terminal } from "./render_markdown_to_terminal.ts";
import { get_version_of_app } from "./get_version_of_app.ts";
import npm_licenses from "../resources/npm_licenses.txt" with { type: "file" };
export type Command_Line_args =
  ReturnType<typeof parse_args> extends Promise<infer T> ? T : never;

export const parse_args = async () => {
  const args = parseArgs({
    options: {
      ["wayland-display-name"]: {
        type: "string",
      },
      "support-old-apps": {
        type: "boolean",
      },
      xwayland: {
        type: "string",
      },
      ["xwayland-wm"]: {
        type: "string",
      },
      shell: {
        type: "string",
        default: "/bin/bash",
      },
      ["hide-status-bar"]: {
        type: "boolean",
        default: false,
      },
      "virtual-monitor-size": {
        type: "string",
      },

      version: {
        type: "boolean",
      },
      ["debug-log"]: {
        type: "boolean",
      },
      help: {
        type: "boolean",
        short: "h",
      },
      licenses: {
        type: "boolean",
      },
      ["reverse-scroll"]: {
        type: "boolean",
        default: false,
      },
    },
    args: Bun.argv.slice(2),
    allowPositionals: true,
  });
  if (args.values.version) {
    console.log(get_version_of_app());
    process.exit(0);
  }
  if (args.values.help) {
    const help_markdown = await Bun.file(help_file).text();
    render_markdown_to_terminal(help_markdown);
    process.exit(0);
  }
  if (args.values.licenses) {
    const licenses_text = await Bun.file(licenses_file).text();
    console.log(licenses_text);
    const npm_licenses_text = await Bun.file(npm_licenses).text();
    console.log(npm_licenses_text);
    process.exit(0);
  }

  return args;
};
