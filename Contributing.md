
# Easy Distribute and hacking.

Want to change just a couple lines?

The only dependency you need is `podman
- [podman https://podman.io/docs/installation](https://podman.io/docs/installation) On ubuntu just use`sudo apt install podman`

and run the distribute script
```sh
./distribute.sh
```
That will use a podman container to build the entire app and it will put the output
in `./dist`.


# Development

Below are all the dependencies this app needs. but
you can also look at `./resources/Containerfile` to see how to install all
the dependencies

## Deps:

- [Bun https://bun.sh/docs/installation] (https://bun.sh/docs/installation) Install globally by following the instructions on the bun website.
- [meson https://mesonbuild.com/Getting-meson.html (but I don't recommend getting it from here)] (https://mesonbuild.com/Getting-meson.html) for building the cpp code. Make sure meson is on path, I recommend using the [uv python package manager https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/) then install meson with `uv tool install meson`
- [Taskfile https://taskfile.dev/installation/](https://taskfile.dev/installation/) Installed by npm, or install globally for building and running the project, If you want to install globally and used uv in the last step, you can install it with ` uv tool install go-task-bin`
- [ninja https://github.com/ninja-build/ninja/releases] (https://github.com/ninja-build/ninja/releases) as a build system used by meson
- Download the following dependecies from your system's package manager. On ubuntu use: `sudo apt install pkg-config build-essential cmake autoconf automake libtool libglib2.0-dev libfreetype-dev`
- Optional: [vscode](https://code.visualstudio.com/) with these recommended extensions:
    - "mesonbuild.mesonbuild",
    - "ms-vscode.cpptools-extension-pack",
    - "oven.bun-vscode",
    - "esbenp.prettier-vscode",
    - "slevesque.shader",
    - "task.vscode-task",
    - "redhat.vscode-yaml"

```sh
git submodule update --init --recursive
``

### Version map
These are the versions of the tools used to build and run the project:
- Bun 1.2.21
- Taskfile v3.44.1
- Meson 1.9.0
- ninja v1.13.1
- pkg-cofig 1.8.1
- gcc 13.3.0
- cmake 3.28.3
- see third_party/Readme.md for the versions of the bundled dependencies


# Running and building

This project uses [task](https://taskfile.dev/) to manage tasks,
almost everything you can do development-wise is a task.
Use
```sh
task --list
```
to see a list of all tasks with descriptions.

### Most useful tasks

## run

Just run `task run` or even just `task` to build and run the project. 
Use -- to pass arguments to the program, like `./term.everything firefox` would
be:
```sh
task -- firefox
```

## hide-show
There are a lot of build setup and other files cluttering the root directory.
Use the task

```bash
task hide-etc
```
to hide all files except source code. This works for .vscode only.

Likewise use the following to show all the files:
```bash
task show-etc
```

## commit
I would appreciate it if you would hide everything before committing. `
task commit` will do this for you.
```sh
task commit
```

## clean-all
Remove all build artifacts.
```sh
task clean-all
```

## make-source/remove-source
Good helper functions for writing cpp code, does a lot of boilerplate for you.

## publish-local
Creates the AppImage, good for local testing or sending to friends

## distribute
Creates an AppImage in a Ubuntu 22.04 podman container. AppImages mostly 
forward-compatible, but are not back-wards compatible, so make them in this
container for compatibility.

# Code Map

Entry point is `./src/index.ts`, all typescript code goes in src.
All c++ code goes in `./c_interop/src`
