#!/usr/bin/env sh

# This script builds a distributable AppImage
# of the term.everything application using Podman.

PODMAN="podman "
APP_NAME="term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file"


get_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
    else
        echo "unknown"
        return
    fi

    # Check ID first, then fall back to ID_LIKE
    for id in $ID $ID_LIKE; do
        case $id in
            ubuntu|debian|linuxmint|pop)
                echo "sudo apt install -y"
                return
                ;;
            fedora)
                echo "sudo dnf install -y"
                return
                ;;
            centos|rhel|rocky|almalinux)
                echo "sudo yum install -y"
                return
                ;;
            arch|manjaro|cachyos|endeavouros|garuda)
                echo "sudo pacman -S"
                return
                ;;
            opensuse*|suse)
                echo "sudo zypper install"
                return
                ;;
            alpine)
                echo "sudo apk add"
                return
                ;;
            void)
                echo "sudo xbps-install -S"
                return
                ;;
            gentoo)
                echo "sudo emerge"
                return
                ;;
            nixos)
                echo "nix-env -iA nixpkgs."
                return
                ;;
        esac
    done

    echo "unknown"
}

if ! command -v podman >/dev/null 2>&1; then
    if command -v docker >/dev/null 2>&1; then
        PODMAN="docker "
    else
        INSTALL_CMD=$(get_distro)
        echo "Warning: podman is not installed or not in PATH."
        echo "To install on your system, try: $INSTALL_CMD podman"
        echo "Please install podman to proceed, it's literally all you need. Don't even need attention. Just podman. Just get podman. What are you waiting for? Stop reading this and install podman."
        exit 1
    fi

fi

if [ -z "${PLATFORM+x}" ]; then
    PLATFORM_ARG=""
else
    PLATFORM_ARG="--platform $PLATFORM -e PLATFORM=$PLATFORM -e MULTI_PLATFORM=1 -e ARCH_PREFIX=$ARCH_PREFIX"
fi

$PODMAN run \
    $PLATFORM_ARG \
    -it \
    --volume .:/home/mount \
    --rm alpine:latest /bin/sh /home/mount/resources/alpineCompile.sh && \
echo "Output is ./dist/$PLATFORM/static/$APP_NAME"
