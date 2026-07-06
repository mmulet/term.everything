
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

Change the `PLATFORM` environment variable to build for different platforms.
For example to build for linux aarch64:
```sh
PLATFORM=linux/aarch64 ./distribute.sh
```

# Development

Below are all the dependencies this app needs.

## Deps:

- Download the following dependecies from your system's package manager. On ubuntu use: `sudo apt install pkg-config libchafa-dev build-essential libglib2.0-dev`
- Optional: [vscode](https://code.visualstudio.com/) with these recommended extensions:
    - "ms-vscode.cpptools-extension-pack",
    - "golang.go",
    - "ms-vscode.makefile-tools"

### Version map
These are the versions of the tools used to build and run the project:
- chafa 1.16.0

# Running and building


## run

You can just run make
```sh
make
```
This will build the app.

Or
Generate the needed code with
```sh
go generate
```

and run with go run.

```sh
go run . firefox
```
e, good for local testing or sending to friends
## clean-all
Remove all build artifacts.
```sh
make clean
```


## Distribute
The distribute script creates an statically linked binary in a alpine linux podman container.
